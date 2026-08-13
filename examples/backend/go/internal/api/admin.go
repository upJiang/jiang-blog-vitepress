package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (s *Server) listCollection(c *gin.Context, query string) {
	actor := principalFrom(c)
	items := make([]map[string]any, 0)
	if err := s.db.WithContext(c.Request.Context()).Raw(query, actor.TenantID).Scan(&items).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Collection query failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "nextCursor": nil})
}

func (s *Server) listTenants(c *gin.Context) {
	s.listCollection(c, `SELECT id, name, status, CAST(version AS CHAR) AS version,
		created_at AS createdAt, updated_at AS updatedAt
		FROM tenants WHERE id = ? ORDER BY id LIMIT 100`)
}

func (s *Server) listDepartments(c *gin.Context) {
	s.listCollection(c, `SELECT id, tenant_id AS tenantId, parent_id AS parentId, name,
		CAST(version AS CHAR) AS version, created_at AS createdAt, updated_at AS updatedAt
		FROM departments WHERE tenant_id = ? ORDER BY id LIMIT 100`)
}

func (s *Server) listUsers(c *gin.Context) {
	s.listCollection(c, `SELECT id, tenant_id AS tenantId, department_id AS departmentId,
		email, display_name AS displayName, status, CAST(version AS CHAR) AS version,
		created_at AS createdAt, updated_at AS updatedAt
		FROM users WHERE tenant_id = ? ORDER BY id LIMIT 100`)
}

func (s *Server) listRoles(c *gin.Context) {
	s.listCollection(c, `SELECT id, tenant_id AS tenantId, code, name, created_at AS createdAt
		FROM roles WHERE tenant_id = ? ORDER BY id LIMIT 100`)
}

func (s *Server) listPermissions(c *gin.Context) {
	s.listCollection(c, `SELECT DISTINCT p.id, p.code, p.description
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		JOIN roles r ON r.id = rp.role_id
		WHERE r.tenant_id = ? ORDER BY p.code LIMIT 100`)
}

func (s *Server) listAuditLogs(c *gin.Context) {
	s.listCollection(c, `SELECT id, tenant_id AS tenantId, actor_id AS actorId, action,
		resource_type AS resourceType, resource_id AS resourceId, request_id AS requestId,
		result, changes_json AS changes, created_at AS createdAt
		FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`)
}
