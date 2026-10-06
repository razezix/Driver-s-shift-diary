import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TripStore } from '../src/store.js';

const trip = {
  id: 'same-trip', start: '2026-10-01T08:10:00+05:00', end: '2026-10-01T08:32:00+05:00',
  amount: 2400, payment: 'card', commission: 360
};

test('repeated submission with the same id does not create a duplicate', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'shift-diary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'trips.json');
  const store = new TripStore(file);

  assert.equal((await store.add(trip)).status, 'created');
  assert.equal((await store.add(trip)).status, 'duplicate');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 1);
});

test('concurrent repeated submissions are also idempotent', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'shift-diary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'trips.json');
  const store = new TripStore(file);

  const results = await Promise.all([store.add(trip), store.add(trip), store.add(trip)]);
  assert.equal(results.filter((result) => result.status === 'created').length, 1);
  assert.equal(results.filter((result) => result.status === 'duplicate').length, 2);
});
