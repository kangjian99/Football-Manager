export interface SnapshotPlayer {
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  age: number;
}

export interface SnapshotTeam {
  id: string;
  name: string;
  players: SnapshotPlayer[];
}

export interface LeagueSources {
  footballData?: { competition: string };
  apiFootball?: { league: number };
}

export interface LeagueSnapshot {
  seasonId: string;
  leagueId: string;
  movedFrom?: string;
  note?: string;
  sources: LeagueSources | null;
  teams: SnapshotTeam[];
}

const POSITIONS = new Set<SnapshotPlayer['position']>(['GK', 'DEF', 'MID', 'FWD']);

export function roster(snapshot: LeagueSnapshot, teamId: string): SnapshotPlayer[] {
  const team = snapshot.teams.find(entry => entry.id === teamId);
  if (!team) {
    throw new Error(
      `Season ${snapshot.seasonId} (${snapshot.leagueId}) has no roster for ${teamId}.`
    );
  }

  return team.players.map((player, index) => {
    if (!POSITIONS.has(player.position)) {
      throw new Error(
        `Invalid position "${player.position}" for ${player.name} in ${snapshot.seasonId}/${snapshot.leagueId}/${teamId}.`
      );
    }
    if (!player.name || !Number.isFinite(player.rating) || !Number.isFinite(player.age)) {
      throw new Error(
        `Incomplete player at ${teamId}[${index}] in ${snapshot.seasonId}/${snapshot.leagueId}.`
      );
    }
    return {
      name: player.name,
      position: player.position,
      rating: player.rating,
      age: player.age,
    };
  });
}
