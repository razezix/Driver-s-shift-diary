from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Trip(BaseModel):
    """A completed driver trip."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(min_length=1, max_length=100)
    start: datetime
    end: datetime
    amount: float = Field(gt=0)
    payment: Literal["cash", "card"]
    commission: float = Field(ge=0)

    @model_validator(mode="after")
    def validate_trip(self) -> "Trip":
        if self.start.tzinfo is None or self.end.tzinfo is None:
            raise ValueError("start и end должны содержать часовой пояс")
        if self.end <= self.start:
            raise ValueError("окончание должно быть позже начала")
        if self.commission > self.amount:
            raise ValueError("commission не может превышать amount")
        return self


class PaymentSummary(BaseModel):
    count: int = 0
    amount: float = 0


class DaySummary(BaseModel):
    tripCount: int
    revenue: float
    commission: float
    net: float
    byPayment: dict[Literal["cash", "card"], PaymentSummary]


class DayResponse(BaseModel):
    date: str
    summary: DaySummary
    trips: list[Trip]


class CreateTripResponse(BaseModel):
    trip: Trip
    duplicate: bool
