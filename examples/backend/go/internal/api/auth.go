package api

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const refreshCookie = "refresh_session"

var defaultPermissions = []string{"project.read", "project.write", "file.write", "task.read"}

type Principal struct {
	UserID      string
	TenantID    string
	SessionID   string
	Permissions []string
}

type User struct {
	ID           string `gorm:"column:id;primaryKey"`
	TenantID     string `gorm:"column:tenant_id"`
	Email        string `gorm:"column:email"`
	PasswordHash string `gorm:"column:password_hash"`
	DisplayName  string `gorm:"column:display_name"`
	Status       string `gorm:"column:status"`
}

func (User) TableName() string { return "users" }

type AuthSession struct {
	ID               string     `gorm:"column:id;primaryKey"`
	TenantID         string     `gorm:"column:tenant_id"`
	UserID           string     `gorm:"column:user_id"`
	TokenFamilyID    string     `gorm:"column:token_family_id"`
	RefreshTokenHash []byte     `gorm:"column:refresh_token_hash"`
	ExpiresAt        time.Time  `gorm:"column:expires_at"`
	RotatedAt        *time.Time `gorm:"column:rotated_at"`
	RevokedAt        *time.Time `gorm:"column:revoked_at"`
	RevokeReason     *string    `gorm:"column:revoke_reason"`
	LastUsedAt       *time.Time `gorm:"column:last_used_at"`
}

func (AuthSession) TableName() string { return "auth_sessions" }

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func jwtSecret() []byte {
	return []byte(envOr("JWT_SECRET", "replace-with-at-least-32-characters"))
}

func randomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func hashToken(value string) []byte {
	digest := sha256.Sum256([]byte(value))
	return digest[:]
}

func passwordVerify(encoded, password string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false
	}
	var memory uint32
	var iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false
	}
	salt, saltError := base64.RawStdEncoding.DecodeString(parts[4])
	expected, hashError := base64.RawStdEncoding.DecodeString(parts[5])
	if saltError != nil || hashError != nil || len(expected) == 0 {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(expected)))
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func signAccess(principal Principal) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":         principal.UserID,
		"tenantId":    principal.TenantID,
		"sessionId":   principal.SessionID,
		"permissions": principal.Permissions,
		"iss":         "backend-learning-go",
		"aud":         "enterprise-admin-api",
		"iat":         now.Unix(),
		"exp":         now.Add(15 * time.Minute).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeProblem(c, http.StatusUnauthorized, "access_token_missing", "Access token is required")
			return
		}
		token, err := jwt.Parse(
			header[7:],
			func(token *jwt.Token) (any, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, errors.New("unexpected signing method")
				}
				return jwtSecret(), nil
			},
			jwt.WithAudience("enterprise-admin-api"),
			jwt.WithIssuer("backend-learning-go"),
		)
		if err != nil || !token.Valid {
			writeProblem(c, http.StatusUnauthorized, "access_token_invalid", "Access token is invalid")
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeProblem(c, http.StatusUnauthorized, "access_token_invalid", "Access token is invalid")
			return
		}
		userID, userOK := claims["sub"].(string)
		tenantID, tenantOK := claims["tenantId"].(string)
		sessionID, sessionOK := claims["sessionId"].(string)
		if !userOK || !tenantOK || !sessionOK || userID == "" || tenantID == "" || sessionID == "" {
			writeProblem(c, http.StatusUnauthorized, "access_token_invalid", "Access token is invalid")
			return
		}
		c.Set("principal", Principal{
			UserID: userID, TenantID: tenantID, SessionID: sessionID, Permissions: defaultPermissions,
		})
		c.Next()
	}
}

func principalFrom(c *gin.Context) Principal {
	value, _ := c.Get("principal")
	principal, _ := value.(Principal)
	return principal
}

func setRefreshCookie(c *gin.Context, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: refreshCookie, Value: token, Path: "/api/auth", HttpOnly: true,
		Secure: envOr("COOKIE_SECURE", "false") == "true", SameSite: http.SameSiteLaxMode,
		MaxAge: 30 * 24 * 60 * 60,
	})
}

func (s *Server) login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email,max=190"`
		Password string `json:"password" binding:"required,min=8,max=1024"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "Login input is invalid")
		return
	}
	var user User
	result := s.db.WithContext(c.Request.Context()).
		Where("email = ? AND status = ?", input.Email, "active").First(&user)
	if result.Error != nil || !passwordVerify(user.PasswordHash, input.Password) {
		writeProblem(c, http.StatusUnauthorized, "invalid_credentials", "Email or password is invalid")
		return
	}
	rawRefresh, err := randomToken()
	if err != nil {
		writeProblem(c, http.StatusInternalServerError, "internal_error", "Unable to create session")
		return
	}
	session := AuthSession{
		ID: uuid.NewString(), TenantID: user.TenantID, UserID: user.ID,
		TokenFamilyID: uuid.NewString(), RefreshTokenHash: hashToken(rawRefresh),
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour),
	}
	if err := s.db.WithContext(c.Request.Context()).Create(&session).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Unable to create session")
		return
	}
	access, err := signAccess(Principal{
		UserID: user.ID, TenantID: user.TenantID, SessionID: session.ID, Permissions: defaultPermissions,
	})
	if err != nil {
		writeProblem(c, http.StatusInternalServerError, "internal_error", "Unable to sign access token")
		return
	}
	setRefreshCookie(c, rawRefresh)
	c.JSON(http.StatusOK, gin.H{"accessToken": access, "expiresIn": 900})
}

func (s *Server) refresh(c *gin.Context) {
	presented, err := c.Cookie(refreshCookie)
	if err != nil {
		writeProblem(c, http.StatusUnauthorized, "refresh_token_missing", "Refresh token is required")
		return
	}
	var current AuthSession
	var nextRaw string
	var nextID string
	var reused bool
	err = s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("refresh_token_hash = ?", hashToken(presented)).First(&current)
		if result.Error != nil || current.RevokedAt != nil || current.ExpiresAt.Before(time.Now().UTC()) {
			return gorm.ErrRecordNotFound
		}
		if current.RotatedAt != nil {
			reused = true
			now := time.Now().UTC()
			return tx.Model(&AuthSession{}).
				Where("token_family_id = ? AND revoked_at IS NULL", current.TokenFamilyID).
				Updates(map[string]any{"revoked_at": now, "revoke_reason": "refresh_reuse"}).Error
		}
		now := time.Now().UTC()
		if err := tx.Model(&AuthSession{}).Where("id = ? AND rotated_at IS NULL", current.ID).
			Updates(map[string]any{"rotated_at": now, "last_used_at": now}).Error; err != nil {
			return err
		}
		nextRaw, err = randomToken()
		if err != nil {
			return err
		}
		nextID = uuid.NewString()
		return tx.Create(&AuthSession{
			ID: nextID, TenantID: current.TenantID, UserID: current.UserID,
			TokenFamilyID: current.TokenFamilyID, RefreshTokenHash: hashToken(nextRaw),
			ExpiresAt: current.ExpiresAt,
		}).Error
	})
	if err != nil {
		writeProblem(c, http.StatusUnauthorized, "session_invalid", "Refresh session is invalid")
		return
	}
	if reused {
		writeProblem(c, http.StatusUnauthorized, "session_reused", "Refresh token reuse was detected")
		return
	}
	access, err := signAccess(Principal{
		UserID: current.UserID, TenantID: current.TenantID, SessionID: nextID, Permissions: defaultPermissions,
	})
	if err != nil {
		writeProblem(c, http.StatusInternalServerError, "internal_error", "Unable to sign access token")
		return
	}
	setRefreshCookie(c, nextRaw)
	c.JSON(http.StatusOK, gin.H{"accessToken": access, "expiresIn": 900})
}

func (s *Server) logout(c *gin.Context) {
	if presented, err := c.Cookie(refreshCookie); err == nil {
		var current AuthSession
		if s.db.WithContext(c.Request.Context()).Where("refresh_token_hash = ?", hashToken(presented)).First(&current).Error == nil {
			now := time.Now().UTC()
			_ = s.db.WithContext(c.Request.Context()).Model(&AuthSession{}).
				Where("token_family_id = ? AND revoked_at IS NULL", current.TokenFamilyID).
				Updates(map[string]any{"revoked_at": now, "revoke_reason": "logout"}).Error
		}
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: refreshCookie, Value: "", Path: "/api/auth", MaxAge: -1, HttpOnly: true})
	c.Status(http.StatusNoContent)
}
