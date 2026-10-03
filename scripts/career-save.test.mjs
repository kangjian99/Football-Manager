import assert from 'node:assert/strict';
import test from 'node:test';
import { readCareerSeason, writeCareerSeason } from '../services/careerSave.ts';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

test('a new career records the season id', () => {
  const storage = memoryStorage();
  assert.equal(readCareerSeason(storage), null);
  writeCareerSeason(storage, '2024-25');
  assert.equal(readCareerSeason(storage), '2024-25');
  assert.deepEqual(JSON.parse(storage.data.fm_career_v1), { version: 1, seasonId: '2024-25' });
});

test('a save without seasonId is refused', () => {
  const storage = memoryStorage({ fm_career_v1: JSON.stringify({ version: 1 }) });
  assert.throws(() => readCareerSeason(storage), /missing seasonId/);
});

test('invalid JSON is refused', () => {
  const storage = memoryStorage({ fm_career_v1: '{not json' });
  assert.throws(() => readCareerSeason(storage), /not valid JSON/);
});
