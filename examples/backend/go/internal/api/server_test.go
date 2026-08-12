package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"gorm.io/gorm"
)

func TestLive(t *testing.T) {
	router := New(&gorm.DB{})
	request := httptest.NewRequest(http.MethodGet, "/api/health/live", nil)
	request.Header.Set("X-Request-Id", "test-request")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if recorder.Header().Get("X-Request-Id") != "test-request" {
		t.Fatal("request ID was not propagated")
	}
}
