import { ConflictException, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { Principal } from '../auth/auth.types'
import { PrismaService } from '../prisma.service'
import type { CreateOrderDto, PaymentCallbackDto } from './commerce.dto'
import { jsonValue } from '../json-value'

type ProductRow = { id: string; name: string; sku: string; price: Prisma.Decimal; available: number; reserved: number }
type IdempotencyRow = { requestHash: Uint8Array; status: string; responseJson: unknown }
type OrderRow = { id: string; tenantId: string; status: string; amount: Prisma.Decimal; version: bigint }

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  async products(principal: Principal) {
    const items = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT p.id, p.tenant_id AS tenantId, p.sku, p.name, CAST(p.price AS CHAR) AS price,
             p.status, CAST(p.version AS CHAR) AS version, i.available, i.reserved
      FROM products p LEFT JOIN inventory i ON i.tenant_id = p.tenant_id AND i.product_id = p.id
      WHERE p.tenant_id = ${principal.tenantId} ORDER BY p.id LIMIT 100
    `)
    return { items: jsonValue(items), nextCursor: null }
  }

  async createOrder(principal: Principal, idempotencyKey: string, input: CreateOrderDto) {
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new UnprocessableEntityException('idempotency_key_invalid')
    }
    if (!input.items.length) throw new UnprocessableEntityException('order_items_empty')
    const quantities = new Map<string, number>()
    for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    const normalizedItems = [...quantities].sort(([left], [right]) => left.localeCompare(right))
    const requestHash = createHash('sha256').update(JSON.stringify(normalizedItems)).digest()

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<IdempotencyRow[]>(Prisma.sql`
        SELECT request_hash AS requestHash, status, response_json AS responseJson
        FROM idempotency_keys
        WHERE tenant_id = ${principal.tenantId} AND scope = 'orders.create' AND idem_key = ${idempotencyKey}
        FOR UPDATE
      `)
      if (existing[0]) {
        if (!Buffer.from(existing[0].requestHash).equals(requestHash)) throw new ConflictException('idempotency_key_reused')
        if (existing[0].status === 'completed' && existing[0].responseJson) return existing[0].responseJson
        throw new ConflictException('idempotency_request_in_progress')
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO idempotency_keys
          (tenant_id, scope, idem_key, request_hash, status, expires_at)
        VALUES
          (${principal.tenantId}, 'orders.create', ${idempotencyKey}, ${requestHash}, 'processing',
           DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 24 HOUR))
      `)

      const locked: Array<{ product: ProductRow; quantity: number }> = []
      for (const [productId, quantity] of normalizedItems) {
        const rows = await tx.$queryRaw<ProductRow[]>(Prisma.sql`
          SELECT p.id, p.name, p.sku, p.price, i.available, i.reserved
          FROM products p JOIN inventory i ON i.tenant_id = p.tenant_id AND i.product_id = p.id
          WHERE p.id = ${productId} AND p.tenant_id = ${principal.tenantId} AND p.status = 'active'
          FOR UPDATE
        `)
        if (!rows[0]) throw new NotFoundException('product_not_found')
        if (rows[0].available < quantity) throw new ConflictException('inventory_insufficient')
        locked.push({ product: rows[0], quantity })
      }

      const amount = locked.reduce((total, item) => total.plus(item.product.price.mul(item.quantity)), new Prisma.Decimal(0))
      const orderId = randomUUID()
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO orders (id, tenant_id, user_id, status, amount)
        VALUES (${orderId}, ${principal.tenantId}, ${principal.sub}, 'pending', ${amount.toFixed(2)})
      `)
      for (const item of locked) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price)
          VALUES (${orderId}, ${item.product.id}, ${item.quantity}, ${item.product.price.toFixed(2)})
        `)
        await tx.$executeRaw(Prisma.sql`
          UPDATE inventory SET available = available - ${item.quantity}, reserved = reserved + ${item.quantity},
                               version = version + 1
          WHERE tenant_id = ${principal.tenantId} AND product_id = ${item.product.id}
        `)
      }
      const response = { id: orderId, status: 'pending', amount: amount.toFixed(2), version: 1 }
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO outbox_events
          (id, tenant_id, aggregate_type, aggregate_id, event_type, payload_json)
        VALUES
          (${randomUUID()}, ${principal.tenantId}, 'order', ${orderId}, 'order.created', ${JSON.stringify(response)})
      `)
      await tx.$executeRaw(Prisma.sql`
        UPDATE idempotency_keys SET status = 'completed', response_status = 201,
                                    response_json = ${JSON.stringify(response)}
        WHERE tenant_id = ${principal.tenantId} AND scope = 'orders.create' AND idem_key = ${idempotencyKey}
      `)
      return response
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
  }

  async paymentCallback(signature: string | undefined, input: PaymentCallbackDto): Promise<void> {
    const signed = `${input.provider}:${input.providerEventId}:${input.orderId}:${input.status}`
    const expected = createHmac('sha256', process.env.PAYMENT_CALLBACK_SECRET ?? 'local-payment-secret').update(signed).digest('hex')
    const received = signature ?? ''
    if (received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
      throw new UnauthorizedException('payment_signature_invalid')
    }
    const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest()
    await this.prisma.$transaction(async (tx) => {
      const callbacks = await tx.$queryRaw<Array<{ payloadHash: Uint8Array }>>(Prisma.sql`
        SELECT payload_hash AS payloadHash FROM payment_callbacks
        WHERE provider = ${input.provider} AND provider_event_id = ${input.providerEventId}
        FOR UPDATE
      `)
      if (callbacks[0]) {
        if (!Buffer.from(callbacks[0].payloadHash).equals(payloadHash)) throw new ConflictException('payment_event_reused')
        return
      }
      const orders = await tx.$queryRaw<OrderRow[]>(Prisma.sql`
        SELECT id, tenant_id AS tenantId, status, amount, version FROM orders
        WHERE id = ${input.orderId} FOR UPDATE
      `)
      if (!orders[0]) throw new NotFoundException('order_not_found')
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO payment_callbacks (provider, provider_event_id, order_id, payload_hash, status)
        VALUES (${input.provider}, ${input.providerEventId}, ${input.orderId}, ${payloadHash}, 'received')
      `)
      if (orders[0].status === 'pending') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE orders SET status = 'paid', version = version + 1 WHERE id = ${input.orderId}
        `)
        await tx.$executeRaw(Prisma.sql`
          UPDATE inventory i JOIN order_items oi ON oi.product_id = i.product_id
          SET i.reserved = i.reserved - oi.quantity, i.version = i.version + 1
          WHERE oi.order_id = ${input.orderId} AND i.tenant_id = ${orders[0].tenantId}
        `)
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO outbox_events
            (id, tenant_id, aggregate_type, aggregate_id, event_type, payload_json)
          VALUES
            (${randomUUID()}, ${orders[0].tenantId}, 'order', ${input.orderId}, 'order.paid',
             ${JSON.stringify({ orderId: input.orderId })})
        `)
      }
      await tx.$executeRaw(Prisma.sql`
        UPDATE payment_callbacks SET status = 'applied'
        WHERE provider = ${input.provider} AND provider_event_id = ${input.providerEventId}
      `)
    })
  }
}
