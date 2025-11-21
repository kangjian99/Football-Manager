


import { Team, Match, MatchEvent, Player } from '../types';

// --- Constants & Templates ---

const GOAL_TEMPLATES = [
  "{player} unleashes a thunderbolt from 25 yards! What a goal!",
  "{player} rises highest at the back post to head it home!",
  "Brilliant team move finished off by {player} with a calm tap-in.",
  "{player} dribbles past two defenders and slots it into the bottom corner!",
  "A defensive mix-up allows {player} to steal the ball and score!",
  "{player} smashes a volley into the roof of the net!",
  "Cool as you like! {player} chips the goalkeeper."
];

const PENALTY_AWARD_TEMPLATES = [
    "PENALTY! {def} trips {att} inside the box! The referee points to the spot immediately.",
    "Handball! {def} blocks the shot with his arm. Penalty given!",
    "Clumsy challenge by {def} on {att}. It's a clear penalty!",
    "The referee blows the whistle! {def} pulls down {att} in the area. Penalty kick!"
];

const PENALTY_GOAL_TEMPLATES = [
    "{player} sends the keeper the wrong way! Calmly finished.",
    "{player} smashes the penalty into the top corner! Unstoppable.",
    "Ice cold nerves! {player} slots the penalty home.",
    "The keeper gets a hand to it, but {player}'s penalty is too powerful!"
];

const PENALTY_MISS_TEMPLATES = [
    "SAVED! The keeper guesses correctly and denies {player}!",
    "MISSED! {player} drags the penalty wide of the post. A huge let off!",
    "OFF THE BAR! {player} goes for power but hits the woodwork!",
    "Terrible penalty from {player}, straight at the goalkeeper."
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

const SECOND_YELLOW_TEMPLATES = [
    "It's a second yellow for {player}! He is sent off!",
    "{player} commits another foul and the referee reaches for the pocket. Second yellow, RED CARD!",
    "Foolish from {player}, he was already booked! He takes an early shower."
];

const RED_CARD_TEMPLATES = [
    "{player} goes in with two feet! Straight Red Card!",
    "Disgraceful behavior from {player}, the referee has no choice. Red Card!",
    "{player} denies a clear goalscoring opportunity. Sent off!",
    "Violent conduct from {player} behind the play! Straight Red!"
];

const SUB_TEMPLATES = [
    "Substitution for {team}: {in} replaces {out}.",
    "{team} make a change: {out} comes off for {in}.",
    "Fresh legs for {team} as {in} comes on for {out}.",
    "Tactical change: {in} enters the fray, replacing {out}."
];

// --- Core Helper Functions ---

const getRandomTemplate = (templates: string[], player: Player, secondPlayer?: Player): string => {
  let t = templates[Math.floor(Math.random() * templates.length)];
  t = t.replace("{player}", player.name).replace("{att}", player.name);
  if (secondPlayer) {
      t = t.replace("{def}", secondPlayer.name).replace("{gk}", secondPlayer.name);
  }
  return t;
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
 * Selects a player based on weights from a specific list (on-pitch players).
 */
const selectPlayer = (players: Player[], type: 'GOAL' | 'CARD' | 'CHANCE' | 'DEFENDER', excludedIds: Set<string> = new Set()): Player => {
  let candidates = players;
  
  if (excludedIds.size > 0) {
    candidates = candidates.filter(p => !excludedIds.has(p.id));
  }

  if (candidates.length === 0) return players[0];
  
  const weightedList: { player: Player, weight: number }[] = candidates.map(p => {
    let weight = 1;
    
    if (type === 'GOAL' || type === 'CHANCE') {
      if (p.position === 'FWD') weight = 12;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'DEF') weight = 1;
      else weight = 0.1;
      weight *= Math.pow(p.rating / 50, 3); 
    } else if (type === 'CARD' || type === 'DEFENDER') {
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

// Helpers for lineup management
// EXPORTED so UI can display lineups
export const getStartingLineup = (team: Team): { starting: Player[], bench: Player[] } => {
    // FILTER AVAILABLE PLAYERS (Exclude Banned)
    const availablePlayers = team.players.filter(p => !p.matchesBanned || p.matchesBanned <= 0);

    const gks = availablePlayers.filter(p => p.position === 'GK');
    const outfield = availablePlayers.filter(p => p.position !== 'GK');

    // If no GK available due to bans/injuries, pick the highest rated outfield player to play GK (edge case)
    const startingGK = gks.length > 0 ? gks[0] : (outfield.length > 0 ? outfield[0] : team.players[0]);
    
    // Remove the chosen GK from outfield list if he was pulled from there
    let remainingOutfield = gks.length > 0 ? outfield : outfield.slice(1);
    
    const startingOutfield = remainingOutfield.slice(0, 10);
    const benchOutfield = remainingOutfield.slice(10);
    const benchGKs = gks.length > 1 ? gks.slice(1) : [];

    const starting = [startingGK, ...startingOutfield];
    const bench = [...benchGKs, ...benchOutfield];

    // Sort bench by rating
    bench.sort((a, b) => b.rating - a.rating);

    return { starting, bench };
};

// --- Main Simulation Logic ---

export const simulateMatch = (home: Team, away: Team, week: number, existingId?: string): Match => {
  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  const sentOffPlayers = new Set<string>(); 
  const matchYellowCards = new Set<string>(); // Track yellow cards for this match only

  // Initialize Lineups
  const homeSquad = getStartingLineup(home);
  const awaySquad = getStartingLineup(away);

  let homeOnPitch = [...homeSquad.starting];
  let homeBench = [...homeSquad.bench];
  let homeSubsUsed = 0;

  let awayOnPitch = [...awaySquad.starting];
  let awayBench = [...awaySquad.bench];
  let awaySubsUsed = 0;

  const MAX_SUBS = Math.floor(3 + Math.random() * 3); // 3-5 subs

  // Stoppage Time Generation
  const firstHalfStoppage = Math.floor(Math.random() * 3); // 0, 1, or 2 minutes
  const secondHalfStoppage = Math.floor(Math.random() * 6); // 0 to 5 minutes

  // Strength Calculations
  const homeStrength = Math.pow(home.mid, 2) + Math.pow(home.def, 1.5) + Math.pow(home.att, 1.5);
  const awayStrength = Math.pow(away.mid, 2) + Math.pow(away.def, 1.5) + Math.pow(away.att, 1.5);
  const homeAdvantage = 1.1; 
  const totalStrength = (homeStrength * homeAdvantage) + awayStrength;
  const homePossession = (homeStrength * homeAdvantage) / totalStrength;
  
  const baseGoalChance = 0.020; // Slightly reduced to accommodate penalties
  const homeAttRatio = home.att / away.def;
  const awayAttRatio = away.att / home.def;
  const homeGoalProb = baseGoalChance * Math.pow(homeAttRatio, 2.5) * homeAdvantage;
  const awayGoalProb = baseGoalChance * Math.pow(awayAttRatio, 2.5);

  // Inner function to simulate a single minute
  const simulateMinute = (minute: number, extraMinute: number = 0) => {
    // Special start of match
    if (minute === 1 && extraMinute === 0) {
        events.push({ minute, type: 'whistle', text: "The referee blows the whistle, and we are underway!", isImportant: false });
        return;
    }
    // Special start of second half
    if (minute === 46 && extraMinute === 0) {
        events.push({ minute, type: 'whistle', text: "Second half begins.", isImportant: false });
        return;
    }

    // --- SUBSTITUTION LOGIC ---
    if (minute > 55) {
        let subProb = 0.02;
        if (minute > 70) subProb = 0.08;
        if (minute > 80) subProb = 0.15;
        if (extraMinute > 0) subProb = 0.3;

        // Home Sub
        if (homeSubsUsed < MAX_SUBS && Math.random() < subProb) {
            const candidatesOff = homeOnPitch.filter(p => p.position !== 'GK' && !sentOffPlayers.has(p.id));
            if (candidatesOff.length > 0) {
                const subOff = candidatesOff[Math.floor(Math.random() * candidatesOff.length)];
                const candidatesOn = homeBench.filter(p => p.position === subOff.position);
                const subOn = candidatesOn.length > 0 ? candidatesOn[0] : homeBench[0];

                if (subOn) {
                    homeOnPitch = homeOnPitch.filter(p => p.id !== subOff.id);
                    homeOnPitch.push(subOn);
                    homeBench = homeBench.filter(p => p.id !== subOn.id);
                    homeSubsUsed++;

                    let t = SUB_TEMPLATES[Math.floor(Math.random() * SUB_TEMPLATES.length)];
                    t = t.replace("{team}", home.name).replace("{in}", subOn.name).replace("{out}", subOff.name);
                    
                    events.push({
                        minute,
                        extraMinute,
                        type: 'sub',
                        text: t,
                        teamId: home.id,
                        subOn: { id: subOn.id, name: subOn.name },
                        subOff: { id: subOff.id, name: subOff.name },
                        isImportant: false
                    });
                    return;
                }
            }
        }

        // Away Sub
        if (awaySubsUsed < MAX_SUBS && Math.random() < subProb) {
            const candidatesOff = awayOnPitch.filter(p => p.position !== 'GK' && !sentOffPlayers.has(p.id));
            if (candidatesOff.length > 0) {
                const subOff = candidatesOff[Math.floor(Math.random() * candidatesOff.length)];
                const candidatesOn = awayBench.filter(p => p.position === subOff.position);
                const subOn = candidatesOn.length > 0 ? candidatesOn[0] : awayBench[0];

                if (subOn) {
                    awayOnPitch = awayOnPitch.filter(p => p.id !== subOff.id);
                    awayOnPitch.push(subOn);
                    awayBench = awayBench.filter(p => p.id !== subOn.id);
                    awaySubsUsed++;

                    let t = SUB_TEMPLATES[Math.floor(Math.random() * SUB_TEMPLATES.length)];
                    t = t.replace("{team}", away.name).replace("{in}", subOn.name).replace("{out}", subOff.name);
                    
                    events.push({
                        minute,
                        extraMinute,
                        type: 'sub',
                        text: t,
                        teamId: away.id,
                        subOn: { id: subOn.id, name: subOn.name },
                        subOff: { id: subOff.id, name: subOff.name },
                        isImportant: false
                    });
                    return;
                }
            }
        }
    }

    // Possession check
    const isHomeAttacking = Math.random() < homePossession;
    const attackingTeam = isHomeAttacking ? home : away;
    const defendingTeam = isHomeAttacking ? away : home;
    const attackingPitch = isHomeAttacking ? homeOnPitch : awayOnPitch;
    const defendingPitch = isHomeAttacking ? awayOnPitch : homeOnPitch;

    // Penalty Check (Independent of normal goals, low probability)
    // Approx 0.35 pens per game ~ 0.0038 per minute
    if (Math.random() < 0.0038) {
        const taker = selectPlayer(attackingPitch, 'GOAL', sentOffPlayers); // Best forward usually
        const fouler = selectPlayer(defendingPitch, 'DEFENDER', sentOffPlayers);

        // Event 1: Penalty Awarded
        events.push({
            minute,
            extraMinute,
            type: 'penalty-award',
            text: getRandomTemplate(PENALTY_AWARD_TEMPLATES, taker, fouler),
            teamId: attackingTeam.id,
            isImportant: true
        });

        // Event 2: The Kick (Conversion rate ~76%)
        const conversionRate = 0.76;
        if (Math.random() < conversionRate) {
            if (isHomeAttacking) homeGoals++; else awayGoals++;
            events.push({
                minute,
                extraMinute,
                type: 'goal', // Using standard goal type for scoreboard logic, but text distinguishes it
                text: getRandomTemplate(PENALTY_GOAL_TEMPLATES, taker),
                teamId: attackingTeam.id,
                playerId: taker.id,
                playerName: taker.name,
                isImportant: true
            });
        } else {
            events.push({
                minute,
                extraMinute,
                type: 'penalty-miss',
                text: getRandomTemplate(PENALTY_MISS_TEMPLATES, taker),
                teamId: attackingTeam.id,
                playerId: taker.id,
                playerName: taker.name,
                isImportant: true
            });
        }
        return; // Penalty drama takes up the minute
    }

    // Normal Goal Logic
    if (isHomeAttacking) {
      if (Math.random() < homeGoalProb) {
        const scorer = selectPlayer(homeOnPitch, 'GOAL', sentOffPlayers);
        homeGoals++;
        events.push({
          minute,
          extraMinute,
          type: 'goal',
          text: getRandomTemplate(GOAL_TEMPLATES, scorer),
          teamId: home.id,
          playerId: scorer.id,
          playerName: scorer.name,
          isImportant: true
        });
      } else if (Math.random() < 0.015) {
        const player = selectPlayer(homeOnPitch, 'CHANCE', sentOffPlayers);
        events.push({
          minute,
          extraMinute,
          type: 'commentary',
          text: getRandomTemplate(CHANCE_TEMPLATES, player),
          teamId: home.id,
          isImportant: false
        });
      }
    } else {
      if (Math.random() < awayGoalProb) {
        const scorer = selectPlayer(awayOnPitch, 'GOAL', sentOffPlayers);
        awayGoals++;
        events.push({
          minute,
          extraMinute,
          type: 'goal',
          text: getRandomTemplate(GOAL_TEMPLATES, scorer),
          teamId: away.id,
          playerId: scorer.id,
          playerName: scorer.name,
          isImportant: true
        });
      } else if (Math.random() < 0.015) {
        const player = selectPlayer(awayOnPitch, 'CHANCE', sentOffPlayers);
        events.push({
          minute,
          extraMinute,
          type: 'commentary',
          text: getRandomTemplate(CHANCE_TEMPLATES, player),
          teamId: away.id,
          isImportant: false
        });
      }
    }

    // Cards Logic
    if (Math.random() < 0.035) {
      const isHomeCard = Math.random() < 0.4;
      const activePlayers = isHomeCard ? homeOnPitch : awayOnPitch;
      const team = isHomeCard ? home : away;
      const offender = selectPlayer(activePlayers, 'CARD', sentOffPlayers);
      
      let isRed = Math.random() < 0.03;
      let cardText = "";

      if (!isRed) {
          // Check if player already has a yellow card in THIS match
          if (matchYellowCards.has(offender.id)) {
              isRed = true; // Convert to Red
              cardText = getRandomTemplate(SECOND_YELLOW_TEMPLATES, offender);
          } else {
              matchYellowCards.add(offender.id);
              cardText = getRandomTemplate(YELLOW_CARD_TEMPLATES, offender);
          }
      } else {
          cardText = getRandomTemplate(RED_CARD_TEMPLATES, offender);
      }

      if (isRed) {
          sentOffPlayers.add(offender.id);
      }

      events.push({
        minute,
        extraMinute,
        type: 'card',
        cardType: isRed ? 'red' : 'yellow',
        text: cardText,
        teamId: team.id,
        playerId: offender.id,
        playerName: offender.name,
        isImportant: true
      });
    }
  };

  // --- Simulation Loop Phases ---

  // Phase 1: First Half (1-45)
  for (let m = 1; m <= 45; m++) {
      simulateMinute(m);
  }

  // Phase 2: First Half Stoppage
  if (firstHalfStoppage > 0) {
      events.push({ minute: 45, extraMinute: 0, type: 'whistle', text: `${firstHalfStoppage} minutes of stoppage time indicated.`, isImportant: false });
      for (let em = 1; em <= firstHalfStoppage; em++) {
          simulateMinute(45, em);
      }
  }
  // HT Whistle
  events.push({ 
      minute: 45, 
      extraMinute: firstHalfStoppage, 
      type: 'whistle', 
      text: "Half Time whistle blows.", 
      isImportant: false 
  });

  // Phase 3: Second Half (46-90)
  for (let m = 46; m <= 90; m++) {
      simulateMinute(m);
  }

  // Phase 4: Second Half Stoppage
  if (secondHalfStoppage > 0) {
      events.push({ minute: 90, extraMinute: 0, type: 'whistle', text: `${secondHalfStoppage} minutes of stoppage time indicated.`, isImportant: false });
      for (let em = 1; em <= secondHalfStoppage; em++) {
          simulateMinute(90, em);
      }
  }
  
  // FT Whistle
  events.push({ 
      minute: 90, 
      extraMinute: secondHalfStoppage, 
      type: 'whistle', 
      text: "Full Time! The referee ends the match.", 
      isImportant: true 
  });

  return {
    id: existingId || `${home.id}-${away.id}-${week}`,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: homeGoals,
    awayScore: awayGoals,
    played: true,
    week,
    events,
    firstHalfStoppage,
    secondHalfStoppage
  };
};

// Generate Round Robin Schedule (Circle Method)
// Now adaptable to any number of teams (including odd numbers via dummy team)
export const generateSchedule = (teams: Team[]): Match[][] => {
    let tempTeams = [...teams];
    
    // If odd number of teams, add a dummy "BYE" team
    // This allows the schedule generator to work for 21, 23, 25 teams etc.
    if (tempTeams.length % 2 !== 0) {
        tempTeams.push({ id: 'BYE', name: 'BYE', league: teams[0].league } as any);
    }

    const numTeams = tempTeams.length;
    const schedule: Match[][] = [];
    const rounds = numTeams - 1;
    
    // We shuffle the array (excluding the first fixed element if we want random first week matchups)
    // But standard circle method usually fixes one. Let's shuffle all initially for randomness.
    tempTeams = shuffleArray(tempTeams);
    
    const fixedTeam = tempTeams.shift(); // Keep one team fixed
    if (!fixedTeam) return [];

    // First Half of the Season
    for (let round = 0; round < rounds; round++) {
        const weekMatches: Match[] = [];
        
        // Match the fixed team against the first rotating team
        const t2 = tempTeams[0];
        const fixedIsHome = round % 2 === 0;

        // Only add match if neither team is the dummy 'BYE' team
        if (fixedTeam.id !== 'BYE' && t2.id !== 'BYE') {
            weekMatches.push({
                id: `R${round}-${fixedTeam.id}-${t2.id}`,
                homeTeamId: fixedIsHome ? fixedTeam.id : t2.id,
                awayTeamId: fixedIsHome ? t2.id : fixedTeam.id,
                homeScore: 0,
                awayScore: 0,
                played: false,
                week: round + 1,
                events: [],
                firstHalfStoppage: 0,
                secondHalfStoppage: 0
            });
        }

        // Match the rest of the pairs
        for (let i = 1; i < tempTeams.length / 2; i++) {
            const t1 = tempTeams[i];
            const t2 = tempTeams[tempTeams.length - i];
            
            if (t1.id !== 'BYE' && t2.id !== 'BYE') {
                const firstIsHome = i % 2 === 0;
                weekMatches.push({
                    id: `R${round}-${t1.id}-${t2.id}`,
                    homeTeamId: firstIsHome ? t1.id : t2.id,
                    awayTeamId: firstIsHome ? t2.id : t1.id,
                    homeScore: 0,
                    awayScore: 0,
                    played: false,
                    week: round + 1,
                    events: [],
                    firstHalfStoppage: 0,
                    secondHalfStoppage: 0
                });
            }
        }
        
        schedule.push(weekMatches);
        
        // Rotate elements: move first element to end
        const first = tempTeams.shift();
        if (first) tempTeams.push(first);
    }

    // Second Half of the Season (Mirror)
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
            events: [],
            firstHalfStoppage: 0,
            secondHalfStoppage: 0
        }));
        secondHalf.push(returnMatches);
    });

    return [...schedule, ...secondHalf];
};