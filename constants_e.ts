
import React from 'react';
import { Team, LeagueLevel, Player } from './types';

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
const UK_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Taylor', 'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Thompson', 'White', 'Harris', 'Martin', 'Jackson', 'Clarke', 'Lewis', 'Robinson', 'Hall', 'Clark', 'Turner', 'Hill'];

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

// --- PREMIER LEAGUE 2025/26 (as of November 2025) ---
// Promoted: Leeds United, Burnley, Sunderland
// Relegated last season: Leicester, Ipswich, Southampton

export const PREMIER_LEAGUE_TEAMS: Team[] = [
  createTeam('MCI', 'Man City', LeagueLevel.PREMIER_LEAGUE, 95, 94, 93, 'bg-sky-500', '⛵', [
    { name: 'Erling Haaland', position: 'FWD', rating: 94, age: 25 },
    { name: 'Phil Foden', position: 'MID', rating: 92, age: 25 },
    { name: 'Rodri', position: 'MID', rating: 93, age: 29 },
    { name: 'Kevin De Bruyne', position: 'MID', rating: 90, age: 34 },
    { name: 'Rúben Dias', position: 'DEF', rating: 91, age: 28 },
    { name: 'Josko Gvardiol', position: 'DEF', rating: 90, age: 23 },
    { name: 'Bernardo Silva', position: 'MID', rating: 90, age: 31 },
    { name: 'Ederson', position: 'GK', rating: 89, age: 32 },
    { name: 'Omar Marmoush', position: 'FWD', rating: 87, age: 26 },
    { name: 'Savinho', position: 'FWD', rating: 86, age: 21 },
    { name: 'Mateo Kovacic', position: 'MID', rating: 87, age: 31 },
    { name: 'John Stones', position: 'DEF', rating: 87, age: 31 },
    { name: 'Nathan Ake', position: 'DEF', rating: 86, age: 30 },
    { name: 'Ilkay Gundogan', position: 'MID', rating: 87, age: 35 },
    { name: 'Matheus Nunes', position: 'MID', rating: 85, age: 27 },
    { name: 'Jérémy Doku', position: 'FWD', rating: 87, age: 23 },
    { name: 'Jack Grealish', position: 'FWD', rating: 87, age: 30 }
  ]),
  createTeam('LIV', 'Liverpool', LeagueLevel.PREMIER_LEAGUE, 93, 91, 91, 'bg-red-600', '🦅', [
    { name: 'Mohamed Salah', position: 'FWD', rating: 92, age: 33 },
    { name: 'Virgil van Dijk', position: 'DEF', rating: 91, age: 34 },
    { name: 'Alisson', position: 'GK', rating: 90, age: 33 },
    { name: 'Trent Alexander-Arnold', position: 'DEF', rating: 90, age: 27 },
    { name: 'Conor Bradley', position: 'DEF', rating: 84, age: 22 },
    { name: 'Joe Gomez', position: 'DEF', rating: 82, age: 28 },
    { name: 'Luis Díaz', position: 'FWD', rating: 89, age: 28 },
    { name: 'Alexis Mac Allister', position: 'MID', rating: 89, age: 26 },
    { name: 'Wataru Endo', position: 'MID', rating: 82, age: 32 },
    { name: 'Darwin Núñez', position: 'FWD', rating: 85, age: 26 },
    { name: 'Federico Chiesa', position: 'FWD', rating: 82, age: 28 },
    { name: 'Cody Gakpo', position: 'FWD', rating: 87, age: 26 },
    { name: 'Ibrahima Konaté', position: 'DEF', rating: 88, age: 26 },
    { name: 'Dominik Szoboszlai', position: 'MID', rating: 88, age: 25 },
    { name: 'Andrew Robertson', position: 'DEF', rating: 87, age: 31 },
    { name: 'Ryan Gravenberch', position: 'MID', rating: 86, age: 23 },
    { name: 'Caoimhin Kelleher', position: 'GK', rating: 84, age: 27 },
    { name: 'Curtis Jones', position: 'MID', rating: 84, age: 24 }
  ]),
  createTeam('ARS', 'Arsenal', LeagueLevel.PREMIER_LEAGUE, 93, 92, 92, 'bg-red-700', React.createElement(StripedLogo, { colors: ['#fff', '#EF0107', '#EF0107', '#fff'], vertical: true }), [
    { name: 'Bukayo Saka', position: 'FWD', rating: 92, age: 24 },
    { name: 'Martin Ødegaard', position: 'MID', rating: 91, age: 26 },
    { name: 'Declan Rice', position: 'MID', rating: 91, age: 26 },
    { name: 'William Saliba', position: 'DEF', rating: 91, age: 24 },
    { name: 'Gabriel Magalhães', position: 'DEF', rating: 90, age: 27 },
    { name: 'Ben White', position: 'DEF', rating: 88, age: 28 },
    { name: 'Gabriel Martinelli', position: 'FWD', rating: 88, age: 24 },
    { name: 'David Raya', position: 'GK', rating: 88, age: 30 },
    { name: 'Kai Havertz', position: 'FWD', rating: 88, age: 26 },
    { name: 'Jurrien Timber', position: 'DEF', rating: 87, age: 24 },
    { name: 'Leandro Trossard', position: 'FWD', rating: 87, age: 30 },
    { name: 'Thomas Partey', position: 'MID', rating: 86, age: 32 },
    { name: 'Gabriel Jesus', position: 'FWD', rating: 86, age: 28 },
    { name: 'Riccardo Calafiori', position: 'DEF', rating: 86, age: 23 },
    { name: 'Mikel Merino', position: 'MID', rating: 86, age: 29 }
  ]),
  createTeam('CHE', 'Chelsea', LeagueLevel.PREMIER_LEAGUE, 91, 90, 88, 'bg-blue-600', '🦁', [
    { name: 'Cole Palmer', position: 'MID', rating: 91, age: 23 },
    { name: 'Enzo Fernández', position: 'MID', rating: 89, age: 24 },
    { name: 'Moises Caicedo', position: 'MID', rating: 88, age: 24 },
    { name: 'Reece James', position: 'DEF', rating: 88, age: 25 },
    { name: 'Nicolas Jackson', position: 'FWD', rating: 85, age: 24 },
    { name: 'Pedro Neto', position: 'FWD', rating: 87, age: 25 },
    { name: 'Levi Colwill', position: 'DEF', rating: 87, age: 22 },
    { name: 'Christopher Nkunku', position: 'FWD', rating: 86, age: 27 },
    { name: 'Wesley Fofana', position: 'DEF', rating: 86, age: 24 },
    { name: 'Malo Gusto', position: 'DEF', rating: 85, age: 22 },
    { name: 'Romeo Lavia', position: 'MID', rating: 84, age: 21 },
    { name: 'Marc Cucurella', position: 'DEF', rating: 87, age: 27 },
    { name: 'Jadon Sancho', position: 'FWD', rating: 85, age: 25 },
    { name: 'Noni Madueke', position: 'FWD', rating: 85, age: 23 },
    { name: 'Robert Sánchez', position: 'GK', rating: 84, age: 27 }
  ]),
  createTeam('NEW', 'Newcastle', LeagueLevel.PREMIER_LEAGUE, 89, 88, 87, 'bg-black text-white', '🏰', [
    { name: 'Alexander Isak', position: 'FWD', rating: 90, age: 26 },
    { name: 'Bruno Guimarães', position: 'MID', rating: 90, age: 28 },
    { name: 'Anthony Gordon', position: 'FWD', rating: 88, age: 24 },
    { name: 'Sven Botman', position: 'DEF', rating: 88, age: 25 },
    { name: 'Valentino Livramento', position: 'DEF', rating: 87, age: 22 },
    { name: 'Sandro Tonali', position: 'MID', rating: 87, age: 25 },
    { name: 'Joelinton', position: 'MID', rating: 86, age: 29 },
    { name: 'Nick Pope', position: 'GK', rating: 86, age: 33 },
    { name: 'Harvey Barnes', position: 'FWD', rating: 85, age: 27 },
    { name: 'Dan Burn', position: 'DEF', rating: 84, age: 33 },
    { name: 'Sean Longstaff', position: 'MID', rating: 84, age: 28 },
    { name: 'Lewis Hall', position: 'DEF', rating: 84, age: 21 },
    { name: 'Miguel Almirón', position: 'FWD', rating: 84, age: 31 }
  ]),
  createTeam('AVL', 'Aston Villa', LeagueLevel.PREMIER_LEAGUE, 88, 87, 87, 'bg-claret-600 text-white', React.createElement(StripedLogo, { colors: ['#670e36', '#95bfe5'], vertical: true }), [
    { name: 'Ollie Watkins', position: 'FWD', rating: 88, age: 29 },
    { name: 'Emiliano Martínez', position: 'GK', rating: 89, age: 33 },
    { name: 'Ezri Konsa', position: 'DEF', rating: 86, age: 28 },
    { name: 'Youri Tielemans', position: 'MID', rating: 86, age: 28 },
    { name: 'Morgan Rogers', position: 'MID', rating: 86, age: 23 },
    { name: 'John McGinn', position: 'MID', rating: 85, age: 31 },
    { name: 'Ross Barkley', position: 'MID', rating: 80, age: 31 },
    { name: 'Pau Torres', position: 'DEF', rating: 86, age: 28 },
    { name: 'Leon Bailey', position: 'FWD', rating: 85, age: 28 },
    { name: 'Diego Carlos', position: 'DEF', rating: 84, age: 32 },
    { name: 'Jacob Ramsey', position: 'MID', rating: 84, age: 24 },
    { name: 'Amadou Onana', position: 'MID', rating: 82, age: 24 },
    { name: 'Tyrone Mings', position: 'DEF', rating: 84, age: 32 },
    { name: 'Jhon Durán', position: 'FWD', rating: 84, age: 21 }
  ]),
  createTeam('TOT', 'Tottenham', LeagueLevel.PREMIER_LEAGUE, 88, 87, 86, 'bg-white', '🐓', [
    { name: 'Son Heung-min', position: 'FWD', rating: 89, age: 33 },
    { name: 'James Maddison', position: 'MID', rating: 88, age: 28 },
    { name: 'Pedro Porro', position: 'DEF', rating: 87, age: 26 },
    { name: 'Micky van de Ven', position: 'DEF', rating: 87, age: 24 },
    { name: 'Dominic Solanke', position: 'FWD', rating: 85, age: 28 },
    { name: 'Yves Bissouma', position: 'MID', rating: 84, age: 29 },
    { name: 'Cristian Romero', position: 'DEF', rating: 87, age: 27 },
    { name: 'Dejan Kulusevski', position: 'MID', rating: 85, age: 25 },
    { name: 'Rodrigo Bentancur', position: 'MID', rating: 86, age: 28 },
    { name: 'Guglielmo Vicario', position: 'GK', rating: 86, age: 29 },
    { name: 'Brennan Johnson', position: 'FWD', rating: 85, age: 24 },
    { name: 'Destiny Udogie', position: 'DEF', rating: 83, age: 22 },
    { name: 'Richarlison', position: 'FWD', rating: 86, age: 28 },
    { name: 'Wilson Odobert', position: 'FWD', rating: 82, age: 21 },
    { name: 'Pape Matar Sarr', position: 'MID', rating: 85, age: 23 },
    { name: 'João Palhinha', position: 'MID', rating: 85, age: 30 },
  ]),
  createTeam('MUN', 'Man United', LeagueLevel.PREMIER_LEAGUE, 87, 86, 85, 'bg-red-700', '🔱', [
    { name: 'Bruno Fernandes', position: 'MID', rating: 89, age: 31 },
    { name: 'Rasmus Højlund', position: 'FWD', rating: 84, age: 22 },
    { name: 'Lisandro Martínez', position: 'DEF', rating: 85, age: 27 },
    { name: 'Matthijs de Ligt', position: 'DEF', rating: 84, age: 26 },
    { name: 'Alejandro Garnacho', position: 'FWD', rating: 85, age: 21 },
    { name: 'Marcus Rashford', position: 'FWD', rating: 86, age: 28 },
    { name: 'Kobbie Mainoo', position: 'MID', rating: 83, age: 20 },
    { name: 'Diogo Dalot', position: 'DEF', rating: 85, age: 26 },
    { name: 'André Onana', position: 'GK', rating: 83, age: 29 },
    { name: 'Mason Mount', position: 'MID', rating: 85, age: 26 },
    { name: 'Casemiro', position: 'MID', rating: 84, age: 33 },
    { name: 'Manuel Ugarte', position: 'MID', rating: 83, age: 24 },
    { name: 'Harry Maguire', position: 'DEF', rating: 84, age: 32 },
    { name: 'Joshua Zirkzee', position: 'FWD', rating: 82, age: 24 },
    { name: 'Noussair Mazraoui', position: 'DEF', rating: 84, age: 28 },
    { name: 'Patrick Dorgu', position: 'DEF', rating: 80, age: 21 },
    { name: 'Leny Yoro', position: 'DEF', rating: 81, age: 20 }
  ]),
  createTeam('BHA', 'Brighton', LeagueLevel.PREMIER_LEAGUE, 86, 86, 85, 'bg-blue-500 text-white', '🕊️', [
    { name: 'Kaoru Mitoma', position: 'MID', rating: 86, age: 28 },
    { name: 'João Pedro', position: 'FWD', rating: 87, age: 24 },
    { name: 'Danny Welbeck', position: 'FWD', rating: 84, age: 34 },
    { name: 'Evan Ferguson', position: 'FWD', rating: 82, age: 21 },
    { name: 'Lewis Dunk', position: 'DEF', rating: 85, age: 34 },
    { name: 'Solly March', position: 'MID', rating: 81, age: 31 },
    { name: 'Pervis Estupiñán', position: 'DEF', rating: 83, age: 27 },
    { name: 'Jan Paul van Hecke', position: 'DEF', rating: 82, age: 25 },
    { name: 'Jason Steele', position: 'GK', rating: 83, age: 35 },
    { name: 'Yankuba Minteh', position: 'MID', rating: 84, age: 21 },
    { name: 'James Milner', position: 'MID', rating: 83, age: 39 },
    { name: 'Adam Webster', position: 'DEF', rating: 83, age: 30 },
    { name: 'Carlos Baleba', position: 'MID', rating: 84, age: 21 },
    { name: 'Georginio Rutter', position: 'FWD', rating: 83, age: 23 },
    { name: 'Yasin Ayari', position: 'MID', rating: 81, age: 22 },
    { name: 'Jack Hinshelwood', position: 'MID', rating: 80, age: 20 }
  ]),
  createTeam('WHU', 'West Ham', LeagueLevel.PREMIER_LEAGUE, 85, 85, 84, 'bg-red-900', '🔨', [
    { name: 'Jarrod Bowen', position: 'FWD', rating: 87, age: 28 },
    { name: 'Mohammed Kudus', position: 'MID', rating: 87, age: 25 },
    { name: 'Lucas Paquetá', position: 'MID', rating: 86, age: 28 },
    { name: 'Edson Álvarez', position: 'MID', rating: 85, age: 28 },
    { name: 'Maximilian Kilman', position: 'DEF', rating: 84, age: 28 },
    { name: 'Alphonse Areola', position: 'GK', rating: 84, age: 32 },
    { name: 'Aaron Wan-Bissaka', position: 'DEF', rating: 84, age: 27 },
    { name: 'Michail Antonio', position: 'FWD', rating: 83, age: 35 },
    { name: 'Maxwel Cornet', position: 'FWD', rating: 82, age: 29 },
    { name: 'Konstantinos Mavropanos', position: 'DEF', rating: 82, age: 27 },
    { name: 'Jean-Clair Todibo', position: 'DEF', rating: 83, age: 25 },
    { name: 'Guido Rodríguez', position: 'MID', rating: 83, age: 31 },
    { name: 'Crysencio Summerville', position: 'FWD', rating: 84, age: 24 }
  ]),
  createTeam('CRY', 'Crystal Palace', LeagueLevel.PREMIER_LEAGUE, 84, 84, 84, 'bg-blue-600 text-red-600', React.createElement(StripedLogo, { colors: ['#1B458F', '#C4122E', '#1B458F', '#C4122E', '#1B458F'], vertical: true }), [
    { name: 'Eberechi Eze', position: 'FWD', rating: 87, age: 27 },
    { name: 'Marc Guéhi', position: 'DEF', rating: 86, age: 25 },
    { name: 'Adam Wharton', position: 'MID', rating: 83, age: 21 },
    { name: 'Jean-Philippe Mateta', position: 'FWD', rating: 86, age: 28 },
    { name: 'Dean Henderson', position: 'GK', rating: 84, age: 28 },
    { name: 'Tyrick Mitchell', position: 'DEF', rating: 83, age: 26 },
    { name: 'Will Hughes', position: 'MID', rating: 80, age: 30 },
    { name: 'Cheick Doucouré', position: 'MID', rating: 82, age: 25 },
    { name: 'Daichi Kamada', position: 'MID', rating: 85, age: 29 },
    { name: 'Chris Richards', position: 'DEF', rating: 82, age: 25 },
    { name: 'Jefferson Lerma', position: 'MID', rating: 83, age: 31 },
    { name: 'Ismaïla Sarr', position: 'FWD', rating: 86, age: 27 },
    { name: 'Eddie Nketiah', position: 'FWD', rating: 84, age: 26 },
    { name: 'Daniel Muñoz', position: 'DEF', rating: 84, age: 29 }
  ]),
  createTeam('NFO', 'Nottingham Forest', LeagueLevel.PREMIER_LEAGUE, 83, 83, 83, 'bg-red-700', '🌳', [
    { name: 'Morgan Gibbs-White', position: 'MID', rating: 85, age: 25 },
    { name: 'Anthony Elanga', position: 'FWD', rating: 84, age: 23 },
    { name: 'Murillo', position: 'DEF', rating: 84, age: 23 },
    { name: 'Chris Wood', position: 'FWD', rating: 83, age: 33 },
    { name: 'Callum Hudson-Odoi', position: 'FWD', rating: 83, age: 25 },
    { name: 'Matz Sels', position: 'GK', rating: 83, age: 33 },
    { name: 'Nikola Milenković', position: 'DEF', rating: 83, age: 28 },
    { name: 'Ibrahim Sangaré', position: 'MID', rating: 82, age: 27 },
    { name: 'Taiwo Awoniyi', position: 'FWD', rating: 82, age: 28 },
    { name: 'Danilo', position: 'MID', rating: 81, age: 24 },
    { name: 'Neco Williams', position: 'DEF', rating: 81, age: 24 },
    { name: 'Elliot Anderson', position: 'MID', rating: 81, age: 23 }
  ]),
  createTeam('BOU', 'Bournemouth', LeagueLevel.PREMIER_LEAGUE, 83, 83, 82, 'bg-red-800 text-black', '🍒', [
    { name: 'Marcus Tavernier', position: 'MID', rating: 82, age: 26 },
    { name: 'David Brooks', position: 'MID', rating: 82, age: 28 },
    { name: 'Antoine Semenyo', position: 'FWD', rating: 84, age: 25 },
    { name: 'Justin Kluivert', position: 'FWD', rating: 83, age: 26 },
    { name: 'Milos Kerkez', position: 'DEF', rating: 83, age: 22 },
    { name: 'Illia Zabarnyi', position: 'DEF', rating: 83, age: 23 },
    { name: 'Lewis Cook', position: 'MID', rating: 81, age: 28 },
    { name: 'Tyler Adams', position: 'MID', rating: 83, age: 26 },
    { name: 'Neto', position: 'GK', rating: 82, age: 36 },
    { name: 'Dango Ouattara', position: 'FWD', rating: 81, age: 23 },
    { name: 'Enes Ünal', position: 'FWD', rating: 79, age: 28 },
    { name: 'Marcos Senesi', position: 'DEF', rating: 82, age: 28 },
    { name: 'Alex Scott', position: 'MID', rating: 82, age: 22 },
    { name: 'Ryan Christie', position: 'MID', rating: 81, age: 30 },
    { name: 'Evanilson', position: 'FWD', rating: 83, age: 26 }
  ]),
  createTeam('BRE', 'Brentford', LeagueLevel.PREMIER_LEAGUE, 83, 82, 82, 'bg-red-600 text-white', '🐝', [
    { name: 'Igor Thiago', position: 'FWD', rating: 82, age: 24 },
    { name: 'Bryan Mbeumo', position: 'FWD', rating: 86, age: 26 },
    { name: 'Yoane Wissa', position: 'FWD', rating: 84, age: 29 },
    { name: 'Christian Nørgaard', position: 'MID', rating: 83, age: 31 },
    { name: 'Mikkel Damsgaard', position: 'MID', rating: 84, age: 25 },
    { name: 'Aaron Hickey', position: 'DEF', rating: 80, age: 23 },
    { name: 'Rico Henry', position: 'DEF', rating: 81, age: 28 },
    { name: 'Nathan Collins', position: 'DEF', rating: 82, age: 24 },
    { name: 'Mark Flekken', position: 'GK', rating: 82, age: 32 },
    { name: 'Mathias Jensen', position: 'MID', rating: 82, age: 29 },
    { name: 'Vitaly Janelt', position: 'MID', rating: 82, age: 27 },
    { name: 'Ben Mee', position: 'DEF', rating: 81, age: 36 },
    { name: 'Kevin Schade', position: 'FWD', rating: 81, age: 23 },
    { name: 'Michael Kayode', position: 'DEF', rating: 81, age: 21 },
    { name: 'Ethan Pinnock', position: 'DEF', rating: 81, age: 32 }
  ]),
  createTeam('WOL', 'Wolves', LeagueLevel.PREMIER_LEAGUE, 82, 82, 82, 'bg-yellow-600 text-black', '🐺', [
    { name: 'Matheus Cunha', position: 'FWD', rating: 85, age: 26 },
    { name: 'Hwang Hee-chan', position: 'FWD', rating: 84, age: 29 },
    { name: 'Jørgen Strand Larsen', position: 'FWD', rating: 84, age: 25 },
    { name: 'João Gomes', position: 'MID', rating: 84, age: 24 },
    { name: 'José Sá', position: 'GK', rating: 83, age: 32 },
    { name: 'Nélson Semedo', position: 'DEF', rating: 82, age: 32 },
    { name: 'Mario Lemina', position: 'MID', rating: 82, age: 32 },
    { name: 'Craig Dawson', position: 'DEF', rating: 80, age: 35 },
    { name: 'Rayán Aït-Nouri', position: 'DEF', rating: 83, age: 24 },
    { name: 'Toti Gomes', position: 'DEF', rating: 82, age: 26 },
    { name: 'Matt Doherty', position: 'DEF', rating: 81, age: 33 },
    { name: 'Pablo Sarabia', position: 'MID', rating: 81, age: 33 },
    { name: 'Jean-Ricner Bellegarde', position: 'MID', rating: 80, age: 27 }
  ]),
  createTeam('FUL', 'Fulham', LeagueLevel.PREMIER_LEAGUE, 82, 82, 82, 'bg-white text-black', '🏠', [
    { name: 'Andreas Pereira', position: 'MID', rating: 83, age: 29 },
    { name: 'Ryan Sessegnon', position: 'DEF', rating: 83, age: 25 },
    { name: 'Raul Jimenez', position: 'FWD', rating: 82, age: 34 },
    { name: 'Antonee Robinson', position: 'DEF', rating: 82, age: 28 },
    { name: 'Joachim Andersen', position: 'DEF', rating: 83, age: 29 },
    { name: 'Bernd Leno', position: 'GK', rating: 83, age: 33 },
    { name: 'Calvin Bassey', position: 'DEF', rating: 82, age: 25 },
    { name: 'Issa Diop', position: 'DEF', rating: 82, age: 28 },
    { name: 'Tosin Adarabioyo', position: 'DEF', rating: 82, age: 28 },
    { name: 'Alex Iwobi', position: 'MID', rating: 84, age: 29 },
    { name: 'Tom Cairney', position: 'MID', rating: 81, age: 34 },
    { name: 'Sasa Lukic', position: 'MID', rating: 81, age: 29 },
    { name: 'Sander Berge', position: 'MID', rating: 82, age: 27 },
    { name: 'Harry Wilson', position: 'FWD', rating: 83, age: 28 },
    { name: 'Harrison Reed', position: 'MID', rating: 81, age: 30 },
    { name: 'Smith Rowe', position: 'MID', rating: 83, age: 25 },
    { name: 'Rodrigo Muniz', position: 'FWD', rating: 81, age: 24 },
    { name: 'Adama Traore', position: 'FWD', rating: 81, age: 29 },
    { name: 'Timothy Castagne', position: 'DEF', rating: 81, age: 29 }
  ]),
  createTeam('EVE', 'Everton', LeagueLevel.PREMIER_LEAGUE, 82, 81, 83, 'bg-blue-700', '🍬', [
    { name: 'Dominic Calvert-Lewin', position: 'FWD', rating: 83, age: 28 },
    { name: 'Jordan Pickford', position: 'GK', rating: 85, age: 31 },
    { name: 'James Tarkowski', position: 'DEF', rating: 83, age: 32 },
    { name: 'Dwight McNeil', position: 'MID', rating: 82, age: 25 },
    { name: 'Vitaliy Mykolenko', position: 'DEF', rating: 82, age: 26 },
    { name: 'Jarrad Branthwaite', position: 'DEF', rating: 83, age: 23 },
    { name: 'Abdoulaye Doucouré', position: 'MID', rating: 81, age: 32 },
    { name: 'Tim Iroegbunam', position: 'MID', rating: 80, age: 22 },
    { name: 'Jack Harrison', position: 'FWD', rating: 81, age: 28 },
    { name: 'Ilman Ndiaye', position: 'FWD', rating: 82, age: 25 },
    { name: 'Beto', position: 'FWD', rating: 81, age: 27 },
    { name: 'Idrissa Gueye', position: 'MID', rating: 80, age: 36 },
    { name: 'James Garner', position: 'MID', rating: 80, age: 24 }
  ]),
    createTeam('LEI', 'Leicester City', LeagueLevel.PREMIER_LEAGUE, 83, 82, 81, 'bg-blue-600', '🦊', [
    { name: 'Jamie Vardy', position: 'FWD', rating: 81, age: 38 },
    { name: 'Mads Hermansen', position: 'GK', rating: 82, age: 25 },
    { name: 'Wilfred Ndidi', position: 'MID', rating: 83, age: 28 },
    { name: 'Abdul Fatawu', position: 'FWD', rating: 81, age: 21 },
    { name: 'Harry Winks', position: 'MID', rating: 82, age: 29 },
    { name: 'Facundo Buonanotte', position: 'MID', rating: 81, age: 20 },
    { name: 'Victor Kristiansen', position: 'DEF', rating: 80, age: 22 },
    { name: 'Wout Faes', position: 'DEF', rating: 80, age: 27 },
    { name: 'Stephy Mavididi', position: 'FWD', rating: 80, age: 27 },
    { name: 'Patson Daka', position: 'FWD', rating: 79, age: 27 },
    { name: 'Caleb Okoli', position: 'DEF', rating: 79, age: 24 },
    { name: 'Jordan Ayew', position: 'FWD', rating: 79, age: 34 },
    { name: 'Oliver Skipp', position: 'MID', rating: 79, age: 25 }
  ]),
  createTeam('BUR', 'Burnley', LeagueLevel.PREMIER_LEAGUE, 84, 83, 84, 'bg-claret-500', '🍷', [ // Promoted
    { name: 'James Trafford', position: 'GK', rating: 85, age: 23 },
    { name: 'Josh Brownhill', position: 'MID', rating: 83, age: 29 },
    { name: 'Luca Koleosho', position: 'FWD', rating: 80, age: 21 },
    { name: 'Dara O\'Shea', position: 'DEF', rating: 82, age: 26 },
    { name: 'Connor Roberts', position: 'DEF', rating: 81, age: 30 },
    { name: 'Jordan Beyer', position: 'DEF', rating: 81, age: 25 },
    { name: 'Han-Noah Massengo', position: 'MID', rating: 78, age: 24 },
    { name: 'Josh Laurent', position: 'MID', rating: 80, age: 30 },
    { name: 'Jaidon Anthony', position: 'FWD', rating: 81, age: 25 },
    { name: 'Mike Trésor', position: 'FWD', rating: 77, age: 26 },
    { name: 'Josh Cullen', position: 'MID', rating: 80, age: 29 },
    { name: 'Hannibal Mejbri', position: 'MID', rating: 79, age: 22 },
    { name: 'Zian Flemming', position: 'FWD', rating: 81, age: 27 },
    { name: 'Marcus Edwards', position: 'FWD', rating: 78, age: 26 },
    { name: 'Nathan Redmond', position: 'MID', rating: 79, age: 31 }
  ]),
  createTeam('IPS', 'Ipswich Town', LeagueLevel.PREMIER_LEAGUE, 80, 79, 79, 'bg-blue-500', '🚜', [
    { name: 'Leif Davis', position: 'DEF', rating: 81, age: 25 },
    { name: 'Sam Morsy', position: 'MID', rating: 80, age: 34 },
    { name: 'Omari Hutchinson', position: 'MID', rating: 80, age: 22 },
    { name: 'Arijanet Muric', position: 'GK', rating: 79, age: 27 },
    { name: 'Liam Delap', position: 'FWD', rating: 80, age: 22 },
    { name: 'Conor Chaplin', position: 'FWD', rating: 79, age: 28 },
    { name: 'Wes Burns', position: 'FWD', rating: 77, age: 30 },
    { name: 'Luke Woolfenden', position: 'DEF', rating: 78, age: 27 },
    { name: 'Massimo Luongo', position: 'MID', rating: 78, age: 33 },
    { name: 'Cameron Burgess', position: 'DEF', rating: 77, age: 30 },
    { name: 'Nathan Broadhead', position: 'FWD', rating: 77, age: 27 },
    { name: 'Kalvin Phillips', position: 'MID', rating: 78, age: 29 },
    { name: 'Sammie Szmodics', position: 'FWD', rating: 79, age: 30 },
    { name: 'Jaden Philogene', position: 'FWD', rating: 80, age: 23 },
    { name: 'George Hirst', position: 'FWD', rating: 79, age: 26 },
    { name: 'Jack Taylor', position: 'MID', rating: 77, age: 27 }
  ]),
];

export const CHAMPIONSHIP_TEAMS: Team[] = [
  createTeam('SHU', 'Sheffield United', LeagueLevel.CHAMPIONSHIP, 81, 80, 80, 'bg-red-600 text-white', '⚔️', [
    { name: 'Anel Ahmedhodzic', position: 'DEF', rating: 81, age: 26 },
    { name: 'Vini Souza', position: 'MID', rating: 81, age: 26 },
    { name: 'Gustavo Hamer', position: 'MID', rating: 82, age: 28 },
    { name: 'Ollie Arblaster', position: 'MID', rating: 80, age: 21 },
    { name: 'Rhian Brewster', position: 'FWD', rating: 79, age: 25 },
    { name: 'Ben Brereton Diaz', position: 'FWD', rating: 80, age: 26 },
    { name: 'Jack Robinson', position: 'DEF', rating: 79, age: 32 },
    { name: 'Wes Foderingham', position: 'GK', rating: 79, age: 34 },
    { name: 'Sydie Peck', position: 'MID', rating: 78, age: 21 },
    { name: 'Andre Brooks', position: 'MID', rating: 78, age: 22 },
    { name: 'Jamie Shackleton', position: 'MID', rating: 78, age: 26 },
    { name: 'Kieffer Moore', position: 'FWD', rating: 78, age: 33 }
  ]),
  createTeam('LEE', 'Leeds United', LeagueLevel.CHAMPIONSHIP, 85, 84, 83, 'bg-white', '🦚', [ // Promoted
    { name: 'Daniel James', position: 'MID', rating: 83, age: 27 },
    { name: 'Wilfried Gnonto', position: 'FWD', rating: 84, age: 22 },
    { name: 'Patrick Bamford', position: 'FWD', rating: 80, age: 32 },
    { name: 'Joël Piroe', position: 'FWD', rating: 85, age: 26 },
    { name: 'Ethan Ampadu', position: 'MID', rating: 84, age: 25 },
    { name: 'Pascal Struijk', position: 'DEF', rating: 81, age: 26 },
    { name: 'Jayden Bogle', position: 'DEF', rating: 83, age: 25 },
    { name: 'Sam Byram', position: 'DEF', rating: 81, age: 32 },
    { name: 'Illia Gruev', position: 'MID', rating: 79, age: 25 },
    { name: 'Joe Rodon', position: 'DEF', rating: 82, age: 28 },
    { name: 'Brenden Aaronson', position: 'MID', rating: 82, age: 25 },
    { name: 'Junior Firpo', position: 'DEF', rating: 81, age: 29 },
    { name: 'Manor Solomon', position: 'FWD', rating: 81, age: 26 },
    { name: 'Josko Mesic', position: 'GK', rating: 81, age: 25 },
    { name: 'Ao Tanaka', position: 'MID', rating: 81, age: 27 },
    { name: 'Max Wöber', position: 'DEF', rating: 79, age: 27 }
  ]),
  createTeam('SUN', 'Sunderland', LeagueLevel.CHAMPIONSHIP, 83, 82, 81, 'bg-red-600 text-white', '🐈‍⬛', [ // Promoted
    { name: 'Jack Clarke', position: 'FWD', rating: 84, age: 25 },
    { name: 'Dan Neil', position: 'MID', rating: 83, age: 24 },
    { name: 'Jobe Bellingham', position: 'MID', rating: 82, age: 20 },
    { name: 'Anthony Patterson', position: 'GK', rating: 82, age: 25 },
    { name: 'Trai Hume', position: 'DEF', rating: 81, age: 23 },
    { name: 'Daniel Ballard', position: 'DEF', rating: 81, age: 26 },
    { name: 'Pierre Ekwah', position: 'MID', rating: 80, age: 23 },
    { name: 'Chris Rigg', position: 'MID', rating: 80, age: 18 },
    { name: 'Aaron Connolly', position: 'FWD', rating: 79, age: 25 },
    { name: 'Aji Alese', position: 'DEF', rating: 79, age: 24 },
    { name: 'Patrick Roberts', position: 'FWD', rating: 80, age: 28 },
    { name: 'Bradley Dack', position: 'MID', rating: 78, age: 31 }
  ]),
  createTeam('SOU', 'Southampton', LeagueLevel.CHAMPIONSHIP, 82, 81, 80, 'bg-red-600 text-white', '😇', [
    { name: 'Adam Armstrong', position: 'FWD', rating: 81, age: 28 },
    { name: 'Taylor Harwood-Bellis', position: 'DEF', rating: 81, age: 23 },
    { name: 'Kyle Walker-Peters', position: 'DEF', rating: 81, age: 28 },
    { name: 'Gavin Bazunu', position: 'GK', rating: 80, age: 23 },
    { name: 'Will Smallbone', position: 'MID', rating: 80, age: 25 },
    { name: 'Flynn Downes', position: 'MID', rating: 80, age: 26 },
    { name: 'Kamaldeen Sulemana', position: 'FWD', rating: 80, age: 23 },
    { name: 'Joe Aribo', position: 'MID', rating: 79, age: 29 },
    { name: 'Jan Bednarek', position: 'DEF', rating: 79, age: 29 },
    { name: 'Ryan Fraser', position: 'FWD', rating: 78, age: 31 },
    { name: 'Jack Stephens', position: 'DEF', rating: 78, age: 31 },
    { name: 'Mateusz Lis', position: 'GK', rating: 77, age: 28 }
  ]),
  createTeam('COV', 'Coventry City', LeagueLevel.CHAMPIONSHIP, 81, 81, 80, 'bg-sky-500', '🐘', [
    { name: 'Haji Wright', position: 'FWD', rating: 81, age: 27 },
    { name: 'Ellis Simms', position: 'FWD', rating: 80, age: 24 },
    { name: 'Ben Sheaf', position: 'MID', rating: 77, age: 27 },
    { name: 'Milan van Ewijk', position: 'DEF', rating: 80, age: 25 },
    { name: 'Josh Eccles', position: 'MID', rating: 78, age: 25 },
    { name: 'Callum O\'Hare', position: 'MID', rating: 81, age: 27 },
    { name: 'Bobby Thomas', position: 'DEF', rating: 79, age: 24 },
    { name: 'Brad Collins', position: 'GK', rating: 78, age: 28 },
    { name: 'Joel Latibeaudiere', position: 'DEF', rating: 78, age: 25 },
    { name: 'Tatsuhiro Sakamoto', position: 'MID', rating: 79, age: 29 },
    { name: 'Jamie Allen', position: 'MID', rating: 77, age: 30 }
  ]),
  createTeam('MID', 'Middlesbrough', LeagueLevel.CHAMPIONSHIP, 80, 80, 79, 'bg-red-600', '🦁', [
    { name: 'Tommy Conway', position: 'FWD', rating: 81, age: 23 },
    { name: 'Hayden Hackney', position: 'MID', rating: 81, age: 23 },
    { name: 'Finn Azaz', position: 'MID', rating: 80, age: 25 },
    { name: 'Rav van den Berg', position: 'DEF', rating: 80, age: 21 },
    { name: 'Matt Clarke', position: 'DEF', rating: 79, age: 29 },
    { name: 'Isaiah Jones', position: 'FWD', rating: 79, age: 26 },
    { name: 'Delano Burgzorg', position: 'FWD', rating: 79, age: 27 },
    { name: 'Seny Dieng', position: 'GK', rating: 79, age: 31 },
    { name: 'Jonny Howson', position: 'MID', rating: 78, age: 37 },
    { name: 'Lukas Engel', position: 'DEF', rating: 78, age: 27 },
    { name: 'George Edmundson', position: 'DEF', rating: 78, age: 28 }
  ]),
  createTeam('WBA', 'West Brom', LeagueLevel.CHAMPIONSHIP, 80, 79, 80, 'bg-navy-800 text-white', '🐦', [
    { name: 'Josh Maja', position: 'FWD', rating: 80, age: 26 },
    { name: 'Jayson Molumby', position: 'MID', rating: 79, age: 26 },
    { name: 'Alex Mowatt', position: 'MID', rating: 79, age: 30 },
    { name: 'Darnell Furlong', position: 'DEF', rating: 79, age: 30 },
    { name: 'Kyle Bartley', position: 'DEF', rating: 78, age: 34 },
    { name: 'Jed Wallace', position: 'FWD', rating: 79, age: 31 },
    { name: 'Alex Palmer', position: 'GK', rating: 79, age: 29 },
    { name: 'Okay Yokuslu', position: 'MID', rating: 79, age: 31 },
    { name: 'Torbjørn Heggem', position: 'DEF', rating: 78, age: 26 },
    { name: 'Grady Diangana', position: 'FWD', rating: 78, age: 27 },
    { name: 'Karlan Grant', position: 'FWD', rating: 78, age: 28 }
  ]),
  createTeam('NOR', 'Norwich City', LeagueLevel.CHAMPIONSHIP, 79, 79, 78, 'bg-yellow-400 text-green-700', '🐤', [
    { name: 'Josh Sargent', position: 'FWD', rating: 81, age: 25 },
    { name: 'Gabriel Sara', position: 'MID', rating: 81, age: 26 },
    { name: 'Marcelino Nunez', position: 'MID', rating: 79, age: 25 },
    { name: 'Jack Stacey', position: 'DEF', rating: 78, age: 29 },
    { name: 'Shane Duffy', position: 'DEF', rating: 78, age: 33 },
    { name: 'Angus Gunn', position: 'GK', rating: 79, age: 29 },
    { name: 'Kenny McLean', position: 'MID', rating: 79, age: 33 },
    { name: 'Borja Sainz', position: 'FWD', rating: 79, age: 24 },
    { name: 'Adam Idah', position: 'FWD', rating: 78, age: 24 },
    { name: 'Christian Fassnacht', position: 'MID', rating: 77, age: 32 },
    { name: 'Ben Gibson', position: 'DEF', rating: 77, age: 32 }
  ]),
  createTeam('HUL', 'Hull City', LeagueLevel.CHAMPIONSHIP, 78, 78, 78, 'bg-orange-500 text-black', '🐯', [
    { name: 'Abdulkadir Omur', position: 'MID', rating: 79, age: 26 },
    { name: 'Alfie Jones', position: 'DEF', rating: 78, age: 28 },
    { name: 'Oli McBurnie', position: 'FWD', rating: 78, age: 29 },
    { name: 'Jacob Greaves', position: 'DEF', rating: 79, age: 25 },
    { name: 'Ryan Giles', position: 'DEF', rating: 78, age: 25 },
    { name: 'Ivor Pandur', position: 'GK', rating: 77, age: 25 },
    { name: 'Regan Slater', position: 'MID', rating: 77, age: 26 },
    { name: 'Jean Michael Seri', position: 'MID', rating: 79, age: 34 },
    { name: 'Joe Gelhardt', position: 'FWD', rating: 77, age: 23 },
    { name: 'Tyler Morton', position: 'MID', rating: 78, age: 23 }
  ]),
  createTeam('MIL', 'Millwall', LeagueLevel.CHAMPIONSHIP, 78, 77, 79, 'bg-blue-800', '🦁', [
    { name: 'Japhet Tanganga', position: 'DEF', rating: 79, age: 26 },
    { name: 'Jake Cooper', position: 'DEF', rating: 79, age: 30 },
    { name: 'Duncan Watmore', position: 'FWD', rating: 76, age: 31 },
    { name: 'George Saville', position: 'MID', rating: 78, age: 32 },
    { name: 'Romain Esse', position: 'MID', rating: 78, age: 20 },
    { name: 'Lukas Jensen', position: 'GK', rating: 77, age: 26 },
    { name: 'Ryan Leonard', position: 'MID', rating: 77, age: 33 },
    { name: 'Joe Bryan', position: 'DEF', rating: 77, age: 32 },
    { name: 'Mihailo Ivanovic', position: 'FWD', rating: 77, age: 20 },
    { name: 'Macaulay Langstaff', position: 'FWD', rating: 76, age: 28 },
    { name: 'Wes Harding', position: 'DEF', rating: 76, age: 29 }
  ]),
  createTeam('SWA', 'Swansea City', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-white text-black', '🦢', [
    { name: 'Ronald', position: 'FWD', rating: 79, age: 25 },
    { name: 'Josh Tymon', position: 'DEF', rating: 78, age: 26 },
    { name: 'Matt Grimes', position: 'MID', rating: 79, age: 30 },
    { name: 'Harry Darling', position: 'DEF', rating: 78, age: 26 },
    { name: 'Zan Vipotnik', position: 'FWD', rating: 78, age: 23 },
    { name: 'Lawrence Vigouroux', position: 'GK', rating: 78, age: 32 },
    { name: 'Jay Fulton', position: 'MID', rating: 77, age: 31 },
    { name: 'Ben Cabango', position: 'DEF', rating: 77, age: 25 },
    { name: 'Goncalo Franco', position: 'MID', rating: 77, age: 25 },
    { name: 'Liam Cullen', position: 'FWD', rating: 77, age: 26 },
    { name: 'Eom Ji-sung', position: 'FWD', rating: 77, age: 23 }
  ]),
  createTeam('QPR', 'Queens Park Rangers', LeagueLevel.CHAMPIONSHIP, 77, 77, 77, 'bg-blue-600 text-white', '💠', [
    { name: 'Ilias Chair', position: 'MID', rating: 80, age: 28 },
    { name: 'Sinclair Armstrong', position: 'FWD', rating: 78, age: 22 },
    { name: 'Jake Clarke-Salter', position: 'DEF', rating: 78, age: 28 },
    { name: 'Kenneth Paal', position: 'DEF', rating: 78, age: 28 },
    { name: 'Paul Smyth', position: 'FWD', rating: 77, age: 28 },
    { name: 'Asmir Begovic', position: 'GK', rating: 78, age: 38 },
    { name: 'Steve Cook', position: 'DEF', rating: 77, age: 34 },
    { name: 'Sam Field', position: 'MID', rating: 77, age: 27 },
    { name: 'Jimmy Dunne', position: 'DEF', rating: 76, age: 28 },
    { name: 'Jack Colback', position: 'MID', rating: 76, age: 36 },
    { name: 'Koki Saito', position: 'MID', rating: 76, age: 24 },
    { name: 'Michael Frey', position: 'FWD', rating: 76, age: 31 }
  ]),
  createTeam('BIR', 'Birmingham City', LeagueLevel.CHAMPIONSHIP, 79, 76, 76, 'bg-blue-700', '🔵', [
    { name: 'Kyogo Furuhashi', position: 'FWD', rating: 77, age: 30 },
    { name: 'Marvin Ducksch', position: 'FWD', rating: 79, age: 31 },
    { name: 'Jay Stansfield', position: 'FWD', rating: 78, age: 23 },
    { name: 'Bright Osayi-Samuel', position: 'DEF', rating: 78, age: 27 },
    { name: 'Demarai Gray', position: 'MID', rating: 77, age: 29 },
    { name: 'Paik Seung-ho', position: 'MID', rating: 76, age: 28 },
    { name: 'Christoph Klarer', position: 'DEF', rating: 76, age: 25 },
    { name: 'Tomoki Iwata', position: 'MID', rating: 76, age: 28 },
    { name: 'Alex Cochrane', position: 'DEF', rating: 75, age: 25 },
    { name: 'Ethan Laird', position: 'DEF', rating: 75, age: 24 },
    { name: 'Ryan Allsop', position: 'GK', rating: 74, age: 33 }
  ]),
  createTeam('BRC', 'Bristol City', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-red-700', '🐦', [
    { name: 'Jason Knight', position: 'MID', rating: 79, age: 24 },
    { name: 'Yu Hirakawa', position: 'FWD', rating: 77, age: 24 },
    { name: 'Ross McCrorie', position: 'DEF', rating: 78, age: 27 },
    { name: 'Max O\'Leary', position: 'GK', rating: 78, age: 29 },
    { name: 'Rob Dickie', position: 'DEF', rating: 78, age: 29 },
    { name: 'Sam Bell', position: 'FWD', rating: 77, age: 23 },
    { name: 'Zak Vyner', position: 'DEF', rating: 77, age: 28 },
    { name: 'Joe Williams', position: 'MID', rating: 77, age: 28 },
    { name: 'Mark Sykes', position: 'MID', rating: 77, age: 28 },
    { name: 'Haydon Roberts', position: 'DEF', rating: 76, age: 23 },
    { name: 'Scott Twine', position: 'MID', rating: 78, age: 26 }
  ]),
  createTeam('PLY', 'Plymouth Argyle', LeagueLevel.CHAMPIONSHIP, 76, 76, 76, 'bg-green-600 text-white', '🚢', [
    { name: 'Morgan Whittaker', position: 'FWD', rating: 79, age: 24 },
    { name: 'Ryan Hardie', position: 'FWD', rating: 77, age: 28 },
    { name: 'Adam Randell', position: 'MID', rating: 77, age: 25 },
    { name: 'Michael Cooper', position: 'GK', rating: 78, age: 26 },
    { name: 'Brendan Galloway', position: 'DEF', rating: 76, age: 29 },
    { name: 'Bali Mumba', position: 'DEF', rating: 77, age: 24 },
    { name: 'Joe Edwards', position: 'DEF', rating: 76, age: 35 },
    { name: 'Darko Gyabi', position: 'MID', rating: 76, age: 21 },
    { name: 'Julio Pleguezuelo', position: 'DEF', rating: 75, age: 28 },
    { name: 'Mickel Miller', position: 'FWD', rating: 75, age: 29 },
    { name: 'Adam Forshaw', position: 'MID', rating: 75, age: 34 }
  ]),
  createTeam('STO', 'Stoke City', LeagueLevel.CHAMPIONSHIP, 77, 77, 77, 'bg-red-600 text-white', '🏺', [
    { name: 'Million Manhoef', position: 'FWD', rating: 78, age: 23 },
    { name: 'Ben Wilmot', position: 'DEF', rating: 78, age: 26 },
    { name: 'Wouter Burger', position: 'MID', rating: 78, age: 24 },
    { name: 'Viktor Johansson', position: 'GK', rating: 78, age: 27 },
    { name: 'Lewis Koumas', position: 'FWD', rating: 77, age: 20 },
    { name: 'Enda Stevens', position: 'DEF', rating: 76, age: 35 },
    { name: 'Ryan Mmaee', position: 'FWD', rating: 77, age: 28 },
    { name: 'Ben Pearson', position: 'MID', rating: 76, age: 30 },
    { name: 'Michael Rose', position: 'DEF', rating: 76, age: 30 },
    { name: 'Bae Junho', position: 'MID', rating: 77, age: 22 },
    { name: 'Daniel Johnson', position: 'MID', rating: 76, age: 33 }
  ]),
  createTeam('DER', 'Derby County', LeagueLevel.CHAMPIONSHIP, 77, 76, 77, 'bg-white text-black', '🐏', [
    { name: 'Ebou Adams', position: 'MID', rating: 78, age: 29 },
    { name: 'Nathaniel Mendez-Laing', position: 'FWD', rating: 78, age: 33 },
    { name: 'Curtis Nelson', position: 'DEF', rating: 77, age: 32 },
    { name: 'Jerry Yates', position: 'FWD', rating: 78, age: 29 },
    { name: 'Ben Osborn', position: 'MID', rating: 77, age: 31 },
    { name: 'Eiran Cashin', position: 'DEF', rating: 77, age: 24 },
    { name: 'Jacob Widell Zetterstrom', position: 'GK', rating: 77, age: 27 },
    { name: 'Kenzo Goudmijn', position: 'MID', rating: 76, age: 23 },
    { name: 'Craig Forsyth', position: 'DEF', rating: 75, age: 36 },
    { name: 'David Ozoh', position: 'MID', rating: 76, age: 20 },
    { name: 'Corey Blackett-Taylor', position: 'FWD', rating: 76, age: 28 }
  ]),
  createTeam('SHW', 'Sheffield Wednesday', LeagueLevel.CHAMPIONSHIP, 78, 77, 77, 'bg-blue-600 text-white', '🦉', [
    { name: 'Barry Bannan', position: 'MID', rating: 79, age: 35 },
    { name: 'Anthony Musaba', position: 'FWD', rating: 78, age: 25 },
    { name: 'Di\'Shon Bernard', position: 'DEF', rating: 77, age: 25 },
    { name: 'Josh Windass', position: 'FWD', rating: 78, age: 31 },
    { name: 'Yan Valery', position: 'DEF', rating: 77, age: 26 },
    { name: 'Svante Ingelsson', position: 'MID', rating: 77, age: 27 },
    { name: 'James Beadle', position: 'GK', rating: 77, age: 21 },
    { name: 'Dominic Iorfa', position: 'DEF', rating: 76, age: 30 },
    { name: 'Liam Palmer', position: 'DEF', rating: 76, age: 34 },
    { name: 'Marvin Johnson', position: 'DEF', rating: 76, age: 35 },
    { name: 'Michael Smith', position: 'FWD', rating: 76, age: 34 }
  ]),
  createTeam('WAT', 'Watford', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-yellow-500 text-black', '🐝', [
    { name: 'Yaser Asprilla', position: 'MID', rating: 80, age: 22 },
    { name: 'Edo Kayembe', position: 'MID', rating: 79, age: 27 },
    { name: 'Jamal Lewis', position: 'DEF', rating: 78, age: 27 },
    { name: 'Moussa Sissoko', position: 'MID', rating: 78, age: 36 },
    { name: 'Daniel Bachmann', position: 'GK', rating: 78, age: 31 },
    { name: 'Ryan Porteous', position: 'DEF', rating: 78, age: 26 },
    { name: 'Mileta Rajovic', position: 'FWD', rating: 77, age: 26 },
    { name: 'Imran Louza', position: 'MID', rating: 78, age: 26 },
    { name: 'Giorgio Sitti', position: 'MID', rating: 76, age: 21 },
    { name: 'Angelo Ogbonna', position: 'DEF', rating: 77, age: 37 },
    { name: 'Kwadwo Baah', position: 'FWD', rating: 76, age: 22 }
  ]),
  createTeam('BLA', 'Blackburn Rovers', LeagueLevel.CHAMPIONSHIP, 77, 77, 76, 'bg-blue-500 text-white', '🌹', [ // Halved actually, but stripes close enough for simple
    { name: 'Tyrhys Dolan', position: 'FWD', rating: 80, age: 23 },
    { name: 'Makhtar Gueye', position: 'FWD', rating: 75, age: 27 },
    { name: 'Yuki Ohashi', position: 'FWD', rating: 77, age: 29 },
    { name: 'Hayden Carter', position: 'DEF', rating: 77, age: 26 },
    { name: 'Aynsley Pears', position: 'GK', rating: 77, age: 27 },
    { name: 'Callum Brittain', position: 'DEF', rating: 77, age: 27 },
    { name: 'Sondre Tronstad', position: 'MID', rating: 77, age: 30 },
    { name: 'Todd Cantwell', position: 'MID', rating: 80, age: 27 },
    { name: 'Dominic Hyam', position: 'DEF', rating: 77, age: 29 },
    { name: 'Andreas Weimann', position: 'FWD', rating: 76, age: 34 },
    { name: 'John Buckley', position: 'MID', rating: 76, age: 26 },
    { name: 'Harry Pickering', position: 'DEF', rating: 76, age: 26 }
  ]),
  createTeam('OXF', 'Oxford United', LeagueLevel.CHAMPIONSHIP, 76, 76, 75, 'bg-yellow-600', '🐂', [
    { name: 'Cameron Brannagan', position: 'MID', rating: 78, age: 29 },
    { name: 'Mark Harris', position: 'FWD', rating: 77, age: 26 },
    { name: 'Ciaron Brown', position: 'DEF', rating: 76, age: 27 },
    { name: 'Ruben Rodrigues', position: 'MID', rating: 77, age: 29 },
    { name: 'Jamie Cumming', position: 'GK', rating: 76, age: 26 },
    { name: 'Tyler Goodrham', position: 'MID', rating: 76, age: 22 },
    { name: 'Greg Leigh', position: 'DEF', rating: 76, age: 31 },
    { name: 'Elliott Moore', position: 'DEF', rating: 76, age: 28 },
    { name: 'Josh McEachran', position: 'MID', rating: 75, age: 32 },
    { name: 'Dane Scarlett', position: 'FWD', rating: 75, age: 21 },
    { name: 'Joe Bennett', position: 'DEF', rating: 75, age: 35 }
  ]),
  createTeam('POR', 'Portsmouth', LeagueLevel.CHAMPIONSHIP, 77, 76, 76, 'bg-blue-600 text-white', '⚓', [
    { name: 'Colby Bishop', position: 'FWD', rating: 78, age: 29 },
    { name: 'Marlon Pack', position: 'MID', rating: 77, age: 34 },
    { name: 'Conor Shaughnessy', position: 'DEF', rating: 77, age: 29 },
    { name: 'Will Norris', position: 'GK', rating: 77, age: 32 },
    { name: 'Paddy Lane', position: 'FWD', rating: 77, age: 24 },
    { name: 'Callum Lang', position: 'FWD', rating: 76, age: 27 },
    { name: 'Jack Sparkes', position: 'DEF', rating: 76, age: 25 },
    { name: 'Owen Moxon', position: 'MID', rating: 76, age: 27 },
    { name: 'Regan Poole', position: 'DEF', rating: 76, age: 27 },
    { name: 'Jordan Williams', position: 'DEF', rating: 75, age: 26 },
    { name: 'Tom McIntyre', position: 'DEF', rating: 75, age: 27 }
  ]),
  createTeam('LUT', 'Luton Town', LeagueLevel.CHAMPIONSHIP, 78, 78, 77, 'bg-orange-600', '🎩', [
    { name: 'Alfie Doughty', position: 'DEF', rating: 79, age: 25 },
    { name: 'Carlton Morris', position: 'FWD', rating: 79, age: 29 },
    { name: 'Teden Mengi', position: 'DEF', rating: 78, age: 23 },
    { name: 'Thomas Kaminski', position: 'GK', rating: 79, age: 33 },
    { name: 'Reece Burke', position: 'DEF', rating: 77, age: 29 },
    { name: 'Alfie Adeyemo', position: 'FWD', rating: 77, age: 20 },
    { name: 'Marvelous Nakamba', position: 'MID', rating: 78, age: 31 },
    { name: 'Jordan Clark', position: 'MID', rating: 77, age: 32 },
    { name: 'Amari\'i Bell', position: 'DEF', rating: 76, age: 31 },
    { name: 'Liam Walsh', position: 'MID', rating: 76, age: 28 }
  ]),
  createTeam('PRE', 'Preston North End', LeagueLevel.CHAMPIONSHIP, 76, 76, 76, 'bg-white text-blue-600', '🐑', [
    { name: 'Will Keane', position: 'FWD', rating: 77, age: 32 },
    { name: 'Ben Whiteman', position: 'MID', rating: 77, age: 29 },
    { name: 'Ali McCann', position: 'MID', rating: 76, age: 25 },
    { name: 'Jordan Storey', position: 'DEF', rating: 76, age: 28 },
    { name: 'Freddie Woodman', position: 'GK', rating: 77, age: 28 },
    { name: 'Liam Lindsay', position: 'DEF', rating: 76, age: 30 },
    { name: 'Brad Potts', position: 'DEF', rating: 76, age: 31 },
    { name: 'Mads Frokjaer-Jensen', position: 'MID', rating: 76, age: 26 },
    { name: 'Duane Holmes', position: 'MID', rating: 75, age: 31 },
    { name: 'Emil Riis', position: 'FWD', rating: 77, age: 27 },
    { name: 'Andrew Hughes', position: 'DEF', rating: 75, age: 33 }
  ])
];

export const ALL_TEAMS = [...PREMIER_LEAGUE_TEAMS, ...CHAMPIONSHIP_TEAMS];