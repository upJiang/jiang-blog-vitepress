from fastapi.testclient import TestClient

from app.main import app
from app.projects import ProjectInput, project_request_hash


def test_live_has_stable_shape() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health/live", headers={"x-request-id": "test-request"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-request-id"] == "test-request"


def test_project_request_hash_uses_normalized_input() -> None:
    compact = ProjectInput(name="Project", description="description")
    padded = ProjectInput(name="  Project  ", description="  description  ")
    changed = ProjectInput(name="Project", description="changed")

    assert project_request_hash(compact) == project_request_hash(padded)
    assert project_request_hash(compact) != project_request_hash(changed)
