package api

import (
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

type KnowledgeBase struct {
	ID            string    `gorm:"column:id;primaryKey" json:"id"`
	TenantID      string    `gorm:"column:tenant_id" json:"tenantId"`
	Name          string    `gorm:"column:name" json:"name"`
	ActiveVersion *uint64   `gorm:"column:active_version" json:"activeVersion"`
	Version       uint64    `gorm:"column:version" json:"version"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
}

func (KnowledgeBase) TableName() string { return "knowledge_bases" }

type Document struct {
	ID              string `gorm:"column:id;primaryKey"`
	TenantID        string `gorm:"column:tenant_id"`
	KnowledgeBaseID string `gorm:"column:knowledge_base_id"`
	FileID          string `gorm:"column:file_id"`
	TaskID          string `gorm:"column:task_id"`
	Status          string `gorm:"column:status"`
	Version         uint64 `gorm:"column:version"`
}

func (Document) TableName() string { return "documents" }

type ChatRun struct {
	ID              string `gorm:"column:id;primaryKey"`
	TenantID        string `gorm:"column:tenant_id"`
	KnowledgeBaseID string `gorm:"column:knowledge_base_id"`
	TaskID          string `gorm:"column:task_id"`
	Question        string `gorm:"column:question"`
	Status          string `gorm:"column:status"`
}

func (ChatRun) TableName() string { return "chat_runs" }

type documentRequest struct {
	FileID string `json:"fileId" binding:"required,uuid"`
}

type chatRunRequest struct {
	KnowledgeBaseID string `json:"knowledgeBaseId" binding:"required,uuid"`
	Question        string `json:"question" binding:"required,min=1,max=8000"`
}

func (s *Server) listKnowledgeBases(c *gin.Context) {
	actor := principalFrom(c)
	items := make([]KnowledgeBase, 0)
	if err := s.db.WithContext(c.Request.Context()).Where(
		"tenant_id = ?", actor.TenantID,
	).Order("id").Limit(100).Find(&items).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Knowledge base query failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "nextCursor": nil})
}

func (s *Server) createDocument(c *gin.Context) {
	actor := principalFrom(c)
	var input documentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Document input is invalid")
		return
	}
	var response gin.H
	err := s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		knowledgeBase, err := lockedKnowledgeBase(tx, actor.TenantID, c.Param("id"))
		if err != nil {
			return err
		}
		var file StoredFile
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"id = ? AND tenant_id = ? AND status NOT IN ?",
			input.FileID, actor.TenantID, []string{"deleted", "deleting", "rejected"},
		).First(&file).Error; err != nil {
			return errProductNotFound
		}
		task, err := createQueuedTask(tx, actor.TenantID, "document.parse", map[string]any{
			"knowledgeBaseId": knowledgeBase.ID, "fileId": file.ID,
		})
		if err != nil {
			return err
		}
		document := Document{
			ID: uuid.NewString(), TenantID: actor.TenantID, KnowledgeBaseID: knowledgeBase.ID,
			FileID: file.ID, TaskID: task.ID, Status: "queued", Version: 1,
		}
		if err := tx.Create(&document).Error; err != nil {
			return err
		}
		response = taskJSON(task)
		return createOutbox(tx, actor.TenantID, "document", document.ID, "document.parse.requested", response)
	})
	if err != nil {
		writeDomainTaskError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, response)
}

func (s *Server) createChatRun(c *gin.Context) {
	actor := principalFrom(c)
	var input chatRunRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Chat run input is invalid")
		return
	}
	var response gin.H
	err := s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		knowledgeBase, err := lockedKnowledgeBase(tx, actor.TenantID, input.KnowledgeBaseID)
		if err != nil {
			return err
		}
		question := strings.TrimSpace(input.Question)
		task, err := createQueuedTask(tx, actor.TenantID, "chat.run", map[string]any{
			"knowledgeBaseId": knowledgeBase.ID, "question": question,
		})
		if err != nil {
			return err
		}
		run := ChatRun{
			ID: uuid.NewString(), TenantID: actor.TenantID, KnowledgeBaseID: knowledgeBase.ID,
			TaskID: task.ID, Question: question, Status: "accepted",
		}
		if err := tx.Create(&run).Error; err != nil {
			return err
		}
		response = taskJSON(task)
		return createOutbox(tx, actor.TenantID, "chat_run", run.ID, "chat.run.requested", response)
	})
	if err != nil {
		writeDomainTaskError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, response)
}

func lockedKnowledgeBase(tx *gorm.DB, tenantID, id string) (KnowledgeBase, error) {
	var knowledgeBase KnowledgeBase
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
		"id = ? AND tenant_id = ?", id, tenantID,
	).First(&knowledgeBase).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return KnowledgeBase{}, errProductNotFound
		}
		return KnowledgeBase{}, err
	}
	return knowledgeBase, nil
}

func createQueuedTask(tx *gorm.DB, tenantID, taskType string, input map[string]any) (BackgroundTask, error) {
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return BackgroundTask{}, err
	}
	task := BackgroundTask{
		ID: uuid.NewString(), TenantID: tenantID, TaskType: taskType,
		Status: "queued", Progress: 0, Attempt: 0, InputJSON: inputJSON,
	}
	if err := tx.Create(&task).Error; err != nil {
		return BackgroundTask{}, err
	}
	eventData, _ := json.Marshal(map[string]any{"progress": 0})
	if err := tx.Create(&TaskEvent{
		TaskID: task.ID, Sequence: 1, EventType: "task.queued", DataJSON: eventData,
	}).Error; err != nil {
		return BackgroundTask{}, err
	}
	return task, nil
}

func writeDomainTaskError(c *gin.Context, err error) {
	if errors.Is(err, errProductNotFound) {
		writeProblem(c, http.StatusNotFound, "resource_not_found", "Resource is not visible")
		return
	}
	writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Task creation failed")
}
