import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSummary, validateTrip } from '../src/domain.js';

const trips = [
  { amount: 2400, payment: 'card', commission: 360 },
  { amount: 1500, payment: 'cash', commission: 225 },
  { amount: 1000, payment: 'card', commission: 100 }
];

test('calculates daily summary and payment split', () => {
  assert.deepEqual(calculateSummary(trips), {
    tripCount: 3,
    revenue: 4900,
    commission: 685,
    net: 4215,
    byPayment: {
      cash: { count: 1, amount: 1500 },
      card: { count: 2, amount: 3400 }
    }
  });
});

test('calculates an empty day', () => {
  assert.deepEqual(calculateSummary([]), {
    tripCount: 0, revenue: 0, commission: 0, net: 0,
    byPayment: { cash: { count: 0, amount: 0 }, card: { count: 0, amount: 0 } }
  });
});

test('rejects non-positive amount and reversed time interval', () => {
  const result = validateTrip({
    id: 'bad', start: '2026-10-01T10:00:00+05:00', end: '2026-10-01T09:00:00+05:00',
    amount: 0, payment: 'cash', commission: 0
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('amount')));
  assert.ok(result.errors.some((error) => error.includes('позже начала')));
});
