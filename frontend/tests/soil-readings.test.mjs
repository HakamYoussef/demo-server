import test from 'node:test';
import assert from 'node:assert/strict';
import { getSoilReadings } from '../src/app/lib/soil-readings.mjs';

test('each assigned soil sensor uses its own four fields, including zero', () => {
  for (let sensor = 1; sensor <= 12; sensor++) {
    const reading = { T_S1: 99, H_S1: 99, PH_S1: 99, C_S1: 99,
      [`T_S${sensor}`]: 23, [`H_S${sensor}`]: 0, [`PH_S${sensor}`]: 6.8, [`C_S${sensor}`]: 1.2 };
    assert.deepEqual(getSoilReadings(reading, String(sensor)), { temp: 23, humidity: 0, ph: 6.8, conductivity: 1.2 });
  }
});

test('missing, invalid and unassigned readings are unavailable', () => {
  const empty = { temp: null, humidity: null, ph: null, conductivity: null };
  for (const sensor of [null, '', 0, 13, -1, 1.5, 'invalid']) {
    assert.deepEqual(getSoilReadings({ T_S1: 25 }, sensor), empty);
  }
  assert.deepEqual(getSoilReadings({ T_S1: NaN, H_S1: null, PH_S1: Infinity, C_S1: '' }, 1), empty);
  assert.deepEqual(getSoilReadings({}, 12), empty);
});
