from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.models import Trip
from app.store import TripStore


TRIP = Trip.model_validate(
    {
        "id": "same-trip",
        "start": "2026-10-01T08:10:00+05:00",
        "end": "2026-10-01T08:32:00+05:00",
        "amount": 2400,
        "payment": "card",
        "commission": 360,
    }
)


def test_repeated_submission_does_not_create_duplicate(tmp_path: Path) -> None:
    store = TripStore(tmp_path / "trips.json")
    assert store.add(TRIP)[1] is False
    assert store.add(TRIP)[1] is True
    assert len(store.get_day("2026-10-01").trips) == 1


def test_concurrent_retries_are_idempotent(tmp_path: Path) -> None:
    store = TripStore(tmp_path / "trips.json")
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(store.add, [TRIP] * 4))
    assert sum(not duplicate for _, duplicate in results) == 1
    assert sum(duplicate for _, duplicate in results) == 3
    assert len(store.get_day("2026-10-01").trips) == 1
