package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type BackgroundTask struct {
	ID         string         `gorm:"column:id;primaryKey"`
	TenantID   string         `gorm:"column:tenant_id"`
	TaskType   string         `gorm:"column:task_type"`
	Status     string         `gorm:"column:status"`
	Progress   uint8          `gorm:"column:progress"`
	Attempt    uint           `gorm:"column:attempt"`
	InputJSON  datatypes.JSON `gorm:"column:input_json"`
	ResultJSON datatypes.JSON `gorm:"column:result_json"`
}

func (BackgroundTask) TableName() string { return "tasks" }

type TaskEvent struct {
	TaskID    string         `gorm:"column:task_id;primaryKey"`
	Sequence  uint64         `gorm:"column:sequence;primaryKey"`
	EventType string         `gorm:"column:event_type"`
	DataJSON  datatypes.JSON `gorm:"column:data_json"`
}

func (TaskEvent) TableName() string { return "task_events" }

func taskJSON(task BackgroundTask) gin.H {
	var result any
	if len(task.ResultJSON) > 0 {
		_ = json.Unmarshal(task.ResultJSON, &result)
	}
	return gin.H{
		"id": task.ID, "type": task.TaskType, "status": task.Status,
		"progress": task.Progress, "attempt": task.Attempt, "result": result,
	}
}

func (s *Server) scopedTask(c *gin.Context) (BackgroundTask, bool) {
	actor := principalFrom(c)
	var task BackgroundTask
	if err := s.db.WithContext(c.Request.Context()).Where(
		"id = ? AND tenant_id = ?", c.Param("id"), actor.TenantID,
	).First(&task).Error; err != nil {
		writeProblem(c, http.StatusNotFound, "task_not_found", "Task is not visible")
		return BackgroundTask{}, false
	}
	return task, true
}

func (s *Server) getTask(c *gin.Context) {
	task, ok := s.scopedTask(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, taskJSON(task))
}

func (s *Server) streamTaskEvents(c *gin.Context) {
	task, ok := s.scopedTask(c)
	if !ok {
		return
	}
	after, _ := strconv.ParseUint(c.GetHeader("Last-Event-ID"), 10, 64)
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache, no-transform")
	c.Header("X-Accel-Buffering", "no")
	c.Stream(func(writer io.Writer) bool {
		var events []TaskEvent
		if err := s.db.WithContext(c.Request.Context()).Where(
			"task_id = ? AND sequence > ?", task.ID, after,
		).Order("sequence ASC").Find(&events).Error; err != nil {
			return false
		}
		for _, event := range events {
			_, _ = fmt.Fprintf(writer, "id: %d\nevent: %s\ndata: %s\n\n", event.Sequence, event.EventType, event.DataJSON)
		}
		encoded, _ := json.Marshal(taskJSON(task))
		_, _ = fmt.Fprintf(writer, "event: snapshot\ndata: %s\n\n", encoded)
		return false
	})
}
