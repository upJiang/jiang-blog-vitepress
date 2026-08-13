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

func TestProjectRequestHashUsesNormalizedInput(t *testing.T) {
	firstDescription := " description "
	secondDescription := "description"
	firstName := " Project "
	secondName := "Project"
	first, err := projectRequestHash(normalizeProjectInput(projectInput{Name: &firstName, Description: &firstDescription}))
	if err != nil {
		t.Fatal(err)
	}
	second, err := projectRequestHash(normalizeProjectInput(projectInput{Name: &secondName, Description: &secondDescription}))
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatal("normalized inputs must produce the same request hash")
	}
}
