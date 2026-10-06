const PAYMENT_TYPES = new Set(['cash', 'card']);

export function tripDate(trip) {
  return trip.start.slice(0, 10);
}

export function calculateSummary(trips) {
  const summary = {
    tripCount: trips.length,
    revenue: 0,
    commission: 0,
    net: 0,
    byPayment: {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 }
    }
  };

  for (const trip of trips) {
    summary.revenue += trip.amount;
    summary.commission += trip.commission;
    summary.byPayment[trip.payment].count += 1;
    summary.byPayment[trip.payment].amount += trip.amount;
  }

  summary.net = summary.revenue - summary.commission;
  return summary;
}

export function validateTrip(input) {
  const errors = [];
  const trip = {
    id: typeof input?.id === 'string' ? input.id.trim() : '',
    start: input?.start,
    end: input?.end,
    amount: input?.amount,
    payment: input?.payment,
    commission: input?.commission
  };

  if (!trip.id) errors.push('id обязателен');

  const startTime = Date.parse(trip.start);
  const endTime = Date.parse(trip.end);
  if (typeof trip.start !== 'string' || !Number.isFinite(startTime)) {
    errors.push('start должен быть датой в ISO 8601');
  }
  if (typeof trip.end !== 'string' || !Number.isFinite(endTime)) {
    errors.push('end должен быть датой в ISO 8601');
  }
  if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime <= startTime) {
    errors.push('окончание должно быть позже начала');
  }
  if (typeof trip.amount !== 'number' || !Number.isFinite(trip.amount) || trip.amount <= 0) {
    errors.push('amount должен быть числом больше 0');
  }
  if (!PAYMENT_TYPES.has(trip.payment)) {
    errors.push('payment должен быть cash или card');
  }
  if (typeof trip.commission !== 'number' || !Number.isFinite(trip.commission) || trip.commission < 0) {
    errors.push('commission должен быть неотрицательным числом');
  }
  if (
    typeof trip.amount === 'number' &&
    typeof trip.commission === 'number' &&
    trip.commission > trip.amount
  ) {
    errors.push('commission не может превышать amount');
  }

  return { valid: errors.length === 0, errors, trip };
}
