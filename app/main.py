import os
from datetime import date
from pathlib import Path

from fastapi import FastAPI, Query, Response, status
from fastapi.staticfiles import StaticFiles

from app.models import CreateTripResponse, DayResponse, Trip
from app.store import TripStore

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = Path(os.getenv("TRIPS_FILE", ROOT / "data" / "trips.json"))

app = FastAPI(
    title="Дневник смен водителя",
    description="API поездок и дневной сводки водителя",
    version="2.0.0",
)
store = TripStore(DATA_FILE)


@app.get("/api/day", response_model=DayResponse, tags=["Смена"])
def get_day(selected_date: date | None = Query(default=None, alias="date")) -> DayResponse:
    """Return trips and calculated totals for a selected calendar day."""
    day = (selected_date or date.today()).isoformat()
    return store.get_day(day)


@app.post(
    "/api/trips",
    response_model=CreateTripResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Поездки"],
)
def create_trip(trip: Trip, response: Response) -> CreateTripResponse:
    """Create a trip or safely return the existing trip for a repeated id."""
    stored_trip, duplicate = store.add(trip)
    if duplicate:
        response.status_code = status.HTTP_200_OK
    return CreateTripResponse(trip=stored_trip, duplicate=duplicate)


app.mount("/", StaticFiles(directory=ROOT / "public", html=True), name="frontend")
