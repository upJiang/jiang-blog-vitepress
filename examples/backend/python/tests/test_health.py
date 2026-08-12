from fastapi.testclient import TestClient

from app.main import app


def test_live_has_stable_shape() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health/live", headers={"x-request-id": "test-request"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-request-id"] == "test-request"
