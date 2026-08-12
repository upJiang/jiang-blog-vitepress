package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const demoTenantID = "00000000-0000-0000-0000-000000000001"
const demoUserID = "00000000-0000-0000-0000-000000000002"

type Project struct {
	ID          string     `gorm:"column:id;primaryKey;type:char(36)" json:"id"`
	TenantID    string     `gorm:"column:tenant_id;type:char(36);index" json:"tenantId"`
	OwnerID     string     `gorm:"column:owner_id;type:char(36)" json:"-"`
	Name        string     `gorm:"column:name;size:120" json:"name"`
	Description *string    `gorm:"column:description;type:text" json:"description"`
	Version     uint64     `gorm:"column:version" json:"version"`
	DeletedAt   *time.Time `gorm:"column:deleted_at" json:"-"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

type projectInput struct {
	Name        string  `json:"name" binding:"required,min=2,max=120"`
	Description *string `json:"description" binding:"omitempty,max=4000"`
	Version     uint64  `json:"version"`
}

func (s *Server) listProjects(c *gin.Context) {
	var projects []Project
	limit := 51
	if err := s.db.WithContext(c.Request.Context()).Where("tenant_id = ? AND deleted_at IS NULL", demoTenantID).Order("updated_at DESC, id DESC").Limit(limit).Find(&projects).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project query failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": projects, "nextCursor": nil})
}

func (s *Server) createProject(c *gin.Context) {
	if len(c.GetHeader("Idempotency-Key")) < 16 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Idempotency-Key is required")
		return
	}
	var input projectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Project input is invalid")
		return
	}
	now := time.Now().UTC()
	project := Project{ID: uuid.NewString(), TenantID: demoTenantID, OwnerID: demoUserID, Name: input.Name, Description: input.Description, Version: 1, CreatedAt: now, UpdatedAt: now}
	if err := s.db.WithContext(c.Request.Context()).Create(&project).Error; err != nil {
		writeProblem(c, http.StatusConflict, "duplicate_project", "Project already exists")
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (s *Server) updateProject(c *gin.Context) {
	var input projectInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Version < 1 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Project input is invalid")
		return
	}
	result := s.db.WithContext(c.Request.Context()).Model(&Project{}).Where("id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NULL", c.Param("id"), demoTenantID, input.Version).Updates(map[string]interface{}{"name": input.Name, "description": input.Description, "version": input.Version + 1, "updated_at": time.Now().UTC()})
	if result.Error != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project update failed")
		return
	}
	if result.RowsAffected != 1 {
		writeProblem(c, http.StatusConflict, "version_conflict", "Project changed or is not visible")
		return
	}
	var project Project
	if err := s.db.WithContext(c.Request.Context()).Where("id = ? AND tenant_id = ?", c.Param("id"), demoTenantID).First(&project).Error; err != nil {
		writeProblem(c, http.StatusNotFound, "not_found", "Project is not visible")
		return
	}
	c.JSON(http.StatusOK, project)
}
