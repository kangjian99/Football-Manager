
import React from 'react';
import { Team, LeagueLevel, Player } from './types';
import { SERIE_A_TEAMS as BASE_SERIE_A, SERIE_B_TEAMS as BASE_SERIE_B } from './constants';

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

  const age = Math.floor(17 + Math.random() * 20); // 17-37
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

// --- EXTRA TEAMS TO REACH 24 FOR DEMONSTRATION ---
const EXTRA_TEAMS: Team[] = [
  createTeam('VIC', 'Vicenza', LeagueLevel.SERIE_B, 70, 69, 69, 'bg-red-600 text-white', '⚪', [
      { name: 'Franco Ferrari', position: 'FWD', rating: 71, age: 28 },
      { name: 'Filippo Costa', position: 'DEF', rating: 70, age: 28 },
      { name: 'Ronaldo', position: 'MID', rating: 71, age: 34 },
      { name: 'Alessandro Confente', position: 'GK', rating: 69, age: 25 }
  ]),
  createTeam('SPA', 'SPAL', LeagueLevel.SERIE_B, 69, 68, 68, 'bg-blue-300 text-white', '⚪', [
      { name: 'Mirco Antenucci', position: 'FWD', rating: 71, age: 39 },
      { name: 'Marco Bertini', position: 'MID', rating: 69, age: 21 },
      { name: 'Matteo Arena', position: 'DEF', rating: 69, age: 25 }
  ]),
  createTeam('PER', 'Perugia', LeagueLevel.SERIE_B, 68, 69, 69, 'bg-red-700 text-white', '🦁', [
      { name: 'Federico Ricci', position: 'FWD', rating: 70, age: 30 },
      { name: 'Edoardo Iannoni', position: 'MID', rating: 70, age: 22 },
      { name: 'Gabriele Angella', position: 'DEF', rating: 69, age: 35 }
  ]),
  createTeam('PAD', 'Padova', LeagueLevel.SERIE_B, 70, 69, 68, 'bg-white text-red-600', '🛡️', [
      { name: 'Micheal Liguori', position: 'FWD', rating: 71, age: 24 },
      { name: 'Simone Palombi', position: 'FWD', rating: 70, age: 28 },
      { name: 'Antonio Donnarumma', position: 'GK', rating: 69, age: 33 }
  ]),
];

export const SERIE_A_TEAMS = BASE_SERIE_A;
export const SERIE_B_TEAMS = [...BASE_SERIE_B, ...EXTRA_TEAMS];

export const ALL_TEAMS = [...SERIE_A_TEAMS, ...SERIE_B_TEAMS];
