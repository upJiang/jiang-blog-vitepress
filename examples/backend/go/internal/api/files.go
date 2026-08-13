package api

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type StoredFile struct {
	ID          string    `gorm:"column:id;primaryKey"`
	TenantID    string    `gorm:"column:tenant_id"`
	OwnerID     string    `gorm:"column:owner_id"`
	Bucket      string    `gorm:"column:bucket"`
	ObjectKey   string    `gorm:"column:object_key"`
	Filename    string    `gorm:"column:filename"`
	ContentType string    `gorm:"column:content_type"`
	SizeBytes   uint64    `gorm:"column:size_bytes"`
	SHA256      string    `gorm:"column:sha256"`
	Status      string    `gorm:"column:status"`
	Version     uint64    `gorm:"column:version"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (StoredFile) TableName() string { return "files" }

type fileIntent struct {
	Filename    string `json:"filename" binding:"required,min=1,max=255"`
	ContentType string `json:"contentType" binding:"required,min=1,max=120"`
	Size        uint64 `json:"size" binding:"required,min=1,max=52428800"`
	SHA256      string `json:"sha256" binding:"required,len=64,hexadecimal"`
}

func (s *Server) presignFile(c *gin.Context) {
	actor := principalFrom(c)
	var input fileIntent
	if err := c.ShouldBindJSON(&input); err != nil {
		writeProblem(c, http.StatusUnprocessableEntity, "invalid_field", "File intent is invalid")
		return
	}
	client, err := minioClient()
	if err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "object_storage_unavailable", "MinIO configuration is invalid")
		return
	}
	fileID := uuid.NewString()
	bucket := envOr("MINIO_BUCKET", "backend-files")
	objectKey := "tenants/" + actor.TenantID + "/files/" + fileID + "/source"
	expires := 15 * time.Minute
	uploadURL, err := client.PresignedPutObject(context.Background(), bucket, objectKey, expires)
	if err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "object_storage_unavailable", "Unable to sign upload")
		return
	}
	if !publishMinioURL(c, uploadURL) {
		return
	}
	now := time.Now().UTC()
	record := StoredFile{
		ID: fileID, TenantID: actor.TenantID, OwnerID: actor.UserID, Bucket: bucket,
		ObjectKey: objectKey, Filename: strings.TrimSpace(input.Filename), ContentType: input.ContentType,
		SizeBytes: input.Size, SHA256: input.SHA256, Status: "pending", Version: 1,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := s.db.WithContext(c.Request.Context()).Create(&record).Error; err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "database_unavailable", "Unable to record upload")
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"fileId": fileID, "objectKey": objectKey, "uploadUrl": uploadURL.String(),
		"expiresAt": now.Add(expires).Format(time.RFC3339Nano),
	})
}

func (s *Server) downloadFile(c *gin.Context) {
	actor := principalFrom(c)
	var file StoredFile
	if err := s.db.WithContext(c.Request.Context()).Where(
		"id = ? AND tenant_id = ? AND status NOT IN ?",
		c.Param("id"), actor.TenantID, []string{"deleted", "deleting"},
	).First(&file).Error; err != nil {
		writeProblem(c, http.StatusNotFound, "file_not_found", "File is not visible")
		return
	}
	client, err := minioClient()
	if err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "object_storage_unavailable", "MinIO configuration is invalid")
		return
	}
	downloadURL, err := client.PresignedGetObject(
		c.Request.Context(), file.Bucket, file.ObjectKey, 5*time.Minute, nil,
	)
	if err != nil {
		writeProblem(c, http.StatusServiceUnavailable, "object_storage_unavailable", "Unable to sign download")
		return
	}
	if !publishMinioURL(c, downloadURL) {
		return
	}
	c.Redirect(http.StatusFound, downloadURL.String())
}

func publishMinioURL(c *gin.Context, signedURL *url.URL) bool {
	publicEndpoint := strings.TrimSpace(os.Getenv("MINIO_PUBLIC_ENDPOINT"))
	if publicEndpoint == "" {
		return true
	}
	published, err := url.Parse(publicEndpoint)
	if err != nil || published.Scheme == "" || published.Host == "" {
		writeProblem(c, http.StatusServiceUnavailable, "object_storage_unavailable", "MinIO public endpoint is invalid")
		return false
	}
	signedURL.Scheme = published.Scheme
	signedURL.Host = published.Host
	return true
}

func minioClient() (*minio.Client, error) {
	endpoint := envOr("MINIO_ENDPOINT", "http://127.0.0.1:9000")
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}
	secure, _ := strconv.ParseBool(envOr("MINIO_SECURE", strconv.FormatBool(parsed.Scheme == "https")))
	return minio.New(parsed.Host, &minio.Options{
		Creds: credentials.NewStaticV4(
			envOr("MINIO_ACCESS_KEY", "backend"),
			envOr("MINIO_SECRET_KEY", "backend-local-only"),
			"",
		),
		Secure: secure,
	})
}
