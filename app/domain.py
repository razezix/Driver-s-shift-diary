from app.models import DaySummary, PaymentSummary, Trip


def calculate_summary(trips: list[Trip]) -> DaySummary:
    """Calculate all daily totals in one pass over the trips."""
    cash = PaymentSummary()
    card = PaymentSummary()
    revenue = 0.0
    commission = 0.0

    for trip in trips:
        revenue += trip.amount
        commission += trip.commission
        payment = cash if trip.payment == "cash" else card
        payment.count += 1
        payment.amount += trip.amount

    return DaySummary(
        tripCount=len(trips),
        revenue=revenue,
        commission=commission,
        net=revenue - commission,
        byPayment={"cash": cash, "card": card},
    )
