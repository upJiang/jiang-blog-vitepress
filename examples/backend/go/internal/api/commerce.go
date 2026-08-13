package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	errInventoryInsufficient = errors.New("inventory is insufficient")
	errProductNotFound       = errors.New("product is not visible")
	errPaymentEventReused    = errors.New("payment event has another payload")
)

type Product struct {
	ID       string `gorm:"column:id;primaryKey" json:"id"`
	TenantID string `gorm:"column:tenant_id" json:"tenantId"`
	SKU      string `gorm:"column:sku" json:"sku"`
	Name     string `gorm:"column:name" json:"name"`
	Price    string `gorm:"column:price" json:"price"`
	Status   string `gorm:"column:status" json:"status"`
	Version  uint64 `gorm:"column:version" json:"version"`
}

func (Product) TableName() string { return "products" }

type Inventory struct {
	TenantID  string `gorm:"column:tenant_id;primaryKey"`
	ProductID string `gorm:"column:product_id;primaryKey"`
	Available uint   `gorm:"column:available"`
	Reserved  uint   `gorm:"column:reserved"`
	Version   uint64 `gorm:"column:version"`
}

func (Inventory) TableName() string { return "inventory" }

type Order struct {
	ID       string `gorm:"column:id;primaryKey"`
	TenantID string `gorm:"column:tenant_id"`
	UserID   string `gorm:"column:user_id"`
	Status   string `gorm:"column:status"`
	Amount   string `gorm:"column:amount"`
	Version  uint64 `gorm:"column:version"`
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	OrderID   string `gorm:"column:order_id;primaryKey"`
	ProductID string `gorm:"column:product_id;primaryKey"`
	Quantity  uint   `gorm:"column:quantity"`
	UnitPrice string `gorm:"column:unit_price"`
}

func (OrderItem) TableName() string { return "order_items" }

type OutboxEvent struct {
	ID            string         `gorm:"column:id;primaryKey"`
	TenantID      string         `gorm:"column:tenant_id"`
	AggregateType string         `gorm:"column:aggregate_type"`
	AggregateID   string         `gorm:"column:aggregate_id"`
	EventType     string         `gorm:"column:event_type"`
	PayloadJSON   datatypes.JSON `gorm:"column:payload_json"`
	Status        string         `gorm:"column:status"`
}

func (OutboxEvent) TableName() string { return "outbox_events" }

type PaymentCallback struct {
	Provider        string `gorm:"column:provider;primaryKey"`
	ProviderEventID string `gorm:"column:provider_event_id;primaryKey"`
	OrderID         string `gorm:"column:order_id"`
	PayloadHash     []byte `gorm:"column:payload_hash"`
	Status          string `gorm:"column:status"`
}

func (PaymentCallback) TableName() string { return "payment_callbacks" }

type orderRequest struct {
	Items []struct {
		ProductID string `json:"productId" binding:"required,uuid"`
		Quantity  uint   `json:"quantity" binding:"required,min=1,max=999"`
	} `json:"items" binding:"required,min=1,dive"`
}

type paymentRequest struct {
	Provider        string `json:"provider" binding:"required,max=80"`
	ProviderEventID string `json:"providerEventId" binding:"required,max=190"`
	OrderID         string `json:"orderId" binding:"required,uuid"`
	Status          string `json:"status" binding:"required,eq=paid"`
}

type lockedProduct struct {
	Product   Product
	Inventory Inventory
	Quantity  uint
}

func (s *Server) listProducts(c *gin.Context) {
	actor := principalFrom(c)
	items := make([]map[string]any, 0)
	if err := s.db.WithContext(c.Request.Context()).Raw(`
		SELECT p.id, p.tenant_id AS tenantId, p.sku, p.name, CAST(p.price AS CHAR) AS price,
		       p.status, CAST(p.version AS CHAR) AS version, i.available, i.reserved
		FROM products p LEFT JOIN inventory i
		  ON i.tenant_id = p.tenant_id AND i.product_id = p.id
		WHERE p.tenant_id = ? ORDER BY p.id LIMIT 100`, actor.TenantID).Scan(&items).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Product query failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "nextCursor": nil})
}

func (s *Server) createOrder(c *gin.Context) {
	actor := principalFrom(c)
	key := c.GetHeader("Idempotency-Key")
	if len(key) < 16 || len(key) > 128 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Idempotency-Key is required")
		return
	}
	var input orderRequest
	if err := c.ShouldBindJSON(&input); err != nil || len(input.Items) == 0 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Order input is invalid")
		return
	}
	quantities := make(map[string]uint)
	for _, item := range input.Items {
		quantities[item.ProductID] += item.Quantity
	}
	productIDs := make([]string, 0, len(quantities))
	for productID := range quantities {
		productIDs = append(productIDs, productID)
	}
	sort.Strings(productIDs)
	normalized := make([][2]any, 0, len(productIDs))
	for _, productID := range productIDs {
		normalized = append(normalized, [2]any{productID, quantities[productID]})
	}
	encoded, _ := json.Marshal(normalized)
	requestHash := sha256.Sum256(encoded)
	response := map[string]any{}

	err := s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var existing IdempotencyKey
		lookup := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"tenant_id = ? AND scope = 'orders.create' AND idem_key = ?", actor.TenantID, key,
		).First(&existing)
		if lookup.Error == nil {
			if !hmac.Equal(existing.RequestHash, requestHash[:]) {
				return errIdempotencyReused
			}
			if existing.Status != "completed" || len(existing.ResponseJSON) == 0 {
				return errIdempotencyInProgress
			}
			return json.Unmarshal(existing.ResponseJSON, &response)
		}
		if !errors.Is(lookup.Error, gorm.ErrRecordNotFound) {
			return lookup.Error
		}
		idempotency := IdempotencyKey{
			TenantID: actor.TenantID, Scope: "orders.create", Key: key,
			RequestHash: requestHash[:], Status: "processing",
			ExpiresAt: time.Now().UTC().Add(24 * time.Hour), CreatedAt: time.Now().UTC(),
		}
		if err := tx.Create(&idempotency).Error; err != nil {
			return err
		}

		locked := make([]lockedProduct, 0, len(productIDs))
		var totalCents int64
		for _, productID := range productIDs {
			var product Product
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
				"id = ? AND tenant_id = ? AND status = 'active'", productID, actor.TenantID,
			).First(&product).Error; err != nil {
				return errProductNotFound
			}
			var inventory Inventory
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
				"tenant_id = ? AND product_id = ?", actor.TenantID, productID,
			).First(&inventory).Error; err != nil {
				return errProductNotFound
			}
			quantity := quantities[productID]
			if inventory.Available < quantity {
				return errInventoryInsufficient
			}
			priceCents, err := moneyCents(product.Price)
			if err != nil {
				return err
			}
			totalCents += priceCents * int64(quantity)
			locked = append(locked, lockedProduct{Product: product, Inventory: inventory, Quantity: quantity})
		}

		order := Order{
			ID: uuid.NewString(), TenantID: actor.TenantID, UserID: actor.UserID,
			Status: "pending", Amount: moneyString(totalCents), Version: 1,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for _, item := range locked {
			if err := tx.Create(&OrderItem{
				OrderID: order.ID, ProductID: item.Product.ID,
				Quantity: item.Quantity, UnitPrice: item.Product.Price,
			}).Error; err != nil {
				return err
			}
			if err := tx.Model(&Inventory{}).Where(
				"tenant_id = ? AND product_id = ?", actor.TenantID, item.Product.ID,
			).Updates(map[string]any{
				"available": gorm.Expr("available - ?", item.Quantity),
				"reserved":  gorm.Expr("reserved + ?", item.Quantity),
				"version":   gorm.Expr("version + 1"),
			}).Error; err != nil {
				return err
			}
		}
		response = map[string]any{"id": order.ID, "status": order.Status, "amount": order.Amount, "version": 1}
		if err := createOutbox(tx, actor.TenantID, "order", order.ID, "order.created", response); err != nil {
			return err
		}
		responseJSON, _ := json.Marshal(response)
		return tx.Model(&IdempotencyKey{}).Where(
			"tenant_id = ? AND scope = 'orders.create' AND idem_key = ?", actor.TenantID, key,
		).Updates(map[string]any{
			"status": "completed", "response_status": http.StatusCreated, "response_json": responseJSON,
		}).Error
	})
	if err != nil {
		switch {
		case errors.Is(err, errIdempotencyReused):
			writeProblem(c, http.StatusConflict, "idempotency_key_reused", err.Error())
		case errors.Is(err, errIdempotencyInProgress):
			writeProblem(c, http.StatusConflict, "idempotency_request_in_progress", err.Error())
		case errors.Is(err, errInventoryInsufficient):
			writeProblem(c, http.StatusConflict, "inventory_insufficient", err.Error())
		case errors.Is(err, errProductNotFound):
			writeProblem(c, http.StatusNotFound, "product_not_found", err.Error())
		default:
			writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Order creation failed")
		}
		return
	}
	c.JSON(http.StatusCreated, response)
}

func (s *Server) paymentCallback(c *gin.Context) {
	var input paymentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Payment callback is invalid")
		return
	}
	signed := strings.Join([]string{input.Provider, input.ProviderEventID, input.OrderID, input.Status}, ":")
	mac := hmac.New(sha256.New, []byte(envOr("PAYMENT_CALLBACK_SECRET", "local-payment-secret")))
	_, _ = mac.Write([]byte(signed))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(c.GetHeader("X-Signature")), []byte(expected)) {
		writeProblem(c, http.StatusUnauthorized, "payment_signature_invalid", "Payment signature is invalid")
		return
	}
	payload, _ := json.Marshal(input)
	payloadHash := sha256.Sum256(payload)
	err := s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var callback PaymentCallback
		lookup := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"provider = ? AND provider_event_id = ?", input.Provider, input.ProviderEventID,
		).First(&callback)
		if lookup.Error == nil {
			if !hmac.Equal(callback.PayloadHash, payloadHash[:]) {
				return errPaymentEventReused
			}
			return nil
		}
		if !errors.Is(lookup.Error, gorm.ErrRecordNotFound) {
			return lookup.Error
		}
		var order Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", input.OrderID).First(&order).Error; err != nil {
			return errProductNotFound
		}
		callback = PaymentCallback{
			Provider: input.Provider, ProviderEventID: input.ProviderEventID,
			OrderID: input.OrderID, PayloadHash: payloadHash[:], Status: "received",
		}
		if err := tx.Create(&callback).Error; err != nil {
			return err
		}
		if order.Status == "pending" {
			if err := tx.Model(&Order{}).Where("id = ?", order.ID).Updates(map[string]any{
				"status": "paid", "version": gorm.Expr("version + 1"),
			}).Error; err != nil {
				return err
			}
			if err := tx.Exec(`UPDATE inventory i JOIN order_items oi ON oi.product_id = i.product_id
				SET i.reserved = i.reserved - oi.quantity, i.version = i.version + 1
				WHERE oi.order_id = ? AND i.tenant_id = ?`, order.ID, order.TenantID).Error; err != nil {
				return err
			}
			if err := createOutbox(tx, order.TenantID, "order", order.ID, "order.paid", map[string]any{"orderId": order.ID}); err != nil {
				return err
			}
		}
		return tx.Model(&PaymentCallback{}).Where(
			"provider = ? AND provider_event_id = ?", input.Provider, input.ProviderEventID,
		).Update("status", "applied").Error
	})
	if err != nil {
		switch {
		case errors.Is(err, errPaymentEventReused):
			writeProblem(c, http.StatusConflict, "payment_event_reused", err.Error())
		case errors.Is(err, errProductNotFound):
			writeProblem(c, http.StatusNotFound, "order_not_found", "Order does not exist")
		default:
			writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Payment callback failed")
		}
		return
	}
	c.Status(http.StatusNoContent)
}

func moneyCents(value string) (int64, error) {
	parts := strings.SplitN(value, ".", 2)
	whole, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, err
	}
	fraction := "00"
	if len(parts) == 2 {
		fraction = (parts[1] + "00")[:2]
	}
	cents, err := strconv.ParseInt(fraction, 10, 64)
	if err != nil {
		return 0, err
	}
	return whole*100 + cents, nil
}

func moneyString(cents int64) string {
	return fmt.Sprintf("%d.%02d", cents/100, cents%100)
}

func createOutbox(tx *gorm.DB, tenantID, aggregateType, aggregateID, eventType string, payload any) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return tx.Create(&OutboxEvent{
		ID: uuid.NewString(), TenantID: tenantID, AggregateType: aggregateType,
		AggregateID: aggregateID, EventType: eventType, PayloadJSON: encoded, Status: "pending",
	}).Error
}
