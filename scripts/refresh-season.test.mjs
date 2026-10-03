import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_NEW_PLAYER_RATING,
  MISSING_KEY_MESSAGE,
  ageOnAugustFirst,
  indexPreviousPlayers,
  nextSeasonId,
  normalizeName,
  resolveApiKey,
  rollSquad,
} from './refresh-season.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('missing API key exits and does not write a season', () => {
  const env = { ...process.env };
  delete env.FOOTBALL_DATA_API_TOKEN;
  delete env.API_FOOTBALL_KEY;
  const result = spawnSync(
    process.execPath,
    ['scripts/refresh-season.mjs', '--from', '2024-25', '--to', '2025-26'],
    { cwd: root, env, encoding: 'utf8' }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no football data API key/i);
  assert.equal(result.stderr.includes(MISSING_KEY_MESSAGE.split('\n')[0]), true);
  assert.equal(fs.existsSync(path.join(root, 'data/seasons/2025-26')), false);
});

test('a fake key still refuses a season jump before any snapshot is written', () => {
  const env = { ...process.env, FOOTBALL_DATA_API_TOKEN: 'test-token-not-used', API_FOOTBALL_KEY: '' };
  const result = spawnSync(
    process.execPath,
    ['scripts/refresh-season.mjs', '--from', '2024-25', '--to', '2030-31'],
    { cwd: root, env, encoding: 'utf8' }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ages increase by exactly 1/);
  assert.equal(fs.existsSync(path.join(root, 'data/seasons/2030-31')), false);
});

test('resolveApiKey prefers football-data.org and treats blanks as missing', () => {
  assert.equal(resolveApiKey({}), null);
  assert.equal(resolveApiKey({ FOOTBALL_DATA_API_TOKEN: '  ', API_FOOTBALL_KEY: '' }), null);
  assert.equal(resolveApiKey({ API_FOOTBALL_KEY: 'abc' }).provider, 'api-football');
  assert.equal(
    resolveApiKey({ FOOTBALL_DATA_API_TOKEN: 'fd', API_FOOTBALL_KEY: 'af' }).provider,
    'football-data'
  );
});

test('remaining players keep rating and age by one; new names get the default rating', () => {
  const previous = [{
    teams: [{
      id: 'INT',
      players: [
        { name: 'Lautaro Martínez', position: 'FWD', rating: 94, age: 27 },
        { name: 'Departed Player', position: 'MID', rating: 80, age: 30 },
      ],
    }],
  }];
  const previousByName = indexPreviousPlayers(previous);
  const consumed = new Set();
  const squad = rollSquad({
    teamId: 'INT',
    previousByName,
    consumed,
    externalPlayers: [
      { name: 'Lautaro Martinez', position: 'FWD', age: 99 },
      { name: 'Brand New', position: 'MID', age: 19 },
    ],
  });
  assert.deepEqual(squad, [
    { name: 'Lautaro Martínez', position: 'FWD', rating: 94, age: 28 },
    { name: 'Brand New', position: 'MID', rating: DEFAULT_NEW_PLAYER_RATING, age: 19 },
  ]);
  assert.equal(DEFAULT_NEW_PLAYER_RATING, 75);
});

test('a new name without an API age does not produce a player', () => {
  assert.throws(
    () => rollSquad({
      teamId: 'INT',
      previousByName: new Map(),
      consumed: new Set(),
      externalPlayers: [{ name: 'Nobody', position: 'FWD', age: null }],
    }),
    /no age/
  );
});

test('accent-insensitive names and August 1 ages', () => {
  assert.equal(normalizeName('Nicolò Barella'), normalizeName('Nicolo Barella'));
  assert.equal(ageOnAugustFirst('1997-08-22', 2025), 27);
  assert.equal(ageOnAugustFirst('1997-08-01', 2025), 28);
  assert.equal(nextSeasonId('2024-25'), '2025-26');
});
