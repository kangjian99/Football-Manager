
import { Team, Match, MatchEvent, Player } from '../types';

// --- Constants & Templates ---

const GOAL_TEMPLATES = [
  "{player} unleashes a thunderbolt from 25 yards! What a goal!",
  "{player} rises highest at the back post to head it home!",
  "Brilliant team move finished off by {player} with a calm tap-in.",
  "{player} dribbles past two defenders and slots it into the bottom corner!",
  "A defensive mix-up allows {player} to steal the ball and score!",
  "{player} smashes a volley into the roof of the net!",
  "Cool as you like! {player} chips the goalkeeper.",
  "{player} converts the penalty with confidence."
];

const CHANCE_TEMPLATES = [
  "{player} hits the post! So close!",
  "Great save by the keeper to deny {player}!",
  "{player} fires just wide of the upright.",
  "Last ditch tackle denies {player} a clear goalscoring opportunity."
];

const YELLOW_CARD_TEMPLATES = [
  "Late challenge by {player}. The referee shows a yellow card.",
  "{player} pulls the shirt of the opponent. Tactical foul, yellow card.",
  "Arguments with the referee earn {player} a booking.",
  "Reckless slide tackle from {player}."
];

const RED_CARD_TEMPLATES = [
    "{player} goes in with two feet! Straight Red Card!",
    "Disgraceful behavior from {player}, the referee has no choice. Red Card!",
    "{player} denies a clear goalscoring opportunity. Sent off!",
    "Second yellow for {player}! He's off!"
];

// --- Core Helper Functions ---

const getRandomTemplate = (templates: string[], player: Player): string => {
  const t = templates[Math.floor(Math.random() * templates.length)];
  return t.replace("{player}", player.name);
};

/**
 * Selects a player based on weights.
 * Goal logic: FWD > MID > DEF > GK. Rating acts as multiplier.
 * Card logic: DEF > MID > FWD > GK.
 * Excludes players in the excludedIds set (e.g., Red Cards).
 */
const selectPlayer = (team: Team, type: 'GOAL' | 'CARD' | 'CHANCE', excludedIds: Set<string> = new Set()): Player => {
  let candidates = team.players;
  
  // Filter out excluded players (e.g. Red Cards)
  if (excludedIds.size > 0) {
    candidates = candidates.filter(p => !excludedIds.has(p.id));
  }

  // Fallback if everyone is sent off (highly unlikely safety check)
  if (candidates.length === 0) return team.players[0];
  
  // Calculate weight for each player
  const weightedList: { player: Player, weight: number }[] = candidates.map(p => {
    let weight = 1;
    
    if (type === 'GOAL' || type === 'CHANCE') {
      // Position bias
      if (p.position === 'FWD') weight = 12;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'DEF') weight = 1;
      else weight = 0.1; // GK

      // Rating bias (exponential to favor stars)
      weight *= Math.pow(p.rating / 50, 3); 
    } else if (type === 'CARD') {
      // Position bias
      if (p.position === 'DEF') weight = 10;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'FWD') weight = 2;
      else weight = 0.5;
      
      // Inverse rating bias (worse players maybe foul more? or aggressive ones. keeping simple)
    }

    return { player: p, weight };
  });

  // Weighted Random selection
  const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedList) {
    random -= item.weight;
    if (random <= 0) return item.player;
  }

  return candidates[0];
};

// --- Main Simulation Logic ---

export const simulateMatch = (home: Team, away: Team, week: number, existingId?: string): Match => {
  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  const sentOffPlayers = new Set<string>(); // Track players who received a red card

  // 1. Calculate Team Strengths
  // Home Advantage adds to control
  const homeControl = (home.mid * 1.5 + home.def + home.att) / 3.5 + 5; 
  const awayControl = (away.mid * 1.5 + away.def + away.att) / 3.5;
  
  const totalControl = homeControl + awayControl;
  const homePossession = homeControl / totalControl; // e.g., 0.55

  // Attack vs Defense Ratios
  const homeAttThreat = (home.att / away.def) * 0.018; // Base chance per minute
  const awayAttThreat = (away.att / home.def) * 0.016;

  // 2. Loop through 90 Minutes
  for (let minute = 1; minute <= 90; minute++) {
    const roll = Math.random();

    // Commentary for start/half/end
    if (minute === 1) {
      events.push({ minute, type: 'whistle', text: "The referee blows the whistle, and we are underway!", isImportant: false });
      continue;
    }
    if (minute === 46) {
      events.push({ minute, type: 'whistle', text: "Second half begins.", isImportant: false });
      continue;
    }

    // Event logic
    // Determine who has the ball/momentum for this tick based on possession
    const isHomeAttacking = Math.random() < homePossession;
    
    if (isHomeAttacking) {
      // Home Team Attack
      if (Math.random() < homeAttThreat) {
        // GOAL for Home
        const scorer = selectPlayer(home, 'GOAL', sentOffPlayers);
        homeGoals++;
        events.push({
          minute,
          type: 'goal',
          text: getRandomTemplate(GOAL_TEMPLATES, scorer),
          teamId: home.id,
          playerId: scorer.id,
          playerName: scorer.name,
          isImportant: true
        });
      } else if (Math.random() < 0.015) {
        // Missed Chance / Save
        const player = selectPlayer(home, 'CHANCE', sentOffPlayers);
        events.push({
          minute,
          type: 'commentary',
          text: getRandomTemplate(CHANCE_TEMPLATES, player),
          teamId: home.id,
          isImportant: false
        });
      }
    } else {
      // Away Team Attack
      if (Math.random() < awayAttThreat) {
        // GOAL for Away
        const scorer = selectPlayer(away, 'GOAL', sentOffPlayers);
        awayGoals++;
        events.push({
          minute,
          type: 'goal',
          text: getRandomTemplate(GOAL_TEMPLATES, scorer),
          teamId: away.id,
          playerId: scorer.id,
          playerName: scorer.name,
          isImportant: true
        });
      } else if (Math.random() < 0.015) {
        // Missed Chance / Save
        const player = selectPlayer(away, 'CHANCE', sentOffPlayers);
        events.push({
          minute,
          type: 'commentary',
          text: getRandomTemplate(CHANCE_TEMPLATES, player),
          teamId: away.id,
          isImportant: false
        });
      }
    }

    // Cards Logic
    // Increased probability (~4-5 cards per game)
    if (Math.random() < 0.035) {
      const isHomeCard = Math.random() < 0.4; // Fairer distribution
      const team = isHomeCard ? home : away;
      
      // Ensure we don't card a player who is already sent off
      const offender = selectPlayer(team, 'CARD', sentOffPlayers);
      
      // Red Card Logic (approx 5% of cards)
      const isRed = Math.random() < 0.05; 
      
      if (isRed) {
        sentOffPlayers.add(offender.id);
      }

      events.push({
        minute,
        type: 'card',
        cardType: isRed ? 'red' : 'yellow',
        text: getRandomTemplate(isRed ? RED_CARD_TEMPLATES : YELLOW_CARD_TEMPLATES, offender),
        teamId: team.id,
        playerId: offender.id,
        playerName: offender.name,
        isImportant: true
      });
    }
  }

  return {
    id: existingId || `${home.id}-${away.id}-${week}`,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: homeGoals,
    awayScore: awayGoals,
    played: true,
    week,
    events
  };
};

export const generateSchedule = (teams: Team[]): Match[][] => {
    const schedule: Match[][] = [];
    const numTeams = teams.length;
    if (numTeams % 2 !== 0) return []; 
    
    const rounds = numTeams - 1;
    const tempTeams = [...teams];
    const fixedTeam = tempTeams.shift(); // Remove first team to be the pivot
    
    if (!fixedTeam) return [];

    // First Half of the Season
    for (let round = 0; round < rounds; round++) {
        const weekMatches: Match[] = [];
        
        // 1. Match involving the Fixed Team
        const t2 = tempTeams[0];
        // Alternating rule for Fixed Team: Home on even rounds (0, 2, 4...)
        const fixedIsHome = round % 2 === 0;
        
        weekMatches.push({
            id: `R${round}-${fixedTeam.id}-${t2.id}`,
            homeTeamId: fixedIsHome ? fixedTeam.id : t2.id,
            awayTeamId: fixedIsHome ? t2.id : fixedTeam.id,
            homeScore: 0,
            awayScore: 0,
            played: false,
            week: round + 1,
            events: []
        });

        // 2. Other Matches (Standard Circle Method)
        // tempTeams length is N-1 (Odd). Pair indices i with N-1-i
        for (let i = 1; i < tempTeams.length / 2; i++) {
            const t1 = tempTeams[i];
            const t2 = tempTeams[tempTeams.length - i];
            
            // Alternating rule for rotating teams: 
            // Even indices (Top Row in diagram) play Home
            // Odd indices (Top Row in diagram) play Away
            // This breaks the simple sequential pattern and ensures balance as teams rotate index.
            const firstIsHome = i % 2 === 0;

            weekMatches.push({
                id: `R${round}-${t1.id}-${t2.id}`,
                homeTeamId: firstIsHome ? t1.id : t2.id,
                awayTeamId: firstIsHome ? t2.id : t1.id,
                homeScore: 0,
                awayScore: 0,
                played: false,
                week: round + 1,
                events: []
            });
        }

        schedule.push(weekMatches);

        // Rotate the tempTeams array for next round
        // Take first element (after the fixed slot) and move it to the end
        const first = tempTeams.shift();
        if (first) tempTeams.push(first);
    }

    // Second Half of the Season (Mirror of First Half with swapped Home/Away)
    const secondHalf: Match[][] = [];
    schedule.forEach((weekMatches, idx) => {
        const returnMatches = weekMatches.map(m => ({
            ...m,
            id: `R${idx + rounds}-${m.awayTeamId}-${m.homeTeamId}`, // Swap ID key to be unique
            homeTeamId: m.awayTeamId,
            awayTeamId: m.homeTeamId,
            homeScore: 0,
            awayScore: 0,
            played: false,
            week: idx + rounds + 1,
            events: []
        }));
        secondHalf.push(returnMatches);
    });

    return [...schedule, ...secondHalf];
};
