#!/usr/bin/env node
/**
 * Build the next season's roster snapshot from the previous one.
 *
 * Squad membership comes from football-data.org (preferred) or API-Football.
 * Players who remain keep their stored rating. Their age increases by 1.
 * A genuinely new name gets DEFAULT_NEW_PLAYER_RATING (75), the same fallback
 * injectRealPlayers already uses when a real player has no rating. Age and
 * position for that new name come from the API. If either is missing, the
 * script stops and does not write a snapshot.
 *
 * If FOOTBALL_DATA_API_TOKEN and API_FOOTBALL_KEY are both unset, the script
 * exits with an error and does not write files.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const DEFAULT_NEW_PLAYER_RATING = 75;

export const MISSING_KEY_MESSAGE = `Cannot refresh season snapshots: no football data API key is set.
Set FOOTBALL_DATA_API_TOKEN for football-data.org (preferred) or API_FOOTBALL_KEY for API-Football, then rerun.
This script does not write placeholder squads or guess transfers.`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUEST_GAP_MS = 7000;

export function normalizeName(name) {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function nextSeasonId(seasonId) {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonId);
  if (!match) throw new Error(`Invalid season id "${seasonId}". Expected YYYY-YY.`);
  const start = Number(match[1]) + 1;
  const end = String(Number(match[2]) + 1).padStart(2, '0').slice(-2);
  return `${start}-${end}`;
}

export function seasonStartYear(seasonId) {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonId);
  if (!match) throw new Error(`Invalid season id "${seasonId}".`);
  return Number(match[1]);
}

/** Age on 1 August of seasonStartYear. Birthday on that day counts as completed. */
export function ageOnAugustFirst(dob, seasonStartYear) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = seasonStartYear - year;
  if (month > 8 || (month === 8 && day > 1)) age -= 1;
  return age;
}

export function mapPosition(raw) {
  if (!raw) return null;
  const value = String(raw).toLowerCase();
  if (value.includes('goal') || value === 'gk') return 'GK';
  if (value.includes('def')) return 'DEF';
  if (value.includes('mid')) return 'MID';
  if (value.includes('off') || value.includes('forw') || value.includes('att') || value.includes('strik')) return 'FWD';
  return null;
}

export function resolveApiKey(env) {
  const footballData = (env.FOOTBALL_DATA_API_TOKEN || '').trim();
  const apiFootball = (env.API_FOOTBALL_KEY || '').trim();
  if (footballData) return { provider: 'football-data', token: footballData };
  if (apiFootball) return { provider: 'api-football', token: apiFootball };
  return null;
}

export function indexPreviousPlayers(snapshots) {
  const byName = new Map();
  for (const snapshot of snapshots) {
    for (const team of snapshot.teams) {
      for (const player of team.players) {
        const key = normalizeName(player.name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push({ ...player, teamId: team.id });
      }
    }
  }
  return byName;
}

export function rollSquad({ teamId, externalPlayers, previousByName, consumed }) {
  const next = [];
  for (const external of externalPlayers) {
    const key = normalizeName(external.name);
    const candidates = previousByName.get(key) || [];
    let index = candidates.findIndex(player => !consumed.has(player) && player.teamId === teamId);
    if (index === -1) index = candidates.findIndex(player => !consumed.has(player));
    const kept = index === -1 ? null : candidates[index];
    if (kept) consumed.add(kept);

    const position = external.position || kept?.position || null;
    if (!position) {
      throw new Error(`No position for ${external.name} (${teamId}). Nothing was written.`);
    }

    if (kept) {
      next.push({
        name: kept.name,
        position,
        rating: kept.rating,
        age: kept.age + 1,
      });
      continue;
    }

    if (!Number.isInteger(external.age)) {
      throw new Error(
        `New player ${external.name} (${teamId}) has no age from the API. Nothing was written.`
      );
    }
    next.push({
      name: external.name,
      position,
      rating: DEFAULT_NEW_PLAYER_RATING,
      age: external.age,
    });
  }
  return next;
}

export function matchApiTeam(ourTeam, apiTeams) {
  const code = ourTeam.id.toUpperCase();
  const byCode = apiTeams.find(team => (team.tla || '').toUpperCase() === code);
  if (byCode) return byCode;
  const want = normalizeName(ourTeam.name);
  const byName = apiTeams.filter(team => {
    const names = [team.name, team.shortName].filter(Boolean).map(normalizeName);
    return names.some(name => name === want || name.includes(want) || (want.length > 4 && want.includes(name)));
  });
  return byName.length === 1 ? byName[0] : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${url} failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json();
}

function externalPlayer(name, rawPosition, age) {
  const position = mapPosition(rawPosition);
  if (!position) {
    throw new Error(`Unmapped position "${rawPosition}" for ${name}. Nothing was written.`);
  }
  return { name, position, age };
}

async function fetchFootballData(competition, seasonYear, token) {
  const headers = { 'X-Auth-Token': token };
  const listed = await getJson(
    `https://api.football-data.org/v4/competitions/${competition}/teams?season=${seasonYear}`,
    headers
  );
  await sleep(REQUEST_GAP_MS);
  const teams = [];
  for (const team of listed.teams || []) {
    const detail = await getJson(`https://api.football-data.org/v4/teams/${team.id}`, headers);
    const players = (detail.squad || []).map(player => {
      const age = ageOnAugustFirst(player.dateOfBirth, seasonYear);
      return externalPlayer(player.name, player.position, age);
    });
    teams.push({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      tla: team.tla,
      players,
    });
    await sleep(REQUEST_GAP_MS);
  }
  return teams;
}

async function fetchApiFootball(league, seasonYear, token) {
  const headers = { 'x-apisports-key': token };
  const listed = await getJson(
    `https://v3.football.api-sports.io/teams?league=${league}&season=${seasonYear}`,
    headers
  );
  await sleep(REQUEST_GAP_MS);
  const teams = [];
  for (const row of listed.response || []) {
    const team = row.team;
    const squad = await getJson(
      `https://v3.football.api-sports.io/players/squads?team=${team.id}`,
      headers
    );
    const players = (squad.response?.[0]?.players || []).map(player =>
      externalPlayer(player.name, player.position, Number.isInteger(player.age) ? player.age : null)
    );
    teams.push({
      id: team.id,
      name: team.name,
      shortName: team.name,
      tla: team.code || '',
      players,
    });
    await sleep(REQUEST_GAP_MS);
  }
  return teams;
}

function readSeason(from) {
  const dir = path.join(ROOT, 'data', 'seasons', from);
  if (!fs.existsSync(dir)) {
    throw new Error(`Previous season directory does not exist: data/seasons/${from}`);
  }
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function writeSeason(to, snapshots) {
  const finalDir = path.join(ROOT, 'data', 'seasons', to);
  if (fs.existsSync(finalDir)) {
    throw new Error(`Refusing to overwrite data/seasons/${to}.`);
  }
  const tempDir = path.join(ROOT, 'data', 'seasons', `.tmp-${to}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    for (const snapshot of snapshots) {
      fs.writeFileSync(
        path.join(tempDir, `${snapshot.leagueId}.json`),
        JSON.stringify(snapshot, null, 2) + '\n'
      );
    }
    fs.renameSync(tempDir, finalDir);
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--from') args.from = argv[++i];
    else if (token === '--to') args.to = argv[++i];
    else throw new Error(`Unknown argument ${token}. Usage: node scripts/refresh-season.mjs --from 2024-25 --to 2025-26`);
  }
  if (!args.from || !args.to) {
    throw new Error('Usage: node scripts/refresh-season.mjs --from 2024-25 --to 2025-26');
  }
  return args;
}

export async function refreshSeason({ from, to, env, fetcher }) {
  const expected = nextSeasonId(from);
  if (to !== expected) {
    throw new Error(`--to must be the next season after ${from} (${expected}), so ages increase by exactly 1.`);
  }
  const api = resolveApiKey(env);
  if (!api) {
    throw new Error(MISSING_KEY_MESSAGE);
  }

  const previous = readSeason(from);
  const finalDir = path.join(ROOT, 'data', 'seasons', to);
  if (fs.existsSync(finalDir)) {
    throw new Error(`Refusing to overwrite data/seasons/${to}.`);
  }

  const previousByName = indexPreviousPlayers(previous);
  const consumed = new Set();
  const startYear = seasonStartYear(to);
  const built = [];

  for (const snapshot of previous) {
    const source = api.provider === 'football-data'
      ? snapshot.sources?.footballData
      : snapshot.sources?.apiFootball;
    if (!source) {
      console.error(`Skipping ${snapshot.leagueId}: no ${api.provider} competition mapping. Not writing a guessed roster.`);
      continue;
    }

    const competition = api.provider === 'football-data' ? source.competition : source.league;
    const apiTeams = await fetcher({ provider: api.provider, token: api.token, competition, seasonYear: startYear });
    const teams = [];
    for (const team of snapshot.teams) {
      const matched = matchApiTeam(team, apiTeams);
      if (!matched) {
        throw new Error(
          `No API club matched ${team.name} (${team.id}) in ${snapshot.leagueId}. Nothing was written.`
        );
      }
      if (!matched.players.length) {
        throw new Error(`API returned no players for ${team.name} (${team.id}). Nothing was written.`);
      }
      teams.push({
        id: team.id,
        name: team.name,
        players: rollSquad({
          teamId: team.id,
          externalPlayers: matched.players,
          previousByName,
          consumed,
        }),
      });
    }

    built.push({
      seasonId: to,
      leagueId: snapshot.leagueId,
      movedFrom: snapshot.movedFrom,
      note: `Rolled from ${from} using ${api.provider}. Remaining players keep their rating and gain 1 year of age. New names use rating ${DEFAULT_NEW_PLAYER_RATING}.`,
      sources: snapshot.sources,
      teams,
    });
  }

  if (built.length === 0) {
    throw new Error('No league snapshots were refreshed. Nothing was written.');
  }
  writeSeason(to, built);
  return built.map(snapshot => snapshot.leagueId);
}

async function main() {
  const { from, to } = parseArgs(process.argv.slice(2));
  const leagues = await refreshSeason({
    from,
    to,
    env: process.env,
    fetcher: async ({ provider, token, competition, seasonYear }) => {
      if (provider === 'football-data') return fetchFootballData(competition, seasonYear, token);
      return fetchApiFootball(competition, seasonYear, token);
    },
  });
  console.log(`Wrote data/seasons/${to} for ${leagues.join(', ')}.`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
