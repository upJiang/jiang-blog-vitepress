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
	router.GET("/api/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	projects := router.Group("/api/projects")
	projects.GET("", server.listProjects)
	projects.POST("", server.createProject)
	projects.PATCH("/:id", server.updateProject)
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
