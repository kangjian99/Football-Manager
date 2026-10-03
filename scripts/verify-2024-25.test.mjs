import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seasonDir = path.join(root, 'data/seasons');

function load(leagueId) {
  return JSON.parse(fs.readFileSync(path.join(seasonDir, '2024-25', `${leagueId}.json`), 'utf8'));
}

function findPlayer(snapshot, teamId, name) {
  const team = snapshot.teams.find(entry => entry.id === teamId);
  assert.ok(team, `missing team ${teamId}`);
  const player = team.players.find(entry => entry.name === name);
  assert.ok(player, `missing ${name} on ${teamId}`);
  return player;
}

test('only the moved 2024-25 snapshot is bundled', () => {
  const seasons = fs.readdirSync(seasonDir).filter(name => !name.startsWith('.'));
  assert.deepEqual(seasons, ['2024-25']);
});

test('named players match the old constants', () => {
  const serieA = load('serie-a');
  const serieB = load('serie-b');
  const premier = load('premier-league');
  const championship = load('championship');
  const extra = load('serie-b-extra');

  assert.equal(serieA.teams.length, 20);
  assert.equal(serieB.teams.length, 20);
  assert.equal(premier.teams.length, 20);
  assert.equal(championship.teams.length, 24);
  assert.equal(extra.teams.length, 4);

  const lautaro = findPlayer(serieA, 'INT', 'Lautaro Martinez');
  assert.deepEqual(
    { position: lautaro.position, rating: lautaro.rating, age: lautaro.age },
    { position: 'FWD', rating: 94, age: 27 }
  );
  const berardi = findPlayer(serieB, 'SAS', 'Domenico Berardi');
  assert.equal(berardi.rating, 83);
  assert.equal(berardi.age, 30);

  const haaland = findPlayer(premier, 'MCI', 'Erling Haaland');
  assert.deepEqual(
    { position: haaland.position, rating: haaland.rating, age: haaland.age },
    { position: 'FWD', rating: 94, age: 25 }
  );
  const jake = findPlayer(premier, 'EVE', "Jake O'Brien");
  assert.equal(jake.position, 'DEF');
  assert.equal(jake.rating, 82);

  const bell = findPlayer(championship, 'LUT', "Amari'i Bell");
  assert.equal(bell.rating, 76);
  assert.equal(
    championship.teams.find(team => team.id === 'LUT').players.some(player => player.name.startsWith('Test')),
    false
  );

  const vicenza = findPlayer(extra, 'VIC', 'Franco Ferrari');
  assert.equal(vicenza.rating, 71);

  for (const snapshot of [serieA, serieB, premier, championship, extra]) {
    assert.equal(snapshot.seasonId, '2024-25');
    for (const team of snapshot.teams) {
      assert.ok(team.players.length > 0, `${team.id} has no named players`);
      for (const player of team.players) {
        assert.deepEqual(Object.keys(player).sort(), ['age', 'name', 'position', 'rating']);
        assert.ok(['GK', 'DEF', 'MID', 'FWD'].includes(player.position));
      }
    }
  }
});
