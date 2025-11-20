
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

// Fisher-Yates Shuffle
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Selects a player based on weights.
 */
const selectPlayer = (team: Team, type: 'GOAL' | 'CARD' | 'CHANCE', excludedIds: Set<string> = new Set()): Player => {
  let candidates = team.players;
  
  if (excludedIds.size > 0) {
    candidates = candidates.filter(p => !excludedIds.has(p.id));
  }

  if (candidates.length === 0) return team.players[0];
  
  const weightedList: { player: Player, weight: number }[] = candidates.map(p => {
    let weight = 1;
    
    if (type === 'GOAL' || type === 'CHANCE') {
      if (p.position === 'FWD') weight = 12;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'DEF') weight = 1;
      else weight = 0.1;
      weight *= Math.pow(p.rating / 50, 3); 
    } else if (type === 'CARD') {
      if (p.position === 'DEF') weight = 10;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'FWD') weight = 2;
      else weight = 0.5;
    }

    return { player: p, weight };
  });

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
  const sentOffPlayers = new Set<string>(); 

  // 1. Calculate Team Strengths with greater emphasis on rating gaps
  
  // Control Calculation (Midfield dominance)
  // Use a power curve to exaggerate differences. A team with 90 MID vs 70 MID should dominate significantly.
  const homeStrength = Math.pow(home.mid, 2) + Math.pow(home.def, 1.5) + Math.pow(home.att, 1.5);
  const awayStrength = Math.pow(away.mid, 2) + Math.pow(away.def, 1.5) + Math.pow(away.att, 1.5);
  
  // Home Advantage: Adds a raw multiplier to strength
  const homeAdvantage = 1.1; 
  const totalStrength = (homeStrength * homeAdvantage) + awayStrength;
  
  const homePossession = (homeStrength * homeAdvantage) / totalStrength; // 0.0 to 1.0

  // Attack vs Defense Ratios (Goal Probability)
  // We use Math.pow(ratio, 2.5) to make the strong teams much more lethal against weak defenses.
  const baseGoalChance = 0.014; // Base probability per minute
  
  const homeAttRatio = home.att / away.def;
  const awayAttRatio = away.att / home.def;

  // If Ratio is 1.2 (90 vs 75), pow(1.2, 2.5) ~= 1.57 multiplier
  // If Ratio is 0.8 (75 vs 90), pow(0.8, 2.5) ~= 0.57 multiplier
  const homeGoalProb = baseGoalChance * Math.pow(homeAttRatio, 2.5) * homeAdvantage;
  const awayGoalProb = baseGoalChance * Math.pow(awayAttRatio, 2.5);

  // 2. Loop through 90 Minutes
  for (let minute = 1; minute <= 90; minute++) {
    // Whistles
    if (minute === 1) {
      events.push({ minute, type: 'whistle', text: "The referee blows the whistle, and we are underway!", isImportant: false });
      continue;
    }
    if (minute === 46) {
      events.push({ minute, type: 'whistle', text: "Second half begins.", isImportant: false });
      continue;
    }

    // Possession check for this specific minute
    // Add some random variance so weak teams still get *some* ball
    const isHomeAttacking = Math.random() < homePossession;
    
    if (isHomeAttacking) {
      // Home Team Attack
      if (Math.random() < homeGoalProb) {
        // GOAL
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
        // Missed Chance
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
      if (Math.random() < awayGoalProb) {
        // GOAL
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
        // Missed Chance
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

    // Cards Logic (Independent of possession)
    if (Math.random() < 0.035) {
      const isHomeCard = Math.random() < 0.4;
      const team = isHomeCard ? home : away;
      const offender = selectPlayer(team, 'CARD', sentOffPlayers);
      
      const isRed = Math.random() < 0.03; // Slightly lower red card chance
      
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
    
    // CRITICAL: Shuffle teams before generating schedule so matchups are random every season
    const tempTeams = shuffleArray(teams);
    
    const fixedTeam = tempTeams.shift(); // Remove first team to be the pivot
    
    if (!fixedTeam) return [];

    // First Half of the Season
    for (let round = 0; round < rounds; round++) {
        const weekMatches: Match[] = [];
        
        // 1. Match involving the Fixed Team
        const t2 = tempTeams[0];
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

        // 2. Other Matches
        for (let i = 1; i < tempTeams.length / 2; i++) {
            const t1 = tempTeams[i];
            const t2 = tempTeams[tempTeams.length - i];
            
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

        // Rotate
        const first = tempTeams.shift();
        if (first) tempTeams.push(first);
    }

    // Second Half
    const secondHalf: Match[][] = [];
    schedule.forEach((weekMatches, idx) => {
        const returnMatches = weekMatches.map(m => ({
            ...m,
            id: `R${idx + rounds}-${m.awayTeamId}-${m.homeTeamId}`,
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
