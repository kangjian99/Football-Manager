
import { Team, LeagueLevel, Player } from './types';

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
  color: string, logo: string, 
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

export const SERIE_A_TEAMS: Team[] = [
  createTeam('INT', 'Inter', LeagueLevel.SERIE_A, 93, 91, 90, 'bg-blue-700', '🔵', [
    { name: 'Lautaro Martinez', position: 'FWD', rating: 94, age: 27 },
    { name: 'Marcus Thuram', position: 'FWD', rating: 89, age: 27 },
    { name: 'Nicolo Barella', position: 'MID', rating: 90, age: 27 },
    { name: 'Hakan Calhanoglu', position: 'MID', rating: 89, age: 30 },
    { name: 'Alessandro Bastoni', position: 'DEF', rating: 88, age: 25 },
    { name: 'Federico Dimarco', position: 'DEF', rating: 87, age: 26 },
    { name: 'Benjamin Pavard', position: 'DEF', rating: 85, age: 28 },
    { name: 'Henrikh Mkhitaryan', position: 'MID', rating: 84, age: 35 },
    { name: 'Yann Sommer', position: 'GK', rating: 86, age: 35 },
    { name: 'Mehdi Taremi', position: 'FWD', rating: 83, age: 32 },
    { name: 'Piotr Zielinski', position: 'MID', rating: 83, age: 30 },
    { name: 'Davide Frattesi', position: 'MID', rating: 82, age: 25 },
    { name: 'Denzel Dumfries', position: 'DEF', rating: 83, age: 28 },
    { name: 'Stefan de Vrij', position: 'DEF', rating: 82, age: 32 },
    { name: 'Matteo Darmian', position: 'DEF', rating: 81, age: 34 },
    { name: 'Carlos Augusto', position: 'DEF', rating: 81, age: 25 },
    { name: 'Yann Bisseck', position: 'DEF', rating: 80, age: 23 }
  ]),
  createTeam('MIL', 'Milan', LeagueLevel.SERIE_A, 89, 86, 85, 'bg-red-600', '🔴', [
    { name: 'Rafael Leao', position: 'FWD', rating: 89, age: 25 },
    { name: 'Christian Pulisic', position: 'FWD', rating: 87, age: 26 },
    { name: 'Alvaro Morata', position: 'FWD', rating: 84, age: 31 },
    { name: 'Theo Hernandez', position: 'DEF', rating: 88, age: 26 },
    { name: 'Tijani Reijnders', position: 'MID', rating: 85, age: 26 },
    { name: 'Mike Maignan', position: 'GK', rating: 89, age: 29 },
    { name: 'Youssouf Fofana', position: 'MID', rating: 83, age: 25 },
    { name: 'Fikayo Tomori', position: 'DEF', rating: 83, age: 26 },
    { name: 'Tammy Abraham', position: 'FWD', rating: 81, age: 26 },
    { name: 'Matteo Gabbia', position: 'DEF', rating: 80, age: 24 },
    { name: 'Ruben Loftus-Cheek', position: 'MID', rating: 81, age: 28 },
    { name: 'Samuel Chukwueze', position: 'FWD', rating: 80, age: 25 },
    { name: 'Emerson Royal', position: 'DEF', rating: 79, age: 25 },
    { name: 'Strahinja Pavlovic', position: 'DEF', rating: 80, age: 23 },
    { name: 'Noah Okafor', position: 'FWD', rating: 79, age: 24 }
  ]),
  createTeam('JUV', 'Juventus', LeagueLevel.SERIE_A, 87, 88, 88, 'bg-gray-100 text-black', '⚪', [
    { name: 'Dusan Vlahovic', position: 'FWD', rating: 88, age: 24 },
    { name: 'Kenan Yildiz', position: 'FWD', rating: 84, age: 19 },
    { name: 'Teun Koopmeiners', position: 'MID', rating: 87, age: 26 },
    { name: 'Gleison Bremer', position: 'DEF', rating: 88, age: 27 },
    { name: 'Michele Di Gregorio', position: 'GK', rating: 84, age: 27 },
    { name: 'Francisco Conceicao', position: 'FWD', rating: 83, age: 21 },
    { name: 'Andrea Cambiaso', position: 'DEF', rating: 83, age: 24 },
    { name: 'Manuel Locatelli', position: 'MID', rating: 83, age: 26 },
    { name: 'Pierre Kalulu', position: 'DEF', rating: 82, age: 24 },
    { name: 'Khephren Thuram', position: 'MID', rating: 81, age: 23 },
    { name: 'Federico Gatti', position: 'DEF', rating: 81, age: 26 },
    { name: 'Douglas Luiz', position: 'MID', rating: 82, age: 26 },
    { name: 'Nico Gonzalez', position: 'FWD', rating: 82, age: 26 },
    { name: 'Nicolo Savona', position: 'DEF', rating: 78, age: 21 },
    { name: 'Weston McKennie', position: 'MID', rating: 80, age: 26 }
  ]),
  createTeam('NAP', 'Napoli', LeagueLevel.SERIE_A, 89, 86, 85, 'bg-sky-500', '💠', [
    { name: 'Khvicha Kvaratskhelia', position: 'FWD', rating: 89, age: 23 },
    { name: 'Romelu Lukaku', position: 'FWD', rating: 86, age: 31 },
    { name: 'Scott McTominay', position: 'MID', rating: 85, age: 27 },
    { name: 'Alessandro Buongiorno', position: 'DEF', rating: 85, age: 25 },
    { name: 'Giovanni Di Lorenzo', position: 'DEF', rating: 86, age: 31 },
    { name: 'Stanislav Lobotka', position: 'MID', rating: 84, age: 29 },
    { name: 'Alex Meret', position: 'GK', rating: 83, age: 27 },
    { name: 'Frank Anguissa', position: 'MID', rating: 83, age: 28 },
    { name: 'Matteo Politano', position: 'FWD', rating: 82, age: 31 },
    { name: 'David Neres', position: 'FWD', rating: 82, age: 27 },
    { name: 'Amir Rrahmani', position: 'DEF', rating: 82, age: 30 },
    { name: 'Mathias Olivera', position: 'DEF', rating: 80, age: 26 },
    { name: 'Billy Gilmour', position: 'MID', rating: 79, age: 23 },
    { name: 'Leonardo Spinazzola', position: 'DEF', rating: 79, age: 31 },
    { name: 'Giacomo Raspadori', position: 'FWD', rating: 80, age: 24 }
  ]),
  createTeam('ATA', 'Atalanta', LeagueLevel.SERIE_A, 88, 86, 83, 'bg-blue-900', '⚫', [
    { name: 'Ademola Lookman', position: 'FWD', rating: 87, age: 26 },
    { name: 'Mateo Retegui', position: 'FWD', rating: 85, age: 25 },
    { name: 'Ederson', position: 'MID', rating: 86, age: 25 },
    { name: 'Charles De Ketelaere', position: 'FWD', rating: 84, age: 23 },
    { name: 'Isak Hien', position: 'DEF', rating: 83, age: 25 },
    { name: 'Marten de Roon', position: 'MID', rating: 82, age: 33 },
    { name: 'Marco Carnesecchi', position: 'GK', rating: 83, age: 24 },
    { name: 'Davide Zappacosta', position: 'DEF', rating: 81, age: 32 },
    { name: 'Mario Pasalic', position: 'MID', rating: 82, age: 29 },
    { name: 'Sead Kolasinac', position: 'DEF', rating: 81, age: 31 },
    { name: 'Berat Djimsiti', position: 'DEF', rating: 80, age: 31 },
    { name: 'Matteo Ruggeri', position: 'DEF', rating: 80, age: 22 },
    { name: 'Raoul Bellanova', position: 'DEF', rating: 81, age: 24 },
    { name: 'Lazar Samardzic', position: 'MID', rating: 80, age: 22 }
  ]),
  createTeam('ROM', 'Roma', LeagueLevel.SERIE_A, 85, 84, 83, 'bg-orange-700', '🐺', [
    { name: 'Paulo Dybala', position: 'FWD', rating: 87, age: 30 },
    { name: 'Artem Dovbyk', position: 'FWD', rating: 85, age: 27 },
    { name: 'Lorenzo Pellegrini', position: 'MID', rating: 84, age: 28 },
    { name: 'Gianluca Mancini', position: 'DEF', rating: 83, age: 28 },
    { name: 'Evan Ndicka', position: 'DEF', rating: 82, age: 25 },
    { name: 'Manu Kone', position: 'MID', rating: 82, age: 23 },
    { name: 'Mile Svilar', position: 'GK', rating: 82, age: 25 },
    { name: 'Matias Soule', position: 'FWD', rating: 81, age: 21 },
    { name: 'Stephan El Shaarawy', position: 'FWD', rating: 80, age: 31 },
    { name: 'Bryan Cristante', position: 'MID', rating: 81, age: 29 },
    { name: 'Mats Hummels', position: 'DEF', rating: 82, age: 35 },
    { name: 'Angelino', position: 'DEF', rating: 80, age: 27 },
    { name: 'Mario Hermoso', position: 'DEF', rating: 80, age: 29 },
    { name: 'Tommaso Baldanzi', position: 'MID', rating: 78, age: 21 }
  ]),
  createTeam('LAZ', 'Lazio', LeagueLevel.SERIE_A, 85, 84, 83, 'bg-sky-300 text-black', '🦅', [
    { name: 'Mattia Zaccagni', position: 'FWD', rating: 85, age: 29 },
    { name: 'Taty Castellanos', position: 'FWD', rating: 83, age: 25 },
    { name: 'Matteo Guendouzi', position: 'MID', rating: 84, age: 25 },
    { name: 'Ivan Provedel', position: 'GK', rating: 84, age: 30 },
    { name: 'Alessio Romagnoli', position: 'DEF', rating: 83, age: 29 },
    { name: 'Boulaye Dia', position: 'FWD', rating: 82, age: 27 },
    { name: 'Nuno Tavares', position: 'DEF', rating: 82, age: 24 },
    { name: 'Nicolo Rovella', position: 'MID', rating: 81, age: 22 },
    { name: 'Gustav Isaksen', position: 'FWD', rating: 80, age: 23 },
    { name: 'Mario Gila', position: 'DEF', rating: 80, age: 24 },
    { name: 'Manuel Lazzari', position: 'DEF', rating: 79, age: 30 },
    { name: 'Pedro', position: 'FWD', rating: 79, age: 37 },
    { name: 'Matias Vecino', position: 'MID', rating: 78, age: 33 },
    { name: 'Tijjani Noslin', position: 'FWD', rating: 77, age: 25 }
  ]),
  createTeam('FIO', 'Fiorentina', LeagueLevel.SERIE_A, 84, 83, 82, 'bg-purple-700', '⚜️', [
      { name: 'Moise Kean', position: 'FWD', rating: 84, age: 24 },
      { name: 'Albert Gudmundsson', position: 'FWD', rating: 84, age: 27 },
      { name: 'David de Gea', position: 'GK', rating: 86, age: 33 },
      { name: 'Edoardo Bove', position: 'MID', rating: 81, age: 22 },
      { name: 'Robin Gosens', position: 'DEF', rating: 82, age: 30 },
      { name: 'Dodo', position: 'DEF', rating: 82, age: 25 },
      { name: 'Andrea Colpani', position: 'MID', rating: 81, age: 25 },
      { name: 'Yacine Adli', position: 'MID', rating: 80, age: 24 },
      { name: 'Danilo Cataldi', position: 'MID', rating: 79, age: 30 },
      { name: 'Lucas Martinez Quarta', position: 'DEF', rating: 80, age: 28 },
      { name: 'Pietro Comuzzo', position: 'DEF', rating: 77, age: 19 },
      { name: 'Luca Ranieri', position: 'DEF', rating: 79, age: 25 },
      { name: 'Rolando Mandragora', position: 'MID', rating: 78, age: 27 }
  ]),
  createTeam('BOL', 'Bologna', LeagueLevel.SERIE_A, 80, 81, 80, 'bg-red-800', '🏰', [
      { name: 'Riccardo Orsolini', position: 'FWD', rating: 83, age: 27 },
      { name: 'Santiago Castro', position: 'FWD', rating: 80, age: 19 },
      { name: 'Dan Ndoye', position: 'FWD', rating: 81, age: 23 },
      { name: 'Sam Beukema', position: 'DEF', rating: 81, age: 25 },
      { name: 'Lukasz Skorupski', position: 'GK', rating: 82, age: 33 },
      { name: 'Stefan Posch', position: 'DEF', rating: 80, age: 27 },
      { name: 'Lewis Ferguson', position: 'MID', rating: 82, age: 25 },
      { name: 'Remo Freuler', position: 'MID', rating: 80, age: 32 },
      { name: 'Michel Aebischer', position: 'MID', rating: 79, age: 27 },
      { name: 'Jhon Lucumi', position: 'DEF', rating: 80, age: 26 },
      { name: 'Giovanni Fabbian', position: 'MID', rating: 78, age: 21 },
      { name: 'Juan Miranda', position: 'DEF', rating: 78, age: 24 }
  ]),
  createTeam('TOR', 'Torino', LeagueLevel.SERIE_A, 79, 79, 80, 'bg-red-900', '🐂', [
      { name: 'Duvan Zapata', position: 'FWD', rating: 82, age: 33 },
      { name: 'Che Adams', position: 'FWD', rating: 80, age: 28 },
      { name: 'Samuele Ricci', position: 'MID', rating: 82, age: 23 },
      { name: 'Vanja Milinkovic-Savic', position: 'GK', rating: 81, age: 27 },
      { name: 'Saul Coco', position: 'DEF', rating: 79, age: 25 },
      { name: 'Valentino Lazaro', position: 'DEF', rating: 78, age: 28 },
      { name: 'Antonio Sanabria', position: 'FWD', rating: 79, age: 28 },
      { name: 'Ivan Ilic', position: 'MID', rating: 80, age: 23 },
      { name: 'Karol Linetty', position: 'MID', rating: 77, age: 29 },
      { name: 'Adam Masina', position: 'DEF', rating: 76, age: 30 },
      { name: 'Guillermo Maripan', position: 'DEF', rating: 78, age: 30 },
      { name: 'Nikola Vlasic', position: 'MID', rating: 79, age: 26 }
  ]),
  createTeam('UDI', 'Udinese', LeagueLevel.SERIE_A, 78, 76, 77, 'bg-gray-800', '🦓', [
      { name: 'Florian Thauvin', position: 'FWD', rating: 81, age: 31 },
      { name: 'Lorenzo Lucca', position: 'FWD', rating: 79, age: 24 },
      { name: 'Jaka Bijol', position: 'DEF', rating: 80, age: 25 },
      { name: 'Maduka Okoye', position: 'GK', rating: 78, age: 25 },
      { name: 'Sandi Lovric', position: 'MID', rating: 78, age: 26 },
      { name: 'Hassane Kamara', position: 'DEF', rating: 77, age: 30 },
      { name: 'Kingsley Ehizibue', position: 'DEF', rating: 76, age: 29 },
      { name: 'Brenner', position: 'FWD', rating: 75, age: 24 },
      { name: 'Martin Payero', position: 'MID', rating: 75, age: 25 },
      { name: 'Alexis Sanchez', position: 'FWD', rating: 78, age: 35 }
  ]),
  createTeam('EMP', 'Empoli', LeagueLevel.SERIE_A, 75, 76, 76, 'bg-blue-600', '🏛️', [
    { name: 'Lorenzo Colombo', position: 'FWD', rating: 77, age: 22 },
    { name: 'Sebastiano Esposito', position: 'FWD', rating: 76, age: 22 },
    { name: 'Devis Vasquez', position: 'GK', rating: 78, age: 26 },
    { name: 'Ardian Ismajli', position: 'DEF', rating: 77, age: 27 },
    { name: 'Giuseppe Pezzella', position: 'DEF', rating: 76, age: 26 },
    { name: 'Emmanuel Gyasi', position: 'FWD', rating: 75, age: 30 },
    { name: 'Youssef Maleh', position: 'MID', rating: 75, age: 26 },
    { name: 'Liam Henderson', position: 'MID', rating: 74, age: 28 },
    { name: 'Mattia Viti', position: 'DEF', rating: 76, age: 22 }
  ]),
  createTeam('VER', 'Verona', LeagueLevel.SERIE_A, 75, 74, 75, 'bg-yellow-600', '🪜', [
    { name: 'Casper Tengstedt', position: 'FWD', rating: 77, age: 24 },
    { name: 'Darko Lazovic', position: 'MID', rating: 78, age: 33 },
    { name: 'Lorenzo Montipo', position: 'GK', rating: 78, age: 28 },
    { name: 'Ondrej Duda', position: 'MID', rating: 77, age: 29 },
    { name: 'Jackson Tchatchoua', position: 'DEF', rating: 76, age: 22 },
    { name: 'Tomas Suslov', position: 'MID', rating: 76, age: 22 },
    { name: 'Diego Coppola', position: 'DEF', rating: 75, age: 20 },
    { name: 'Daniel Mosquera', position: 'FWD', rating: 75, age: 24 },
    { name: 'Abdou Harroui', position: 'MID', rating: 75, age: 26 }
  ]),
  createTeam('COM', 'Como', LeagueLevel.SERIE_A, 78, 77, 76, 'bg-blue-500', '🌊', [
    { name: 'Nico Paz', position: 'MID', rating: 79, age: 20 },
    { name: 'Patrick Cutrone', position: 'FWD', rating: 78, age: 26 },
    { name: 'Sergi Roberto', position: 'MID', rating: 79, age: 32 },
    { name: 'Gabriel Strefezza', position: 'FWD', rating: 78, age: 27 },
    { name: 'Emil Audero', position: 'GK', rating: 77, age: 27 },
    { name: 'Alberto Moreno', position: 'DEF', rating: 77, age: 32 },
    { name: 'Andrea Belotti', position: 'FWD', rating: 76, age: 30 },
    { name: 'Maximo Perrone', position: 'MID', rating: 77, age: 21 },
    { name: 'Pepe Reina', position: 'GK', rating: 76, age: 41 },
    { name: 'Alberto Dossena', position: 'DEF', rating: 76, age: 25 },
    { name: 'Ignace Van der Brempt', position: 'DEF', rating: 75, age: 22 }
  ]),
  createTeam('PAR', 'Parma', LeagueLevel.SERIE_A, 77, 76, 75, 'bg-yellow-300 text-blue-800', '✝️', [
    { name: 'Dennis Man', position: 'FWD', rating: 80, age: 26 },
    { name: 'Ange-Yoan Bonny', position: 'FWD', rating: 78, age: 20 },
    { name: 'Adrian Bernabe', position: 'MID', rating: 79, age: 23 },
    { name: 'Zion Suzuki', position: 'GK', rating: 77, age: 22 },
    { name: 'Valentin Mihaila', position: 'FWD', rating: 76, age: 24 },
    { name: 'Simon Sohm', position: 'MID', rating: 76, age: 23 },
    { name: 'Alessandro Circati', position: 'DEF', rating: 76, age: 20 },
    { name: 'Enrico Del Prato', position: 'DEF', rating: 75, age: 24 },
    { name: 'Woyo Coulibaly', position: 'DEF', rating: 74, age: 25 },
    { name: 'Hernani', position: 'MID', rating: 75, age: 30 }
  ]),
  createTeam('CAG', 'Cagliari', LeagueLevel.SERIE_A, 75, 75, 74, 'bg-red-700', '🏝️', [
    { name: 'Roberto Piccoli', position: 'FWD', rating: 76, age: 23 },
    { name: 'Zito Luvumbo', position: 'FWD', rating: 77, age: 22 },
    { name: 'Yerry Mina', position: 'DEF', rating: 77, age: 29 },
    { name: 'Simone Scuffet', position: 'GK', rating: 76, age: 28 },
    { name: 'Nicolas Viola', position: 'MID', rating: 75, age: 34 },
    { name: 'Razvan Marin', position: 'MID', rating: 76, age: 28 },
    { name: 'Sebastiano Luperto', position: 'DEF', rating: 76, age: 27 },
    { name: 'Gianluca Gaetano', position: 'MID', rating: 75, age: 24 },
    { name: 'Nadir Zortea', position: 'DEF', rating: 75, age: 25 },
    { name: 'Gabriele Zappa', position: 'DEF', rating: 74, age: 24 }
  ]),
  createTeam('GEN', 'Genoa', LeagueLevel.SERIE_A, 76, 77, 77, 'bg-red-500', '🐲', [
    { name: 'Andrea Pinamonti', position: 'FWD', rating: 78, age: 25 },
    { name: 'Morten Frendrup', position: 'MID', rating: 79, age: 23 },
    { name: 'Johan Vasquez', position: 'DEF', rating: 77, age: 25 },
    { name: 'Pierluigi Gollini', position: 'GK', rating: 78, age: 29 },
    { name: 'Junior Messias', position: 'FWD', rating: 77, age: 33 },
    { name: 'Milan Badelj', position: 'MID', rating: 76, age: 35 },
    { name: 'Vitinha', position: 'FWD', rating: 76, age: 24 },
    { name: 'Koni De Winter', position: 'DEF', rating: 76, age: 22 },
    { name: 'Aaron Martin', position: 'DEF', rating: 75, age: 27 },
    { name: 'Stefano Sabelli', position: 'DEF', rating: 75, age: 31 },
    { name: 'Caleb Ekuban', position: 'FWD', rating: 74, age: 30 }
  ]),
  createTeam('MON', 'Monza', LeagueLevel.SERIE_A, 76, 77, 76, 'bg-red-600', '🏎️', [
    { name: 'Matteo Pessina', position: 'MID', rating: 79, age: 27 },
    { name: 'Daniel Maldini', position: 'FWD', rating: 78, age: 22 },
    { name: 'Dany Mota', position: 'FWD', rating: 77, age: 26 },
    { name: 'Stefano Turati', position: 'GK', rating: 77, age: 23 },
    { name: 'Pablo Mari', position: 'DEF', rating: 77, age: 31 },
    { name: 'Gianluca Caprari', position: 'FWD', rating: 76, age: 31 },
    { name: 'Armando Izzo', position: 'DEF', rating: 76, age: 32 },
    { name: 'Georgios Kyriakopoulos', position: 'DEF', rating: 75, age: 28 },
    { name: 'Warren Bondo', position: 'MID', rating: 75, age: 20 },
    { name: 'Milan Djuric', position: 'FWD', rating: 75, age: 34 },
    { name: 'Samuele Birindelli', position: 'DEF', rating: 74, age: 25 }
  ]),
  createTeam('LEC', 'Lecce', LeagueLevel.SERIE_A, 75, 75, 75, 'bg-yellow-500 text-black', '☀️', [
    { name: 'Nikola Krstovic', position: 'FWD', rating: 78, age: 24 },
    { name: 'Federico Baschirotto', position: 'DEF', rating: 77, age: 27 },
    { name: 'Wladimiro Falcone', position: 'GK', rating: 78, age: 29 },
    { name: 'Patrick Dorgu', position: 'DEF', rating: 78, age: 19 },
    { name: 'Ylber Ramadani', position: 'MID', rating: 76, age: 28 },
    { name: 'Lameck Banda', position: 'FWD', rating: 76, age: 23 },
    { name: 'Antonin Gallo', position: 'DEF', rating: 75, age: 24 },
    { name: 'Remi Oudin', position: 'MID', rating: 75, age: 27 },
    { name: 'Kialonda Gaspar', position: 'DEF', rating: 75, age: 26 },
    { name: 'Tete Morente', position: 'FWD', rating: 74, age: 27 }
  ]),
  createTeam('VEN', 'Venezia', LeagueLevel.SERIE_A, 74, 74, 73, 'bg-orange-500', '🦁', [
    { name: 'Joel Pohjanpalo', position: 'FWD', rating: 77, age: 29 },
    { name: 'Gaetano Oristanio', position: 'FWD', rating: 76, age: 21 },
    { name: 'Gianluca Busio', position: 'MID', rating: 76, age: 22 },
    { name: 'Jesse Joronen', position: 'GK', rating: 75, age: 31 },
    { name: 'Hans Nicolussi Caviglia', position: 'MID', rating: 74, age: 24 },
    { name: 'Mikael Ellertsson', position: 'MID', rating: 73, age: 22 },
    { name: 'Jay Idzes', position: 'DEF', rating: 74, age: 24 },
    { name: 'Marin Sverko', position: 'DEF', rating: 73, age: 26 },
    { name: 'Alfred Duncan', position: 'MID', rating: 75, age: 31 },
    { name: 'Francesco Zampano', position: 'DEF', rating: 73, age: 30 }
  ])
];

// --- SERIE B DATA (2024/25) ---

export const SERIE_B_TEAMS: Team[] = [
  createTeam('SAS', 'Sassuolo', LeagueLevel.SERIE_B, 79, 77, 75, 'bg-green-700', '🟩', [
      { name: 'Domenico Berardi', position: 'FWD', rating: 83, age: 30 },
      { name: 'Armand Lauriente', position: 'FWD', rating: 79, age: 25 },
      { name: 'Kristian Thorstvedt', position: 'MID', rating: 77, age: 25 },
      { name: 'Samuele Mulattieri', position: 'FWD', rating: 75, age: 23 },
      { name: 'Daniel Boloca', position: 'MID', rating: 75, age: 25 },
      { name: 'Josh Doig', position: 'DEF', rating: 74, age: 22 },
      { name: 'Horatiu Moldovan', position: 'GK', rating: 75, age: 26 },
      { name: 'Pedro Obiang', position: 'MID', rating: 74, age: 32 }
  ]),
  createTeam('SAM', 'Sampdoria', LeagueLevel.SERIE_B, 76, 75, 74, 'bg-blue-600', '⚓', [
      { name: 'Gennaro Tutino', position: 'FWD', rating: 77, age: 28 },
      { name: 'Massimo Coda', position: 'FWD', rating: 76, age: 35 },
      { name: 'Pajtim Kasami', position: 'MID', rating: 75, age: 32 },
      { name: 'Bartosz Bereszynski', position: 'DEF', rating: 74, age: 32 },
      { name: 'Fabio Borini', position: 'FWD', rating: 74, age: 33 },
      { name: 'Marco Silvestri', position: 'GK', rating: 75, age: 33 },
      { name: 'Leonardo Benedetti', position: 'MID', rating: 73, age: 24 },
      { name: 'Simone Romagnoli', position: 'DEF', rating: 73, age: 34 }
  ]),
  createTeam('PAL', 'Palermo', LeagueLevel.SERIE_B, 75, 74, 73, 'bg-pink-300 text-black', '🦅', [
      { name: 'Matteo Brunori', position: 'FWD', rating: 77, age: 29 },
      { name: 'Roberto Insigne', position: 'FWD', rating: 75, age: 30 },
      { name: 'Jacopo Segre', position: 'MID', rating: 75, age: 27 },
      { name: 'Sebastiano Desplanches', position: 'GK', rating: 73, age: 21 },
      { name: 'Francesco Di Mariano', position: 'FWD', rating: 74, age: 28 },
      { name: 'Thomas Henry', position: 'FWD', rating: 74, age: 29 },
      { name: 'Federico Di Francesco', position: 'FWD', rating: 74, age: 30 },
      { name: 'Claudio Gomes', position: 'MID', rating: 74, age: 24 }
  ]),
  createTeam('CRE', 'Cremonese', LeagueLevel.SERIE_B, 75, 75, 73, 'bg-gray-400 text-red-800', '🎻', [
      { name: 'Franco Vazquez', position: 'MID', rating: 76, age: 35 },
      { name: 'Jari Vandeputte', position: 'MID', rating: 76, age: 28 },
      { name: 'Federico Bonazzoli', position: 'FWD', rating: 75, age: 27 },
      { name: 'Andrea Fulignati', position: 'GK', rating: 74, age: 29 },
      { name: 'Luca Zanimacchia', position: 'MID', rating: 75, age: 26 },
      { name: 'Michele Castagnetti', position: 'MID', rating: 74, age: 34 },
      { name: 'Manuel De Luca', position: 'FWD', rating: 74, age: 26 }
  ]),
  createTeam('PIS', 'Pisa', LeagueLevel.SERIE_B, 74, 73, 72, 'bg-blue-800', '🗼', [
      { name: 'Matteo Tramoni', position: 'MID', rating: 75, age: 24 },
      { name: 'Nicholas Bonfanti', position: 'FWD', rating: 74, age: 22 },
      { name: 'Marius Marin', position: 'MID', rating: 73, age: 26 },
      { name: 'Adrian Semper', position: 'GK', rating: 74, age: 26 },
      { name: 'Stefano Moreo', position: 'FWD', rating: 73, age: 31 },
      { name: 'Antonio Caracciolo', position: 'DEF', rating: 72, age: 34 }
  ]),
  createTeam('SPE', 'Spezia', LeagueLevel.SERIE_B, 73, 73, 72, 'bg-white text-black', '🦅', [
      { name: 'Salvatore Esposito', position: 'MID', rating: 75, age: 23 },
      { name: 'Francesco Pio Esposito', position: 'FWD', rating: 72, age: 19 },
      { name: 'Edoardo Soleri', position: 'FWD', rating: 73, age: 26 },
      { name: 'Filippo Bandinelli', position: 'MID', rating: 73, age: 29 },
      { name: 'Arkadiusz Reca', position: 'DEF', rating: 72, age: 29 }
  ]),
  createTeam('BRE', 'Brescia', LeagueLevel.SERIE_B, 72, 72, 71, 'bg-blue-500', '🦁', [
      { name: 'Dimitri Bisoli', position: 'MID', rating: 74, age: 30 },
      { name: 'Gennaro Borrelli', position: 'FWD', rating: 73, age: 24 },
      { name: 'Andrea Cistana', position: 'DEF', rating: 74, age: 27 },
      { name: 'Nicolas Galazzi', position: 'FWD', rating: 72, age: 23 },
      { name: 'Luca Lezzerini', position: 'GK', rating: 72, age: 29 }
  ]),
  createTeam('BAR', 'Bari', LeagueLevel.SERIE_B, 71, 71, 70, 'bg-white text-red-600', '🐓', [
      { name: 'Kevin Lasagna', position: 'FWD', rating: 73, age: 32 },
      { name: 'Giuseppe Sibilli', position: 'FWD', rating: 73, age: 28 },
      { name: 'Mattia Maita', position: 'MID', rating: 71, age: 30 },
      { name: 'Boris Radunovic', position: 'GK', rating: 72, age: 28 },
      { name: 'Valerio Di Cesare', position: 'DEF', rating: 70, age: 41 }
  ]),
  createTeam('SAL', 'Salernitana', LeagueLevel.SERIE_B, 72, 72, 71, 'bg-red-900', '🌊', [
      { name: 'Simy', position: 'FWD', rating: 73, age: 32 },
      { name: 'Daniele Verde', position: 'FWD', rating: 74, age: 28 },
      { name: 'Luigi Sepe', position: 'GK', rating: 73, age: 33 },
      { name: 'Giulio Maggiore', position: 'MID', rating: 73, age: 26 },
      { name: 'Franco Tongya', position: 'MID', rating: 72, age: 22 }
  ]),
  createTeam('MOD', 'Modena', LeagueLevel.SERIE_B, 71, 71, 71, 'bg-yellow-400 text-blue-900', '🟡', [
      { name: 'Pedro Mendes', position: 'FWD', rating: 73, age: 25 },
      { name: 'Antonio Palumbo', position: 'MID', rating: 73, age: 28 },
      { name: 'Gregoire Defrel', position: 'FWD', rating: 74, age: 33 },
      { name: 'Riccardo Gagno', position: 'GK', rating: 72, age: 26 },
      { name: 'Thomas Battistella', position: 'MID', rating: 71, age: 22 }
  ]),
  createTeam('CAT', 'Catanzaro', LeagueLevel.SERIE_B, 70, 70, 69, 'bg-yellow-500 text-red-600', '🦅', [
      { name: 'Pietro Iemmello', position: 'FWD', rating: 74, age: 32 },
      { name: 'Tommaso Biasci', position: 'FWD', rating: 71, age: 29 },
      { name: 'Mirko Pigliacelli', position: 'GK', rating: 71, age: 31 },
      { name: 'Jacopo Petriccione', position: 'MID', rating: 71, age: 29 }
  ]),
  createTeam('FRO', 'Frosinone', LeagueLevel.SERIE_B, 73, 72, 71, 'bg-yellow-400 text-blue-600', '🦁', [
      { name: 'Giuseppe Ambrosino', position: 'FWD', rating: 71, age: 20 },
      { name: 'Luca Garritano', position: 'MID', rating: 72, age: 30 },
      { name: 'Riccardo Marchizza', position: 'DEF', rating: 73, age: 26 },
      { name: 'Anthony Partipilo', position: 'FWD', rating: 73, age: 29 },
      { name: 'Ebrima Darboe', position: 'MID', rating: 71, age: 23 }
  ]),
  createTeam('SUD', 'Sudtirol', LeagueLevel.SERIE_B, 69, 70, 70, 'bg-white text-red-700', '🏔️', [
      { name: 'Daniele Casiraghi', position: 'MID', rating: 72, age: 31 },
      { name: 'Raphael Odogwu', position: 'FWD', rating: 70, age: 33 },
      { name: 'Jasmin Kurtic', position: 'MID', rating: 71, age: 35 },
      { name: 'Giacomo Poluzzi', position: 'GK', rating: 70, age: 36 }
  ]),
  createTeam('REG', 'Reggiana', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-red-800', '🟫', [
      { name: 'Cedric Gondo', position: 'FWD', rating: 71, age: 27 },
      { name: 'Luca Vido', position: 'FWD', rating: 70, age: 27 },
      { name: 'Francesco Bardi', position: 'GK', rating: 71, age: 32 },
      { name: 'Manuel Portanova', position: 'MID', rating: 71, age: 24 }
  ]),
  createTeam('COS', 'Cosenza', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-blue-900 text-red-600', '🐺', [
      { name: 'Tommaso Fumagalli', position: 'FWD', rating: 70, age: 24 },
      { name: 'Christian Dalle Mura', position: 'DEF', rating: 70, age: 22 },
      { name: 'Manuel Ricciardi', position: 'MID', rating: 69, age: 24 },
      { name: 'Alessandro Micai', position: 'GK', rating: 71, age: 31 }
  ]),
  createTeam('CIT', 'Cittadella', LeagueLevel.SERIE_B, 68, 69, 69, 'bg-red-800', '🏰', [
      { name: 'Simone Branca', position: 'MID', rating: 71, age: 32 },
      { name: 'Elhan Kastrati', position: 'GK', rating: 70, age: 27 },
      { name: 'Luca Pandolfi', position: 'FWD', rating: 70, age: 26 },
      { name: 'Alessio Vita', position: 'MID', rating: 70, age: 31 }
  ]),
  createTeam('CES', 'Cesena', LeagueLevel.SERIE_B, 71, 70, 69, 'bg-black text-white', '🐴', [
      { name: 'Cristian Shpendi', position: 'FWD', rating: 72, age: 21 },
      { name: 'Augustus Kargbo', position: 'FWD', rating: 70, age: 25 },
      { name: 'Simone Bastoni', position: 'MID', rating: 73, age: 27 },
      { name: 'Mirko Antonucci', position: 'FWD', rating: 72, age: 25 }
  ]),
  createTeam('MAN', 'Mantova', LeagueLevel.SERIE_B, 69, 69, 68, 'bg-red-500', '⚪', [
      { name: 'Leonardo Mancuso', position: 'FWD', rating: 71, age: 32 },
      { name: 'Mattia Aramu', position: 'MID', rating: 72, age: 29 },
      { name: 'Marco Festa', position: 'GK', rating: 70, age: 32 },
      { name: 'Davide Bragantini', position: 'FWD', rating: 69, age: 21 }
  ]),
  createTeam('JUVN', 'Juve Stabia', LeagueLevel.SERIE_B, 68, 67, 66, 'bg-yellow-400 text-blue-800', '🐝', [
      { name: 'Andrea Adorante', position: 'FWD', rating: 69, age: 24 },
      { name: 'Demba Thiam', position: 'GK', rating: 70, age: 26 },
      { name: 'Kevin Piscopo', position: 'FWD', rating: 69, age: 26 },
      { name: 'Nicola Mosti', position: 'MID', rating: 68, age: 26 }
  ]),
  createTeam('CAR', 'Carrarese', LeagueLevel.SERIE_B, 67, 67, 66, 'bg-blue-400 text-yellow-400', '⛰️', [
      { name: 'Leonardo Cerri', position: 'FWD', rating: 68, age: 21 },
      { name: 'Mattia Finotto', position: 'FWD', rating: 69, age: 31 },
      { name: 'Marco Bleve', position: 'GK', rating: 69, age: 28 },
      { name: 'Simone Panico', position: 'FWD', rating: 68, age: 22 }
  ]),
];

export const ALL_TEAMS = [...SERIE_A_TEAMS, ...SERIE_B_TEAMS];
