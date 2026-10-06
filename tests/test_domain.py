from datetime import datetime

import pytest
from pydantic import ValidationError

from app.domain import calculate_summary
from app.models import Trip


def make_trip(trip_id: str, amount: float, payment: str, commission: float) -> Trip:
    return Trip(
        id=trip_id,
        start=datetime.fromisoformat("2026-10-01T08:10:00+05:00"),
        end=datetime.fromisoformat("2026-10-01T08:32:00+05:00"),
        amount=amount,
        payment=payment,
        commission=commission,
    )


def test_calculates_daily_summary_and_payment_split() -> None:
    summary = calculate_summary(
        [
            make_trip("1", 2400, "card", 360),
            make_trip("2", 1500, "cash", 225),
            make_trip("3", 1000, "card", 100),
        ]
    )
    assert summary.tripCount == 3
    assert summary.revenue == 4900
    assert summary.commission == 685
    assert summary.net == 4215
    assert summary.byPayment["cash"].model_dump() == {"count": 1, "amount": 1500}
    assert summary.byPayment["card"].model_dump() == {"count": 2, "amount": 3400}


def test_empty_day_has_zero_totals() -> None:
    summary = calculate_summary([])
    assert summary.tripCount == 0
    assert summary.net == 0
    assert summary.byPayment["cash"].count == 0


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"amount": 0}, "greater than 0"),
        ({"end": "2026-10-01T07:00:00+05:00"}, "позже начала"),
        ({"start": "2026-10-01T08:10:00"}, "часовой пояс"),
        ({"commission": 2500}, "превышать amount"),
    ],
)
def test_rejects_invalid_trip_data(changes: dict, message: str) -> None:
    payload = {
        "id": "bad",
        "start": "2026-10-01T08:10:00+05:00",
        "end": "2026-10-01T08:32:00+05:00",
        "amount": 2400,
        "payment": "cash",
        "commission": 360,
        **changes,
    }
    with pytest.raises(ValidationError, match=message):
        Trip.model_validate(payload)
