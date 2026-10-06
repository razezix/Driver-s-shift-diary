import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAppServer } from '../src/server.js';
import { TripStore } from '../src/store.js';

async function withServer(t) {
  const directory = await mkdtemp(join(tmpdir(), 'shift-api-'));
  const store = new TripStore(join(directory, 'trips.json'));
  const server = createAppServer(store);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('API creates a trip, returns the summary and treats retry as duplicate', async (t) => {
  const baseUrl = await withServer(t);
  const trip = {
    id: 'api-trip', start: '2026-10-03T08:00:00+05:00', end: '2026-10-03T08:20:00+05:00',
    amount: 2000, payment: 'cash', commission: 300
  };

  const created = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(trip)
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).duplicate, false);

  const retry = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(trip)
  });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).duplicate, true);

  const day = await (await fetch(`${baseUrl}/api/day?date=2026-10-03`)).json();
  assert.equal(day.trips.length, 1);
  assert.equal(day.summary.revenue, 2000);
  assert.equal(day.summary.net, 1700);
});

test('API responds with validation details', async (t) => {
  const baseUrl = await withServer(t);
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'bad', start: '2026-10-03T09:00:00+05:00', end: '2026-10-03T08:00:00+05:00', amount: -1, payment: 'cash', commission: 0 })
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, 'Ошибка проверки данных');
  assert.ok(body.details.length >= 2);
});
