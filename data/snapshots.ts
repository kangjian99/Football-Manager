import championshipJson from './seasons/2024-25/championship.json';
import premierLeagueJson from './seasons/2024-25/premier-league.json';
import serieAJson from './seasons/2024-25/serie-a.json';
import serieBExtraJson from './seasons/2024-25/serie-b-extra.json';
import serieBJson from './seasons/2024-25/serie-b.json';
import type { LeagueSnapshot } from './roster';

/** Snapshot a new career loads. Older careers keep the id stored on their save. */
export const CURRENT_SEASON_ID = '2024-25';

const BUNDLED: Record<string, Record<string, LeagueSnapshot>> = {
  '2024-25': {
    'serie-a': serieAJson as LeagueSnapshot,
    'serie-b': serieBJson as LeagueSnapshot,
    'premier-league': premierLeagueJson as LeagueSnapshot,
    championship: championshipJson as LeagueSnapshot,
    'serie-b-extra': serieBExtraJson as LeagueSnapshot,
  },
};

export function loadLeague(seasonId: string, leagueId: string): LeagueSnapshot {
  const snapshot = BUNDLED[seasonId]?.[leagueId];
  if (!snapshot) {
    const known = Object.keys(BUNDLED).join(', ');
    throw new Error(
      `No bundled roster snapshot for ${seasonId}/${leagueId}. Bundled seasons: ${known}. Refusing to substitute ${CURRENT_SEASON_ID}.`
    );
  }
  if (snapshot.seasonId !== seasonId || snapshot.leagueId !== leagueId) {
    throw new Error(
      `Snapshot ${seasonId}/${leagueId} declares ${snapshot.seasonId}/${snapshot.leagueId}.`
    );
  }
  return snapshot;
}

export function seasonYearLabel(seasonId: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonId);
  if (!match) {
    throw new Error(`Invalid season id "${seasonId}". Expected YYYY-YY, for example 2024-25.`);
  }
  const start = Number(match[1]);
  const end = Math.floor(start / 100) * 100 + Number(match[2]);
  if (end !== start + 1) {
    throw new Error(`Invalid season id "${seasonId}". The end year must be the start year plus one.`);
  }
  return `${start}/${end}`;
}
