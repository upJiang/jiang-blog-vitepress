package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const projectCreateScope = "projects.create"

var (
	errIdempotencyReused     = errors.New("idempotency key has another payload")
	errIdempotencyInProgress = errors.New("original request is still running")
)

type Project struct {
	ID          string     `gorm:"column:id;primaryKey;type:char(36)" json:"id"`
	TenantID    string     `gorm:"column:tenant_id;type:char(36);index" json:"tenantId"`
	OwnerID     string     `gorm:"column:owner_id;type:char(36)" json:"-"`
	Name        string     `gorm:"column:name;size:120" json:"name"`
	Description *string    `gorm:"column:description;type:text" json:"description"`
	Status      string     `gorm:"column:status" json:"status"`
	Version     uint64     `gorm:"column:version" json:"version"`
	DeletedAt   *time.Time `gorm:"column:deleted_at" json:"-"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

func (Project) TableName() string { return "projects" }

type projectInput struct {
	Name        *string `json:"name" binding:"omitempty,min=2,max=120"`
	Description *string `json:"description" binding:"omitempty,max=4000"`
	Version     uint64  `json:"version"`
}

type IdempotencyKey struct {
	TenantID       string          `gorm:"column:tenant_id;primaryKey"`
	Scope          string          `gorm:"column:scope;primaryKey"`
	Key            string          `gorm:"column:idem_key;primaryKey"`
	RequestHash    []byte          `gorm:"column:request_hash;type:binary(32)"`
	Status         string          `gorm:"column:status"`
	ResponseStatus *uint16         `gorm:"column:response_status"`
	ResponseJSON   json.RawMessage `gorm:"column:response_json;type:json"`
	ExpiresAt      time.Time       `gorm:"column:expires_at"`
	CreatedAt      time.Time       `gorm:"column:created_at"`
}

func (IdempotencyKey) TableName() string { return "idempotency_keys" }

type normalizedProjectInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

func normalizeProjectInput(input projectInput) normalizedProjectInput {
	name := strings.TrimSpace(*input.Name)
	var description *string
	if input.Description != nil {
		trimmed := strings.TrimSpace(*input.Description)
		if trimmed != "" {
			description = &trimmed
		}
	}
	return normalizedProjectInput{Name: name, Description: description}
}

func projectRequestHash(input normalizedProjectInput) ([32]byte, error) {
	encoded, err := json.Marshal(input)
	if err != nil {
		return [32]byte{}, err
	}
	return sha256.Sum256(encoded), nil
}

func idempotentProject(record IdempotencyKey, requestHash [32]byte) (*Project, error) {
	if !bytes.Equal(record.RequestHash, requestHash[:]) {
		return nil, errIdempotencyReused
	}
	if record.Status != "completed" || len(record.ResponseJSON) == 0 {
		return nil, errIdempotencyInProgress
	}
	var project Project
	if err := json.Unmarshal(record.ResponseJSON, &project); err != nil {
		return nil, err
	}
	return &project, nil
}

func (s *Server) listProjects(c *gin.Context) {
	actor := principalFrom(c)
	var projects []Project
	if err := s.db.WithContext(c.Request.Context()).
		Where("tenant_id = ? AND deleted_at IS NULL", actor.TenantID).
		Order("updated_at DESC, id DESC").Limit(50).Find(&projects).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project query failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": projects, "nextCursor": nil})
}

func (s *Server) getProject(c *gin.Context) {
	actor := principalFrom(c)
	var project Project
	if err := s.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND deleted_at IS NULL", c.Param("id"), actor.TenantID).
		First(&project).Error; err != nil {
		writeProblem(c, http.StatusNotFound, "resource_not_found", "Project is not visible")
		return
	}
	c.JSON(http.StatusOK, project)
}

func (s *Server) createProject(c *gin.Context) {
	actor := principalFrom(c)
	key := c.GetHeader("Idempotency-Key")
	if len(key) < 16 || len(key) > 128 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Idempotency-Key is required")
		return
	}
	var input projectInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Name == nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Project input is invalid")
		return
	}
	normalized := normalizeProjectInput(input)
	requestHash, err := projectRequestHash(normalized)
	if err != nil {
		writeProblem(c, http.StatusInternalServerError, "internal_error", "Unable to hash request")
		return
	}
	now := time.Now().UTC()
	project := Project{
		ID: uuid.NewString(), TenantID: actor.TenantID, OwnerID: actor.UserID,
		Name: normalized.Name, Description: normalized.Description, Status: "draft", Version: 1,
		CreatedAt: now, UpdatedAt: now,
	}
	err = s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var existing IdempotencyKey
		lookup := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"tenant_id = ? AND scope = ? AND idem_key = ?", actor.TenantID, projectCreateScope, key,
		).First(&existing)
		if lookup.Error == nil {
			matched, matchError := idempotentProject(existing, requestHash)
			if matchError != nil {
				return matchError
			}
			project = *matched
			return nil
		}
		if !errors.Is(lookup.Error, gorm.ErrRecordNotFound) {
			return lookup.Error
		}

		idempotency := IdempotencyKey{
			TenantID: actor.TenantID, Scope: projectCreateScope, Key: key,
			RequestHash: requestHash[:], Status: "processing", ExpiresAt: now.Add(24 * time.Hour), CreatedAt: now,
		}
		if createError := tx.Create(&idempotency).Error; createError != nil {
			return createError
		}
		if createError := tx.Create(&project).Error; createError != nil {
			return createError
		}
		responseJSON, marshalError := json.Marshal(project)
		if marshalError != nil {
			return marshalError
		}
		status := uint16(http.StatusCreated)
		return tx.Model(&IdempotencyKey{}).Where(
			"tenant_id = ? AND scope = ? AND idem_key = ?", actor.TenantID, projectCreateScope, key,
		).Updates(map[string]any{
			"status": "completed", "response_status": status, "response_json": responseJSON,
		}).Error
	})
	if err != nil {
		if errors.Is(err, errIdempotencyReused) {
			writeProblem(c, http.StatusConflict, "idempotency_key_reused", err.Error())
			return
		}
		if errors.Is(err, errIdempotencyInProgress) {
			writeProblem(c, http.StatusConflict, "idempotency_request_in_progress", err.Error())
			return
		}
		var existing IdempotencyKey
		lookup := s.db.WithContext(c.Request.Context()).Where(
			"tenant_id = ? AND scope = ? AND idem_key = ?", actor.TenantID, projectCreateScope, key,
		).First(&existing)
		if lookup.Error == nil {
			matched, matchError := idempotentProject(existing, requestHash)
			switch {
			case matchError == nil:
				c.JSON(http.StatusCreated, matched)
			case errors.Is(matchError, errIdempotencyReused):
				writeProblem(c, http.StatusConflict, "idempotency_key_reused", matchError.Error())
			default:
				writeProblem(c, http.StatusConflict, "idempotency_request_in_progress", matchError.Error())
			}
			return
		}
		if !errors.Is(lookup.Error, gorm.ErrRecordNotFound) {
			writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project creation failed")
			return
		}
		writeProblem(c, http.StatusConflict, "project_name_exists", "Project already exists")
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (s *Server) updateProject(c *gin.Context) {
	actor := principalFrom(c)
	var input projectInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Version < 1 {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Project input is invalid")
		return
	}
	changes := map[string]any{"version": input.Version + 1, "updated_at": time.Now().UTC()}
	if input.Name != nil {
		changes["name"] = *input.Name
	}
	if input.Description != nil {
		changes["description"] = *input.Description
	}
	result := s.db.WithContext(c.Request.Context()).Model(&Project{}).
		Where("id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NULL", c.Param("id"), actor.TenantID, input.Version).
		Updates(changes)
	if result.Error != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project update failed")
		return
	}
	if result.RowsAffected != 1 {
		var count int64
		s.db.WithContext(c.Request.Context()).Model(&Project{}).
			Where("id = ? AND tenant_id = ? AND deleted_at IS NULL", c.Param("id"), actor.TenantID).Count(&count)
		if count == 0 {
			writeProblem(c, http.StatusNotFound, "resource_not_found", "Project is not visible")
		} else {
			writeProblem(c, http.StatusConflict, "version_conflict", "Project version changed")
		}
		return
	}
	s.getProject(c)
}

func (s *Server) deleteProject(c *gin.Context) {
	actor := principalFrom(c)
	result := s.db.WithContext(c.Request.Context()).Model(&Project{}).
		Where("id = ? AND tenant_id = ? AND deleted_at IS NULL", c.Param("id"), actor.TenantID).
		Updates(map[string]any{"deleted_at": time.Now().UTC(), "version": gormExpr("version + 1")})
	if result.Error != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Project delete failed")
		return
	}
	if result.RowsAffected != 1 {
		writeProblem(c, http.StatusNotFound, "resource_not_found", "Project is not visible")
		return
	}
	c.Status(http.StatusNoContent)
}
