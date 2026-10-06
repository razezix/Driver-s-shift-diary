import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { calculateSummary, tripDate, validateTrip } from './domain.js';

export class TripStore {
  #filePath;
  #writeQueue = Promise.resolve();

  constructor(filePath) {
    this.#filePath = filePath;
  }

  async #readTrips() {
    try {
      const raw = await readFile(this.#filePath, 'utf8');
      const trips = JSON.parse(raw);
      if (!Array.isArray(trips)) throw new Error('Trip storage must contain an array');
      return trips;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async getDay(date) {
    const trips = (await this.#readTrips())
      .filter((trip) => tripDate(trip) === date)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    return { date, summary: calculateSummary(trips), trips };
  }

  async add(input) {
    const validation = validateTrip(input);
    if (!validation.valid) {
      return { status: 'invalid', errors: validation.errors };
    }

    const operation = this.#writeQueue.then(async () => {
      const trips = await this.#readTrips();
      const existing = trips.find((trip) => trip.id === validation.trip.id);
      if (existing) return { status: 'duplicate', trip: existing };

      trips.push(validation.trip);
      await mkdir(dirname(this.#filePath), { recursive: true });
      const temporaryPath = `${this.#filePath}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(trips, null, 2)}\n`, 'utf8');
      await rename(temporaryPath, this.#filePath);
      return { status: 'created', trip: validation.trip };
    });

    this.#writeQueue = operation.catch(() => undefined);
    return operation;
  }
}
