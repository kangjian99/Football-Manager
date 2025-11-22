
export enum LeagueLevel {
  SERIE_A = 'Serie A',
  SERIE_B = 'Serie B',
  PREMIER_LEAGUE = 'Premier League',
  CHAMPIONSHIP = 'Championship'
}

export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number; // 1-99
  effectiveRating?: number; // Match-day rating with form modifier (±3)
  age: number;
  form?: number; // 1-10, affects match performance
  goals: number; // Season stats
  assists: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
  matchesBanned: number; // 0 = available, > 0 = suspended
}

export interface Team {
  id: string;
  name: string;
  league: LeagueLevel;
  att: number;
  mid: number;
  def: number;
  color: string;
  logo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  players: Player[]; 
}

export interface MatchEvent {
  minute: number;
  extraMinute?: number; // For stoppage time (e.g., 45+1, 90+3)
  type: 'goal' | 'card' | 'sub' | 'commentary' | 'whistle' | 'penalty-award' | 'penalty-miss';
  text: string;
  teamId?: string;
  playerId?: string;
  playerName?: string;
  subOn?: { id: string, name: string }; // Player entering
  subOff?: { id: string, name: string }; // Player leaving
  isImportant: boolean;
  cardType?: 'yellow' | 'red';
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  week: number;
  events: MatchEvent[];
  firstHalfStoppage: number;
  secondHalfStoppage: number;
  homeLineup?: Player[];
  awayLineup?: Player[];
  homeFormation?: string;
  awayFormation?: string;
}

export type ViewState = 'DASHBOARD' | 'SQUAD' | 'LEAGUE' | 'MATCH' | 'SETTINGS' | 'TACTICS' | 'FIXTURES' | 'SEASON_END';