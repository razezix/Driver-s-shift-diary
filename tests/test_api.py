from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app, store


def test_api_create_retry_and_daily_summary(tmp_path: Path) -> None:
    original_path = store.file_path
    store.file_path = tmp_path / "trips.json"
    client = TestClient(app)
    trip = {
        "id": "api-trip",
        "start": "2026-10-03T08:00:00+05:00",
        "end": "2026-10-03T08:20:00+05:00",
        "amount": 2000,
        "payment": "cash",
        "commission": 300,
    }
    try:
        created = client.post("/api/trips", json=trip)
        retry = client.post("/api/trips", json=trip)
        day = client.get("/api/day", params={"date": "2026-10-03"})
        assert created.status_code == 201
        assert created.json()["duplicate"] is False
        assert retry.status_code == 200
        assert retry.json()["duplicate"] is True
        assert len(day.json()["trips"]) == 1
        assert day.json()["summary"]["net"] == 1700
    finally:
        store.file_path = original_path


def test_api_returns_validation_details() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/trips",
        json={
            "id": "bad",
            "start": "2026-10-03T09:00:00+05:00",
            "end": "2026-10-03T08:00:00+05:00",
            "amount": -1,
            "payment": "cash",
            "commission": 0,
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]
