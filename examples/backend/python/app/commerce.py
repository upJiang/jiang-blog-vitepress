import hmac
import json
from decimal import Decimal
from hashlib import sha256
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, current_principal
from .config import settings
from .database import database_session
from .problems import ApiProblem

router = APIRouter(tags=["commerce"])


class OrderItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: UUID = Field(validation_alias="productId", serialization_alias="productId")
    quantity: int = Field(ge=1, le=999)


class OrderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[OrderItem] = Field(min_length=1)


class PaymentCallback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: str = Field(max_length=80)
    provider_event_id: str = Field(
        validation_alias="providerEventId", serialization_alias="providerEventId", max_length=190
    )
    order_id: UUID = Field(validation_alias="orderId", serialization_alias="orderId")
    status: Literal["paid"]


@router.get("/products")
async def products(
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    result = await session.execute(
        text("""
            SELECT p.id, p.tenant_id AS tenantId, p.sku, p.name, CAST(p.price AS CHAR) AS price,
                   p.status, CAST(p.version AS CHAR) AS version, i.available, i.reserved
            FROM products p
            LEFT JOIN inventory i ON i.tenant_id = p.tenant_id AND i.product_id = p.id
            WHERE p.tenant_id = :tenant_id ORDER BY p.id LIMIT 100
        """),
        {"tenant_id": actor.tenant_id},
    )
    return {"items": [dict(row) for row in result.mappings()], "nextCursor": None}


@router.post("/orders", status_code=201)
async def create_order(
    body: OrderInput,
    idempotency_key: Annotated[str, Header(min_length=16, max_length=128)],
    actor: Principal = Depends(current_principal),
    session: AsyncSession = Depends(database_session),
) -> dict[str, object]:
    quantities: dict[str, int] = {}
    for item in body.items:
        product_id = str(item.product_id)
        quantities[product_id] = quantities.get(product_id, 0) + item.quantity
    normalized = sorted(quantities.items())
    request_hash = sha256(json.dumps(normalized, separators=(",", ":")).encode()).digest()

    async with session.begin():
        existing = (
            (
                await session.execute(
                    text("""
                    SELECT request_hash, status, response_json FROM idempotency_keys
                    WHERE tenant_id = :tenant_id AND scope = 'orders.create'
                      AND idem_key = :idem_key FOR UPDATE
                """),
                    {"tenant_id": actor.tenant_id, "idem_key": idempotency_key},
                )
            )
            .mappings()
            .first()
        )
        if existing:
            if existing["request_hash"] != request_hash:
                raise ApiProblem(
                    409, "idempotency_key_reused", "Idempotency key has another payload"
                )
            if existing["status"] == "completed" and existing["response_json"]:
                stored = existing["response_json"]
                return json.loads(stored) if isinstance(stored, str) else dict(stored)
            raise ApiProblem(409, "idempotency_request_in_progress", "Original request is running")

        await session.execute(
            text("""
                INSERT INTO idempotency_keys
                  (tenant_id, scope, idem_key, request_hash, status, expires_at)
                VALUES
                  (:tenant_id, 'orders.create', :idem_key, :request_hash, 'processing',
                   DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 24 HOUR))
            """),
            {
                "tenant_id": actor.tenant_id,
                "idem_key": idempotency_key,
                "request_hash": request_hash,
            },
        )
        locked: list[tuple[dict[str, object], int]] = []
        for product_id, quantity in normalized:
            product_row = (
                (
                    await session.execute(
                        text("""
                        SELECT p.id, p.price, i.available
                        FROM products p
                        JOIN inventory i ON i.tenant_id = p.tenant_id AND i.product_id = p.id
                        WHERE p.id = :product_id AND p.tenant_id = :tenant_id
                          AND p.status = 'active' FOR UPDATE
                    """),
                        {"product_id": product_id, "tenant_id": actor.tenant_id},
                    )
                )
                .mappings()
                .first()
            )
            if not product_row:
                raise ApiProblem(404, "product_not_found", "Product is not visible")
            if int(product_row["available"]) < quantity:
                raise ApiProblem(409, "inventory_insufficient", "Inventory is insufficient")
            locked.append((dict(product_row), quantity))

        amount = sum(
            (Decimal(str(product["price"])) * quantity for product, quantity in locked),
            Decimal(0),
        )
        order_id = str(uuid4())
        await session.execute(
            text("""
                INSERT INTO orders (id, tenant_id, user_id, status, amount)
                VALUES (:id, :tenant_id, :user_id, 'pending', :amount)
            """),
            {
                "id": order_id,
                "tenant_id": actor.tenant_id,
                "user_id": actor.user_id,
                "amount": str(amount),
            },
        )
        for locked_product, quantity in locked:
            await session.execute(
                text("""
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                    VALUES (:order_id, :product_id, :quantity, :price)
                """),
                {
                    "order_id": order_id,
                    "product_id": locked_product["id"],
                    "quantity": quantity,
                    "price": str(locked_product["price"]),
                },
            )
            await session.execute(
                text("""
                    UPDATE inventory
                    SET available = available - :quantity, reserved = reserved + :quantity,
                        version = version + 1
                    WHERE tenant_id = :tenant_id AND product_id = :product_id
                """),
                {
                    "quantity": quantity,
                    "tenant_id": actor.tenant_id,
                    "product_id": locked_product["id"],
                },
            )
        response = {"id": order_id, "status": "pending", "amount": f"{amount:.2f}", "version": 1}
        await _outbox(session, actor.tenant_id, "order", order_id, "order.created", response)
        await session.execute(
            text("""
                UPDATE idempotency_keys
                SET status = 'completed', response_status = 201, response_json = :response
                WHERE tenant_id = :tenant_id AND scope = 'orders.create' AND idem_key = :idem_key
            """),
            {
                "response": json.dumps(response),
                "tenant_id": actor.tenant_id,
                "idem_key": idempotency_key,
            },
        )
        return response


@router.post("/payments/callback", status_code=204)
async def payment_callback(
    body: PaymentCallback,
    x_signature: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(database_session),
) -> Response:
    signed = f"{body.provider}:{body.provider_event_id}:{body.order_id}:{body.status}"
    secret = getattr(settings(), "payment_callback_secret", "local-payment-secret")
    expected = hmac.new(secret.encode(), signed.encode(), sha256).hexdigest()
    if not x_signature or not hmac.compare_digest(x_signature, expected):
        raise ApiProblem(401, "payment_signature_invalid", "Payment signature is invalid")
    payload_hash = sha256(body.model_dump_json(by_alias=True).encode()).digest()
    async with session.begin():
        callback = (
            (
                await session.execute(
                    text("""
                    SELECT payload_hash FROM payment_callbacks
                    WHERE provider = :provider AND provider_event_id = :event_id FOR UPDATE
                """),
                    {"provider": body.provider, "event_id": body.provider_event_id},
                )
            )
            .mappings()
            .first()
        )
        if callback:
            if callback["payload_hash"] != payload_hash:
                raise ApiProblem(409, "payment_event_reused", "Payment event has another payload")
            return Response(status_code=204)
        order = (
            (
                await session.execute(
                    text("SELECT id, tenant_id, status FROM orders WHERE id = :id FOR UPDATE"),
                    {"id": str(body.order_id)},
                )
            )
            .mappings()
            .first()
        )
        if not order:
            raise ApiProblem(404, "order_not_found", "Order does not exist")
        await session.execute(
            text("""
                INSERT INTO payment_callbacks
                  (provider, provider_event_id, order_id, payload_hash, status)
                VALUES (:provider, :event_id, :order_id, :payload_hash, 'received')
            """),
            {
                "provider": body.provider,
                "event_id": body.provider_event_id,
                "order_id": str(body.order_id),
                "payload_hash": payload_hash,
            },
        )
        if order["status"] == "pending":
            await session.execute(
                text("UPDATE orders SET status = 'paid', version = version + 1 WHERE id = :id"),
                {"id": str(body.order_id)},
            )
            await session.execute(
                text("""
                    UPDATE inventory i JOIN order_items oi ON oi.product_id = i.product_id
                    SET i.reserved = i.reserved - oi.quantity, i.version = i.version + 1
                    WHERE oi.order_id = :order_id AND i.tenant_id = :tenant_id
                """),
                {"order_id": str(body.order_id), "tenant_id": order["tenant_id"]},
            )
            await _outbox(
                session,
                str(order["tenant_id"]),
                "order",
                str(body.order_id),
                "order.paid",
                {"orderId": str(body.order_id)},
            )
        await session.execute(
            text("""
                UPDATE payment_callbacks SET status = 'applied'
                WHERE provider = :provider AND provider_event_id = :event_id
            """),
            {"provider": body.provider, "event_id": body.provider_event_id},
        )
    return Response(status_code=204)


async def _outbox(
    session: AsyncSession,
    tenant_id: str,
    aggregate_type: str,
    aggregate_id: str,
    event_type: str,
    payload: object,
) -> None:
    await session.execute(
        text("""
            INSERT INTO outbox_events
              (id, tenant_id, aggregate_type, aggregate_id, event_type, payload_json)
            VALUES (:id, :tenant_id, :aggregate_type, :aggregate_id, :event_type, :payload)
        """),
        {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "event_type": event_type,
            "payload": json.dumps(payload),
        },
    )
