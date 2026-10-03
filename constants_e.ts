
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

// --- Name Databases (British / Commonwealth names) ---
const UK_FIRST_NAMES = ['James', 'Oliver', 'Jack', 'Harry', 'George', 'Noah', 'Charlie', 'Jacob', 'Alfie', 'Thomas', 'Joshua', 'William', 'Ethan', 'Henry', 'Oscar', 'Archie', 'Leo', 'Lucas', 'Logan', 'Alex', 'Daniel', 'Matthew', 'Liam', 'Callum'];
const UK_LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Johnson',
  'Roberts', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Harris', 'Martin', 'Jackson', 'Clarke',
  'Lewis', 'Hall', 'Allen', 'Clark', 'Turner', 'Hill', 'Scott', 'Green', 'Adams', 'Baker',
  'Carter', 'Phillips', 'Mitchell', 'Murray', 'Bell', 'Cooper', 'Richardson', 'Cox', 'Ward', 'Hughes',
  'Edwards', 'Morris', 'Cook', 'Bailey', 'Wood', 'Watson', 'Brooks', 'Kelly', 'Bennett', 'Gray',
  'Campbell', 'Stewart', 'Robertson', 'Anderson', 'MacDonald', 'Reid', 'Miller', 'Moore', 'King', 'Morgan',
  'Young', 'James', 'Lee', 'Harrison', 'Griffiths', 'Price', 'Palmer', 'Powell', 'John', 'Ellis',
  'Richards', 'Hamilton', 'Stevens', 'Pearson', 'Lloyd', 'Perry', 'Matthews', 'Fletcher', 'Russell', 'Fowler',
  'Armstrong', 'Webster', 'Owen', 'Mason', 'Kennedy', 'Knight', 'Butler', 'Shaw', 'Dixon', 'Harvey',
  'Graham', 'Hunt', 'Mills', 'Barnes', 'Rogers', 'Cole', 'Fisher', 'Rose', 'Ford', 'Marshall',
  'Payne', 'Hudson', 'Dean', 'Reynolds', 'Simpson', 'Chapman', 'Stone', 'Porter', 'Andrews', 'Wells',
  'Hart', 'Newton', 'Spencer', 'Ferguson', 'Day', 'Gilbert', 'Ryan', 'Sullivan', 'Murphy', 'Walsh',
  'Byrne', 'Doyle', 'Gallagher', 'McCarthy', 'Lynch', 'Collins', 'Fitzgerald', 'Johnston', 'Duncan', 'Brady',
  'Stewart', 'Thomson', 'Henderson', 'Ross', 'Miller', 'Morrison', 'Cameron', 'Davidson', 'Fraser', 'Kerr',
  'Paterson', 'Watson', 'Gordon', 'Graham', 'Johnstone', 'Walker', 'Ferguson', 'Mitchell', 'McKenzie', 'Ritchie'
];

// --- Player Generator ---
const generatePlayer = (role: 'GK' | 'DEF' | 'MID' | 'FWD', baseRating: number, teamId: string, index: number): Player => {
  // Variance: +/- 6 from team base rating
  let rating = Math.floor(baseRating + (Math.random() * 12) - 6);
  
  // Hard cap for generated players to ensure they don't exceed real superstars (usually ~90+)
  // Reduced from 95 to 88 to keep "filler" players realistic
  if (rating > 88) rating = 88; 
  if (rating < 55) rating = 55;

  const age = Math.floor(17 + Math.random() * 6); // 17-23
  const fname = UK_FIRST_NAMES[Math.floor(Math.random() * UK_FIRST_NAMES.length)];
  const lname = UK_LAST_NAMES[Math.floor(Math.random() * UK_LAST_NAMES.length)];

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
  
  // Structure: 3 GK, 8 DEF, 8 MID, 7 FWD (26 man squad)
  
  // GK
  for(let i=0; i<3; i++) squad.push(generatePlayer('GK', genDef, teamId, i));
  // DEF
  for(let i=0; i<8; i++) squad.push(generatePlayer('DEF', genDef, teamId, i));
  // MID
  for(let i=0; i<8; i++) squad.push(generatePlayer('MID', genMid, teamId, i));
  // FWD
  for(let i=0; i<7; i++) squad.push(generatePlayer('FWD', genAtt, teamId, i));

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

// Named players are loaded from the 2024-25 snapshot
// (data/seasons/2024-25/premier-league.json and championship.json).
// Those lists were moved out of this file. They are not a new roster.
// Leicester, Ipswich and Southampton stay in the Premier League.
// Leeds, Burnley and Sunderland stay in the Championship.

export function buildPremierLeagueTeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  const premierLeague = loadLeague(seasonId, 'premier-league');
  return [
  createTeam('MCI', 'Man City', LeagueLevel.PREMIER_LEAGUE, 95, 94, 93, 'bg-sky-500', '⛵', roster(premierLeague, 'MCI')),
  createTeam('LIV', 'Liverpool', LeagueLevel.PREMIER_LEAGUE, 93, 91, 91, 'bg-red-600', '🦅', roster(premierLeague, 'LIV')),
  createTeam('ARS', 'Arsenal', LeagueLevel.PREMIER_LEAGUE, 93, 92, 92, 'bg-red-700', React.createElement(StripedLogo, { colors: ['#fff', '#EF0107', '#EF0107', '#fff'], vertical: true }), roster(premierLeague, 'ARS')),
  createTeam('CHE', 'Chelsea', LeagueLevel.PREMIER_LEAGUE, 91, 90, 88, 'bg-blue-600', '🦁', roster(premierLeague, 'CHE')),
  createTeam('NEW', 'Newcastle', LeagueLevel.PREMIER_LEAGUE, 89, 88, 87, 'bg-black text-white', '🏰', roster(premierLeague, 'NEW')),
  createTeam('AVL', 'Aston Villa', LeagueLevel.PREMIER_LEAGUE, 88, 87, 87, 'bg-claret-600 text-white', React.createElement(StripedLogo, { colors: ['#670e36', '#95bfe5'], vertical: true }), roster(premierLeague, 'AVL')),
  createTeam('TOT', 'Tottenham', LeagueLevel.PREMIER_LEAGUE, 88, 87, 86, 'bg-white', '🐓', roster(premierLeague, 'TOT')),
  createTeam('MUN', 'Man United', LeagueLevel.PREMIER_LEAGUE, 87, 86, 85, 'bg-red-700', '🔱', roster(premierLeague, 'MUN')),
  createTeam('BHA', 'Brighton', LeagueLevel.PREMIER_LEAGUE, 86, 86, 85, 'bg-blue-500 text-white', '🕊️', roster(premierLeague, 'BHA')),
  createTeam('WHU', 'West Ham', LeagueLevel.PREMIER_LEAGUE, 85, 85, 84, 'bg-red-900', '🔨', roster(premierLeague, 'WHU')),
  createTeam('CRY', 'Crystal Palace', LeagueLevel.PREMIER_LEAGUE, 84, 84, 84, 'bg-blue-600 text-red-600', React.createElement(StripedLogo, { colors: ['#1B458F', '#C4122E', '#1B458F', '#C4122E', '#1B458F'], vertical: true }), roster(premierLeague, 'CRY')),
  createTeam('NFO', 'Nottingham Forest', LeagueLevel.PREMIER_LEAGUE, 83, 83, 83, 'bg-red-700', '🌳', roster(premierLeague, 'NFO')),
  createTeam('BOU', 'Bournemouth', LeagueLevel.PREMIER_LEAGUE, 83, 83, 82, 'bg-red-800 text-black', '🍒', roster(premierLeague, 'BOU')),
  createTeam('BRE', 'Brentford', LeagueLevel.PREMIER_LEAGUE, 83, 82, 82, 'bg-red-600 text-white', '🐝', roster(premierLeague, 'BRE')),
  createTeam('WOL', 'Wolves', LeagueLevel.PREMIER_LEAGUE, 82, 82, 82, 'bg-yellow-600 text-black', '🐺', roster(premierLeague, 'WOL')),
  createTeam('FUL', 'Fulham', LeagueLevel.PREMIER_LEAGUE, 82, 82, 82, 'bg-white text-black', '🏠', roster(premierLeague, 'FUL')),
  createTeam('EVE', 'Everton', LeagueLevel.PREMIER_LEAGUE, 82, 81, 83, 'bg-blue-700', '🍬', roster(premierLeague, 'EVE')),
    createTeam('LEI', 'Leicester City', LeagueLevel.PREMIER_LEAGUE, 83, 82, 81, 'bg-blue-600', '🦊', roster(premierLeague, 'LEI')),
  createTeam('SOU', 'Southampton', LeagueLevel.PREMIER_LEAGUE, 82, 81, 80, 'bg-red-600 text-white', '😇', roster(premierLeague, 'SOU')),
    createTeam('IPS', 'Ipswich Town', LeagueLevel.PREMIER_LEAGUE, 80, 79, 79, 'bg-blue-500', '🚜', roster(premierLeague, 'IPS')),
];
}
export const PREMIER_LEAGUE_TEAMS: Team[] = buildPremierLeagueTeams();


export function buildChampionshipTeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  const championship = loadLeague(seasonId, 'championship');
  return [
  createTeam('BUR', 'Burnley', LeagueLevel.CHAMPIONSHIP, 84, 83, 84, 'bg-claret-500', '🍷', roster(championship, 'BUR')),
  createTeam('SHU', 'Sheffield United', LeagueLevel.CHAMPIONSHIP, 81, 80, 80, 'bg-red-600 text-white', '⚔️', roster(championship, 'SHU')),
  createTeam('LEE', 'Leeds United', LeagueLevel.CHAMPIONSHIP, 85, 84, 83, 'bg-white', '🦚', roster(championship, 'LEE')),
  createTeam('SUN', 'Sunderland', LeagueLevel.CHAMPIONSHIP, 83, 82, 81, 'bg-red-600 text-white', '🐈‍⬛', roster(championship, 'SUN')),
  createTeam('COV', 'Coventry City', LeagueLevel.CHAMPIONSHIP, 81, 81, 80, 'bg-sky-500', '🐘', roster(championship, 'COV')),
  createTeam('MID', 'Middlesbrough', LeagueLevel.CHAMPIONSHIP, 80, 80, 79, 'bg-red-600', '🦁', roster(championship, 'MID')),
  createTeam('WBA', 'West Brom', LeagueLevel.CHAMPIONSHIP, 80, 79, 80, 'bg-navy-800 text-white', '🐦', roster(championship, 'WBA')),
  createTeam('NOR', 'Norwich City', LeagueLevel.CHAMPIONSHIP, 79, 79, 78, 'bg-yellow-400 text-green-700', '🐤', roster(championship, 'NOR')),
  createTeam('HUL', 'Hull City', LeagueLevel.CHAMPIONSHIP, 78, 78, 78, 'bg-orange-500 text-black', '🐯', roster(championship, 'HUL')),
  createTeam('MIL', 'Millwall', LeagueLevel.CHAMPIONSHIP, 78, 77, 79, 'bg-blue-800', '🦁', roster(championship, 'MIL')),
  createTeam('SWA', 'Swansea City', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-white text-black', '🦢', roster(championship, 'SWA')),
  createTeam('QPR', 'Queens Park Rangers', LeagueLevel.CHAMPIONSHIP, 77, 77, 77, 'bg-blue-600 text-white', '💠', roster(championship, 'QPR')),
  createTeam('BIR', 'Birmingham City', LeagueLevel.CHAMPIONSHIP, 79, 76, 76, 'bg-blue-700', '🔵', roster(championship, 'BIR')),
  createTeam('BRC', 'Bristol City', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-red-700', '🐦', roster(championship, 'BRC')),
  createTeam('PLY', 'Plymouth Argyle', LeagueLevel.CHAMPIONSHIP, 76, 76, 76, 'bg-green-600 text-white', '🚢', roster(championship, 'PLY')),
  createTeam('STO', 'Stoke City', LeagueLevel.CHAMPIONSHIP, 77, 77, 77, 'bg-red-600 text-white', '🏺', roster(championship, 'STO')),
  createTeam('DER', 'Derby County', LeagueLevel.CHAMPIONSHIP, 77, 76, 77, 'bg-white text-black', '🐏', roster(championship, 'DER')),
  createTeam('SHW', 'Sheffield Wednesday', LeagueLevel.CHAMPIONSHIP, 78, 77, 77, 'bg-blue-600 text-white', '🦉', roster(championship, 'SHW')),
  createTeam('WAT', 'Watford', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-yellow-500 text-black', '🐝', roster(championship, 'WAT')),
  createTeam('BLA', 'Blackburn Rovers', LeagueLevel.CHAMPIONSHIP, 77, 77, 76, 'bg-blue-500 text-white', '🌹', roster(championship, 'BLA')),
  createTeam('OXF', 'Oxford United', LeagueLevel.CHAMPIONSHIP, 76, 76, 75, 'bg-yellow-600', '🐂', roster(championship, 'OXF')),
  createTeam('POR', 'Portsmouth', LeagueLevel.CHAMPIONSHIP, 77, 76, 76, 'bg-blue-600 text-white', '⚓', roster(championship, 'POR')),
  createTeam('LUT', 'Luton Town', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-orange-600', '🎩', roster(championship, 'LUT')),
  createTeam('PRE', 'Preston North End', LeagueLevel.CHAMPIONSHIP, 76, 76, 76, 'bg-white text-blue-600', '🐑', roster(championship, 'PRE'))
];
}
export const CHAMPIONSHIP_TEAMS: Team[] = buildChampionshipTeams();


export const ALL_TEAMS = [...PREMIER_LEAGUE_TEAMS, ...CHAMPIONSHIP_TEAMS];

export function buildAllTeams(seasonId: string = CURRENT_SEASON_ID): Team[] {
  return [...buildPremierLeagueTeams(seasonId), ...buildChampionshipTeams(seasonId)];
}
export const SEASON_ID = CURRENT_SEASON_ID;
