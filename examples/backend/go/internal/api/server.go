package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Server struct {
	db *gorm.DB
}

func New(db *gorm.DB) *gin.Engine {
	server := &Server{db: db}
	router := gin.New()
	router.Use(gin.Recovery(), requestIDs())
	router.GET("/api/health/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/api/health/ready", func(c *gin.Context) {
		if err := db.WithContext(c.Request.Context()).Exec("SELECT 1").Error; err != nil {
			writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Database is unavailable")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.POST("/api/auth/login", server.login)
	router.POST("/api/auth/refresh", server.refresh)

	authenticated := router.Group("/api", authMiddleware())
	authenticated.GET("/me", func(c *gin.Context) {
		principal := principalFrom(c)
		c.JSON(http.StatusOK, gin.H{
			"userId": principal.UserID, "tenantId": principal.TenantID, "permissions": principal.Permissions,
		})
	})
	authenticated.POST("/auth/logout", server.logout)
	projects := authenticated.Group("/projects")
	projects.GET("", server.listProjects)
	projects.GET("/:id", server.getProject)
	projects.POST("", server.createProject)
	projects.PATCH("/:id", server.updateProject)
	projects.DELETE("/:id", server.deleteProject)
	authenticated.POST("/files/presign", server.presignFile)
	authenticated.GET("/files/:id/download", server.downloadFile)
	tasks := authenticated.Group("/tasks")
	tasks.GET("/:id", server.getTask)
	tasks.GET("/:id/events", server.streamTaskEvents)
	authenticated.GET("/tenants", server.listTenants)
	authenticated.GET("/departments", server.listDepartments)
	authenticated.GET("/users", server.listUsers)
	authenticated.GET("/roles", server.listRoles)
	authenticated.GET("/permissions", server.listPermissions)
	authenticated.GET("/audit-logs", server.listAuditLogs)
	authenticated.GET("/products", server.listProducts)
	authenticated.POST("/orders", server.createOrder)
	router.POST("/api/payments/callback", server.paymentCallback)
	authenticated.GET("/knowledge-bases", server.listKnowledgeBases)
	authenticated.POST("/knowledge-bases/:id/documents", server.createDocument)
	authenticated.POST("/chat-runs", server.createChatRun)
	return router
}

func requestIDs() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-Id")
		if id == "" {
			id = uuid.NewString()
		}
		c.Set("requestId", id)
		c.Header("X-Request-Id", id)
		c.Next()
	}
}

func requestID(c *gin.Context) string {
	value, _ := c.Get("requestId")
	id, _ := value.(string)
	return id
}

func gormExpr(value string) any { return gorm.Expr(value) }
