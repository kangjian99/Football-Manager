
import React from 'react';
import { Team, LeagueLevel, Player } from './types';
import { CURRENT_SEASON_ID, loadLeague } from './data/snapshots';
import { roster } from './data/roster';


// --- Logo Components ---

// A utility to create striped patterns for logos
const StripedLogo = ({ colors, rotate = 0, vertical = false }: { colors: string[], rotate?: number, vertical?: boolean }) => {
  return React.createElement('div', {
    className: "w-full h-full rounded-full overflow-hidden relative border-2 border-gray-800/20",
    style: { transform: `rotate(${rotate}deg)` }
  }, colors.map((c, i) => 
    React.createElement('div', {
      key: i,
      className: `absolute ${vertical ? 'h-full' : 'w-full'}`,
      style: { 
        backgroundColor: c,
        [vertical ? 'width' : 'height']: `${100 / colors.length}%`,
        [vertical ? 'left' : 'top']: `${(100 / colors.length) * i}%`
      }
    })
  ));
};

// --- Name Databases (for procedural generation filler) ---
const IT_FIRST_NAMES = ['Alessandro', 'Lorenzo', 'Mattia', 'Francesco', 'Leonardo', 'Andrea', 'Riccardo', 'Gabriele', 'Tommaso', 'Antonio', 'Marco', 'Giuseppe', 'Davide', 'Federico', 'Michele', 'Giovanni', 'Roberto', 'Simone', 'Luca', 'Stefano', 'Dario', 'Paolo', 'Vincenzo', 'Enrico', 'Pietro'];
const IT_LAST_NAMES = ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi'];

// --- Player Generator ---
const generatePlayer = (role: 'GK' | 'DEF' | 'MID' | 'FWD', baseRating: number, teamId: string, index: number): Player => {
  // Variance: +/- 6 from team base rating
  let rating = Math.floor(baseRating + (Math.random() * 12) - 6);
  
  // Hard cap for generated players to ensure they don't exceed real superstars (usually ~90+)
  // Reduced from 95 to 88 to keep "filler" players realistic
  if (rating > 88) rating = 88; 
  if (rating < 55) rating = 55;

  const age = Math.floor(17 + Math.random() * 6); // 17-23
  const fname = IT_FIRST_NAMES[Math.floor(Math.random() * IT_FIRST_NAMES.length)];
  const lname = IT_LAST_NAMES[Math.floor(Math.random() * IT_LAST_NAMES.length)];

  return {
    id: `${teamId}-${role}-${index}`,
    name: `${fname} ${lname}`,
    position: role,
    rating,
    age,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    yellowCards: 0,
    redCards: 0,
    matchesBanned: 0, // Initialize
    injury: 0,
    form: 6 + Math.floor(Math.random() * 4) // 6-10
  };
};

const generateFullSquad = (teamId: string, att: number, mid: number, def: number): Player[] => {
  const squad: Player[] = [];
  
  // ADJUSTMENT: Reduce the base rating for generated players compared to the team's overall stats.
  // Team stats (e.g., ATT 93) reflect the starters/stars. 
  // Filler players should be significantly lower to avoid generating random 90+ rated players.
  const adjustRating = (val: number) => {
    if (val >= 90) return val - 13; // e.g., 93 -> 80. Range 74-86.
    if (val >= 85) return val - 10; // e.g., 89 -> 79. Range 73-85.
    if (val >= 80) return val - 7;  // e.g., 82 -> 75. Range 69-81.
    return val - 4;                 // e.g., 75 -> 71.
  };

  const genAtt = adjustRating(att);
  const genMid = adjustRating(mid);
  const genDef = adjustRating(def);
  
  // Structure: 3 GK, 8 DEF, 8 MID, 6 FWD (25 man squad)
  
  // GK
  for(let i=0; i<3; i++) squad.push(generatePlayer('GK', genDef, teamId, i));
  // DEF
  for(let i=0; i<8; i++) squad.push(generatePlayer('DEF', genDef, teamId, i));
  // MID
  for(let i=0; i<8; i++) squad.push(generatePlayer('MID', genMid, teamId, i));
  // FWD
  for(let i=0; i<6; i++) squad.push(generatePlayer('FWD', genAtt, teamId, i));

  // Sort best to worst within squad
  return squad.sort((a, b) => b.rating - a.rating);
};

// Helper to inject real players
const injectRealPlayers = (generatedSquad: Player[], realData: Partial<Player>[]): Player[] => {
  const newSquad = [...generatedSquad];
  
  realData.forEach((realPlayer, i) => {
    // Find a player of the same position to replace
    // We try to replace a generated player that hasn't been replaced yet
    const idx = newSquad.findIndex(p => p.position === realPlayer.position && !p.id.includes('REAL'));
    
    const pData: Player = {
      id: `REAL-${realPlayer.name?.replace(/\s/g, '')}-${i}`,
      name: realPlayer.name || 'Unknown',
      position: realPlayer.position || 'MID',
      rating: realPlayer.rating || 75,
      age: realPlayer.age || 25,
      goals: 0,
      assists: 0,
      matchesPlayed: 0,
      yellowCards: 0,
      redCards: 0,
      matchesBanned: 0,
      injury: 0,
      form: 8
    };

    if (idx !== -1) {
      newSquad[idx] = pData;
    } else {
      newSquad.unshift(pData); // Just add if no slot
    }
  });
  
  return newSquad.sort((a, b) => b.rating - a.rating);
};

// --- Teams Construction ---

const createTeam = (
  id: string, name: string, league: LeagueLevel, 
  att: number, mid: number, def: number, 
  color: string, logo: any, // logo can now be string or JSX
  realPlayers: Partial<Player>[] = []
): Team => {
  let players = generateFullSquad(id, att, mid, def);
  if (realPlayers.length > 0) {
    players = injectRealPlayers(players, realPlayers);
  }
  return {
    id, name, league, att, mid, def, color, logo,
    points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0,
    players
  };
};

// --- SERIE A DATA (2024/25) ---

export function buildSerieATeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  const serieA = loadLeague(seasonId, 'serie-a');
  return [
  createTeam('INT', 'Inter', LeagueLevel.SERIE_A, 93, 91, 90, 'bg-blue-700', React.createElement(StripedLogo, { colors: ['#000', '#0066ff'], vertical: true }), roster(serieA, 'INT')),
  createTeam('MIL', 'Milan', LeagueLevel.SERIE_A, 89, 86, 85, 'bg-red-600', React.createElement(StripedLogo, { colors: ['#d40000', '#000'], vertical: true }), roster(serieA, 'MIL')),
  createTeam('JUV', 'Juventus', LeagueLevel.SERIE_A, 87, 88, 88, 'bg-gray-100 text-black', React.createElement(StripedLogo, { colors: ['#000', '#fff'], vertical: true }), roster(serieA, 'JUV')),
  createTeam('NAP', 'Napoli', LeagueLevel.SERIE_A, 89, 86, 85, 'bg-sky-500', '💠', roster(serieA, 'NAP')),
  createTeam('ATA', 'Atalanta', LeagueLevel.SERIE_A, 88, 86, 83, 'bg-blue-900', '⚫', roster(serieA, 'ATA')),
  createTeam('ROM', 'Roma', LeagueLevel.SERIE_A, 85, 84, 83, 'bg-orange-700', '🐺', roster(serieA, 'ROM')),
  createTeam('LAZ', 'Lazio', LeagueLevel.SERIE_A, 85, 84, 83, 'bg-sky-300 text-black', '🦅', roster(serieA, 'LAZ')),
  createTeam('FIO', 'Fiorentina', LeagueLevel.SERIE_A, 84, 83, 82, 'bg-purple-700', '⚜️', roster(serieA, 'FIO')),
  createTeam('BOL', 'Bologna', LeagueLevel.SERIE_A, 80, 81, 80, 'bg-red-800', '🏰', roster(serieA, 'BOL')),
  createTeam('TOR', 'Torino', LeagueLevel.SERIE_A, 79, 79, 80, 'bg-red-900', '🐂', roster(serieA, 'TOR')),
  createTeam('UDI', 'Udinese', LeagueLevel.SERIE_A, 78, 76, 77, 'bg-gray-800', '🦓', roster(serieA, 'UDI')),
  createTeam('EMP', 'Empoli', LeagueLevel.SERIE_A, 75, 76, 76, 'bg-blue-600', '🏛️', roster(serieA, 'EMP')),
  createTeam('VER', 'Verona', LeagueLevel.SERIE_A, 75, 74, 75, 'bg-yellow-600', '🪜', roster(serieA, 'VER')),
  createTeam('COM', 'Como', LeagueLevel.SERIE_A, 78, 77, 76, 'bg-blue-500', '🌊', roster(serieA, 'COM')),
  createTeam('PAR', 'Parma', LeagueLevel.SERIE_A, 77, 76, 75, 'bg-yellow-300 text-blue-800', '✝️', roster(serieA, 'PAR')),
  createTeam('CAG', 'Cagliari', LeagueLevel.SERIE_A, 75, 75, 74, 'bg-red-700', '🏝️', roster(serieA, 'CAG')),
  createTeam('GEN', 'Genoa', LeagueLevel.SERIE_A, 76, 77, 77, 'bg-red-500', '🐲', roster(serieA, 'GEN')),
  createTeam('MON', 'Monza', LeagueLevel.SERIE_A, 76, 77, 76, 'bg-red-600', '🏎️', roster(serieA, 'MON')),
  createTeam('LEC', 'Lecce', LeagueLevel.SERIE_A, 75, 75, 75, 'bg-yellow-500 text-black', '☀️', roster(serieA, 'LEC')),
  createTeam('VEN', 'Venezia', LeagueLevel.SERIE_A, 74, 74, 73, 'bg-orange-500', '🦁', roster(serieA, 'VEN'))
];
}
export const SERIE_A_TEAMS: Team[] = buildSerieATeams();


// --- SERIE B DATA (2024/25) ---

export function buildSerieBTeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  const serieB = loadLeague(seasonId, 'serie-b');
  return [
  createTeam('SAS', 'Sassuolo', LeagueLevel.SERIE_B, 79, 77, 75, 'bg-green-700', '🟩', roster(serieB, 'SAS')),
  createTeam('SAM', 'Sampdoria', LeagueLevel.SERIE_B, 76, 75, 74, 'bg-blue-600', '⚓', roster(serieB, 'SAM')),
  createTeam('PAL', 'Palermo', LeagueLevel.SERIE_B, 75, 74, 73, 'bg-pink-300 text-black', '🦅', roster(serieB, 'PAL')),
  createTeam('CRE', 'Cremonese', LeagueLevel.SERIE_B, 75, 75, 73, 'bg-gray-400 text-red-800', '🎻', roster(serieB, 'CRE')),
  createTeam('PIS', 'Pisa', LeagueLevel.SERIE_B, 74, 73, 72, 'bg-blue-800', '🗼', roster(serieB, 'PIS')),
  createTeam('SPE', 'Spezia', LeagueLevel.SERIE_B, 73, 73, 72, 'bg-white text-black', '🦅', roster(serieB, 'SPE')),
  createTeam('BRE', 'Brescia', LeagueLevel.SERIE_B, 72, 72, 71, 'bg-blue-500', '🦁', roster(serieB, 'BRE')),
  createTeam('BAR', 'Bari', LeagueLevel.SERIE_B, 71, 71, 70, 'bg-white text-red-600', '🐓', roster(serieB, 'BAR')),
  createTeam('SAL', 'Salernitana', LeagueLevel.SERIE_B, 72, 72, 71, 'bg-red-900', '🌊', roster(serieB, 'SAL')),
  createTeam('MOD', 'Modena', LeagueLevel.SERIE_B, 71, 71, 71, 'bg-yellow-400 text-blue-900', '🟡', roster(serieB, 'MOD')),
  createTeam('CAT', 'Catanzaro', LeagueLevel.SERIE_B, 70, 70, 69, 'bg-yellow-500 text-red-600', '🦅', roster(serieB, 'CAT')),
  createTeam('FRO', 'Frosinone', LeagueLevel.SERIE_B, 73, 72, 71, 'bg-yellow-400 text-blue-600', '🦁', roster(serieB, 'FRO')),
  createTeam('SUD', 'Sudtirol', LeagueLevel.SERIE_B, 69, 70, 70, 'bg-white text-red-700', '🏔️', roster(serieB, 'SUD')),
  createTeam('REG', 'Reggiana', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-red-800', '🟫', roster(serieB, 'REG')),
  createTeam('COS', 'Cosenza', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-blue-900 text-red-600', '🐺', roster(serieB, 'COS')),
  createTeam('CIT', 'Cittadella', LeagueLevel.SERIE_B, 68, 69, 69, 'bg-red-800', '🏰', roster(serieB, 'CIT')),
  createTeam('CES', 'Cesena', LeagueLevel.SERIE_B, 71, 70, 69, 'bg-black text-white', '🐴', roster(serieB, 'CES')),
  createTeam('MAN', 'Mantova', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-red-500', '⚪', roster(serieB, 'MAN')),
  createTeam('JUVN', 'Juve Stabia', LeagueLevel.SERIE_B, 68, 67, 66, 'bg-yellow-400 text-blue-800', '🐝', roster(serieB, 'JUVN')),
  createTeam('CAR', 'Carrarese', LeagueLevel.SERIE_B, 67, 67, 66, 'bg-blue-400 text-yellow-400', '⛰️', roster(serieB, 'CAR')),
];
}
export const SERIE_B_TEAMS: Team[] = buildSerieBTeams();


export const ALL_TEAMS = [...SERIE_A_TEAMS, ...SERIE_B_TEAMS];

export function buildAllTeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  return [...buildSerieATeams(seasonId), ...buildSerieBTeams(seasonId)];
}
export const SEASON_ID = CURRENT_SEASON_ID;
