import json
import os
import tempfile
from pathlib import Path
from threading import Lock

from app.domain import calculate_summary
from app.models import DayResponse, Trip


class TripStore:
    """A small thread-safe JSON repository with atomic writes."""

    def __init__(self, file_path: Path | str) -> None:
        self.file_path = Path(file_path)
        self._lock = Lock()

    def _read_unlocked(self) -> list[Trip]:
        if not self.file_path.exists():
            return []
        with self.file_path.open(encoding="utf-8") as source:
            raw_trips = json.load(source)
        if not isinstance(raw_trips, list):
            raise ValueError("Trip storage must contain a JSON array")
        return [Trip.model_validate(item) for item in raw_trips]

    def get_day(self, selected_date: str) -> DayResponse:
        with self._lock:
            trips = [
                trip
                for trip in self._read_unlocked()
                if trip.start.date().isoformat() == selected_date
            ]
        trips.sort(key=lambda trip: trip.start)
        return DayResponse(
            date=selected_date,
            summary=calculate_summary(trips),
            trips=trips,
        )

    def add(self, trip: Trip) -> tuple[Trip, bool]:
        """Return (trip, duplicate); repeated ids never create a second record."""
        with self._lock:
            trips = self._read_unlocked()
            existing = next((item for item in trips if item.id == trip.id), None)
            if existing is not None:
                return existing, True

            trips.append(trip)
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            handle, temporary_name = tempfile.mkstemp(
                prefix=f".{self.file_path.name}.",
                suffix=".tmp",
                dir=self.file_path.parent,
                text=True,
            )
            try:
                with os.fdopen(handle, "w", encoding="utf-8") as target:
                    payload = [item.model_dump(mode="json") for item in trips]
                    json.dump(payload, target, ensure_ascii=False, indent=2)
                    target.write("\n")
                    target.flush()
                    os.fsync(target.fileno())
                os.replace(temporary_name, self.file_path)
            except BaseException:
                if os.path.exists(temporary_name):
                    os.unlink(temporary_name)
                raise
            return trip, False
