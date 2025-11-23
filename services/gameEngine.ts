
import { Team, Match, MatchEvent, Player } from '../types';

// --- Constants & Templates ---

const ATTACKER_GOAL_TEMPLATES = [
  "精彩的团队配合！{player} 门前冷静推射得手。",
  "{player} 连过两人，突入禁区将球送入球门死角！",
  "后防线出现失误，{player} 断球后轻松破门！",
  "{player} 凌空抽射！皮球直挂球门顶网！",
  "四两拨千斤！{player} 面对出击的门将轻巧吊射得分。",
  "{player} 接到直塞球形成单刀，晃过门将打空门得手！",
  "门前嗅觉灵敏！{player} 补射入网。",
  "教科书般的反击！{player} 完成致命一击。",
  "{player} 低射远角，皮球擦着立柱钻入网窝！",
  "{player} 在30码外起脚怒射！世界波！球进了！",
  "百步穿杨！{player} 禁区外一脚重炮轰门，门将鞭长莫及！",
  "乱战中 {player} 抢在对方解围前一脚捅射得分！",
  "{player} 在禁区前沿横向盘带，突然起脚劲射破门！",
  "{player} 禁区内接传中球，抢点垫射入网！"
];

const DEFENDER_GOAL_TEMPLATES = [
  "角球机会 {player} 在人群中高高跃起，头球破门！",
  "{player} 在30码外起脚怒射！世界波！球进了！",
  "乱战中 {player} 抢在对方解围前一脚捅射得分！",
  "{player} 插上助攻，接到回传球大力抽射破网！",
  "{player} 利用定位球机会，前点甩头攻门得手！",
  "不可思议！后卫 {player} 带球推进到前场，一脚冷射洞穿球门！"
];

const GK_GOAL_TEMPLATES = [
  "难以置信！门将 {player} 冲到前场争顶角球，竟然头球破门！",
  "读秒绝杀！门将 {player} 在禁区混战中将球打进！",
  "门将 {player} 成为了英雄！他亲自进球拯救了比赛！"
];

const PENALTY_AWARD_TEMPLATES = [
  "点球！{def} 在禁区内绊倒了 {att}！裁判毫不犹豫指向点球点。",
  "手球犯规！{def} 用手臂阻挡了射门。点球！",
  "{def} 对 {att} 的拙劣犯规，这是一个毫无争议的点球！",
  "哨响了！{def} 在禁区内拉倒了 {att}。极刑！",
  "{def} 鲁莽的滑铲带倒了 {att}，裁判判罚点球！"
];

const PENALTY_GOAL_TEMPLATES = [
  "{player} 骗过门将，轻松将球推入反角。",
  "{player} 大力抽射球门上角！理论上的死角，无法扑救。",
  "拥有一颗大心脏！{player} 冷静主罚命中。",
  "门将虽然碰到了皮球，但 {player} 的射门力量太大了，球还是进了！",
  "勺子点球！{player} 艺高人胆大，戏耍了门将。",
  "{player} 助跑节奏变化，推射死角得手。"
];

const PENALTY_MISS_TEMPLATES = [
  "扑出去了！门将判断对了方向，拒之门外！",
  "打偏了！{player} 追求角度但这脚打偏了，太可惜了！",
  "中柱弹出！{player} 发力过猛，皮球狠狠砸在横梁上！",
  "质量极差的点球，{player} 把球直接送到了门将怀里。",
  "{player} 支撑脚打滑，一脚将球踢上了看台！"
];

const CHANCE_TEMPLATES = [
  "{player} 击中立柱！差之毫厘！",
  "门将做出世界级扑救，挡出了 {player} 的必进球！",
  "{player} 的射门滑门而出。",
  "关键时刻的铲断！阻挡了 {player} 的得分机会。",
  "{player} 错失良机！面对空门竟然打高了！",
  "神勇的指尖触球！门将把 {player} 的吊射托出了横梁！",
  "门线解围！{player} 的射门在进球前一瞬间被后卫踢出。"
];

const YELLOW_CARD_TEMPLATES = [
  "{player} 动作过大，裁判出示黄牌警告。",
  "{player} 拉拽对手球衣，战术犯规，吃到黄牌。",
  "因为对裁判判罚表示不满，{player} 被黄牌警告。",
  "{player} 鲁莽的滑铲。",
  "{player} 破坏了对方的反击机会，这是一张战术黄牌。"
];

const SECOND_YELLOW_TEMPLATES = [
  "{player} 吃到第二张黄牌！两黄变一红，被罚下场！",
  "{player} 再次犯规，裁判掏出了红牌！两黄变一红！",
  "太不理智了，{player} 身上已经有一张黄牌了！他将被提前罚下。",
  "这是自找麻烦，{player} 吃到第二张黄牌，红牌离场！"
];

const RED_CARD_TEMPLATES = [
  "{player} 双脚离地飞铲！直接红牌！",
  "{player} 行为恶劣，裁判别无选择。红牌罚下！",
  "{player} 破坏了明显的得分机会。被罚下场！",
  "{player} 报复性动作！直接红牌！",
  "极其危险的动作，{player} 被裁判直接驱逐出场。"
];

const SUB_TEMPLATES = [
  "{team} 换人：{in} 换下 {out}。",
  "{team} 做出调整：{out} 下场，{in} 替补登场。",
  "{team} 注入新鲜血液，{in} 换下了体力不支的 {out}。",
  "战术调整：{in} 披挂上阵，换下 {out}。",
  "看来 {out} 受伤无法坚持，{in} 临危受命。",
  "全场掌声雷动，{out} 被 {in} 换下。"
];

const INJURY_TEMPLATES = [
  "{player} 痛苦地倒在草坪上，队医进场了。",
  "{player} 捂着大腿肌肉，看来是拉伤了。",
  "一次激烈的碰撞后，{player} 无法坚持比赛。",
  "{player} 一瘸一拐地走向场边，无法继续比赛。",
  "情况不妙，{player} 被担架抬出了场外。"
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
 * Uses effectiveRating if available for better simulation accuracy.
 */
const selectPlayer = (
    players: Player[], 
    type: 'GOAL' | 'CARD' | 'CHANCE' | 'DEFENDER', 
    excludedIds: Set<string> = new Set(),
    isDesperate: boolean = false // If true, GK can be selected for goals
): Player => {
  let candidates = players;
  
  if (excludedIds.size > 0) {
    candidates = candidates.filter(p => !excludedIds.has(p.id));
  }

  if (candidates.length === 0) return players[0];
  
  const weightedList: { player: Player, weight: number }[] = candidates.map(p => {
    let weight = 1;
    const rating = p.effectiveRating || p.rating;
    
    if (type === 'GOAL' || type === 'CHANCE') {
      if (p.position === 'GK') {
          // GK only has weight if desperate (90+ min, losing by 1)
          weight = isDesperate ? 0.2 : 0; 
      } else if (p.position === 'FWD') {
          weight = 20;
      } else if (p.position === 'MID') {
          weight = 6;
      } else if (p.position === 'DEF') {
          weight = 1;
      } else {
          weight = 0.1;
      }
      weight *= Math.pow(rating / 50, 3); 
    } else if (type === 'CARD' || type === 'DEFENDER') {
      if (p.position === 'DEF') weight = 9;
      else if (p.position === 'MID') weight = 6;
      else if (p.position === 'FWD') weight = 3;
      else weight = 0.5; // GK rarely gets yellow cards for fouls compared to defenders
    }

    return { player: p, weight };
  });

  const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
  
  // If total weight is 0 (e.g. only GK available and not desperate), return random
  if (totalWeight <= 0) return candidates[0];

  let random = Math.random() * totalWeight;
  
  for (const item of weightedList) {
    random -= item.weight;
    if (random <= 0) return item.player;
  }

  return candidates[0];
};

/**
 * Selects a candidate to be substituted off.
 * Higher probability for players with Yellow Cards.
 * Very low probability for players who were just subbed in.
 */
const selectSubOffCandidate = (
    onPitch: Player[], 
    yellowCards: Set<string>, 
    subbedInIds: Set<string>, 
    sentOffIds: Set<string>
): Player | null => {
    // Filter valid candidates: Not GK, not sent off
    const candidates = onPitch.filter(p => p.position !== 'GK' && !sentOffIds.has(p.id));
    
    if (candidates.length === 0) return null;

    const weightedCandidates = candidates.map(p => {
        let weight = 10; // Base weight

        // High probability to sub off yellow carded players to avoid red
        if (yellowCards.has(p.id)) {
            weight += 50; 
        }

        // Very low probability to sub off a player who was just subbed in
        if (subbedInIds.has(p.id)) {
            weight = 0.5;
        }

        return { player: p, weight };
    });

    const totalWeight = weightedCandidates.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weightedCandidates) {
        random -= item.weight;
        if (random <= 0) return item.player;
    }
    
    // Fallback
    return candidates[0];
};


// Helpers for lineup management
export const getStartingLineup = (team: Team): { starting: Player[], bench: Player[], formation: string } => {
    // Filter out banned OR injured players
    const availablePlayers = team.players.filter(p => 
        (!p.matchesBanned || p.matchesBanned <= 0) && (!p.injury || p.injury <= 0)
    );
    
    // Add Match-Day Form Modifier (±3)
    const playersWithForm = availablePlayers.map(p => {
        const formMod = Math.floor(Math.random() * 7) - 3; // -3, -2, -1, 0, 1, 2, 3
        return {
            ...p,
            effectiveRating: p.rating + formMod
        };
    });

    // Sort by EFFECTIVE rating
    const sortedPlayers = [...playersWithForm].sort((a, b) => (b.effectiveRating || b.rating) - (a.effectiveRating || a.rating));
    
    const formation = Math.random() > 0.5 ? '4-4-2' : '4-3-3';

    const gks = sortedPlayers.filter(p => p.position === 'GK');
    const defs = sortedPlayers.filter(p => p.position === 'DEF');
    const mids = sortedPlayers.filter(p => p.position === 'MID');
    const fwds = sortedPlayers.filter(p => p.position === 'FWD');

    const starting: Player[] = [];
    const bench: Player[] = [];

    if (gks.length > 0) {
        starting.push(gks[0]);
        bench.push(...gks.slice(1));
    } else {
        const emergencyGk = sortedPlayers[sortedPlayers.length - 1];
        if (emergencyGk) starting.push(emergencyGk);
    }

    for(let i=0; i<4; i++) {
        if (defs[i]) starting.push(defs[i]);
    }
    bench.push(...defs.slice(4));

    if (formation === '4-4-2') {
        for(let i=0; i<4; i++) {
            if (mids[i]) starting.push(mids[i]);
        }
        bench.push(...mids.slice(4));
        for(let i=0; i<2; i++) {
            if (fwds[i]) starting.push(fwds[i]);
        }
        bench.push(...fwds.slice(2));
    } else {
        for(let i=0; i<3; i++) {
            if (mids[i]) starting.push(mids[i]);
        }
        bench.push(...mids.slice(3));
        for(let i=0; i<3; i++) {
            if (fwds[i]) starting.push(fwds[i]);
        }
        bench.push(...fwds.slice(3));
    }

    const starterIds = new Set(starting.map(p => p.id));
    let realBench = sortedPlayers.filter(p => !starterIds.has(p.id));

    while (starting.length < 11 && realBench.length > 0) {
        starting.push(realBench[0]);
        realBench = realBench.slice(1);
    }

    realBench.sort((a, b) => (b.effectiveRating || b.rating) - (a.effectiveRating || a.rating));

    return { starting, bench: realBench, formation };
};

// --- Main Simulation Logic ---

export const simulateMatch = (home: Team, away: Team, week: number, existingId?: string): Match => {
  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  const sentOffPlayers = new Set<string>(); 
  const matchYellowCards = new Set<string>(); 
  const homeSubbedInIds = new Set<string>();
  const awaySubbedInIds = new Set<string>();

  const homeSquad = getStartingLineup(home);
  const awaySquad = getStartingLineup(away);

  let homeOnPitch = [...homeSquad.starting];
  let homeBench = [...homeSquad.bench];
  let homeSubsUsed = 0;

  let awayOnPitch = [...awaySquad.starting];
  let awayBench = [...awaySquad.bench];
  let awaySubsUsed = 0;

  const MAX_SUBS = Math.floor(3 + Math.random() * 3); 
  const firstHalfStoppage = Math.floor(Math.random() * 3); 
  const secondHalfStoppage = Math.floor(Math.random() * 6); 

  // Base Strengths - Use Effective Rating implicitly as players are selected by it
  // But for team-wide strength calc, we can re-calculate using on-pitch effective ratings
  
  const calculateStrength = (players: Player[]) => {
      return players.reduce((sum, p) => sum + (p.effectiveRating || p.rating), 0);
  };

  // This roughly approximates the original team-stat based logic but using the actual fielded players' form
  const homeStrength = calculateStrength(homeOnPitch) / 11 * 3; // Approx scale back to 300-ish range
  const awayStrength = calculateStrength(awayOnPitch) / 11 * 3;

  const homeAdvantage = 1.1; 
  const baseGoalChance = 0.020; 

  // Inner function to simulate a single minute
  const simulateMinute = (minute: number, extraMinute: number = 0) => {
    if (minute === 1 && extraMinute === 0) {
        events.push({ minute, type: 'whistle', text: "The referee blows the whistle, and we are underway!", isImportant: false });
        return;
    }
    if (minute === 46 && extraMinute === 0) {
        events.push({ minute, type: 'whistle', text: "Second half begins.", isImportant: false });
        return;
    }

    // --- DYNAMIC RED CARD IMPACT ---
    // Count active players
    const homeActiveCount = homeOnPitch.filter(p => !sentOffPlayers.has(p.id)).length;
    const awayActiveCount = awayOnPitch.filter(p => !sentOffPlayers.has(p.id)).length;

    // Calculate Strength Multiplier (1.0 if 11 players, drops significantly with reds)
    const homeMult = Math.max(0.1, homeActiveCount / 11);
    const awayMult = Math.max(0.1, awayActiveCount / 11);

    // Adjust Possession Strength
    const currHomeStrength = homeStrength * homeMult;
    const currAwayStrength = awayStrength * awayMult;
    const currTotalStrength = (currHomeStrength * homeAdvantage) + currAwayStrength;
    
    const currHomePossession = currTotalStrength > 0 
        ? (currHomeStrength * homeAdvantage) / currTotalStrength 
        : 0.5;

    // Adjust Stats for Goal Probability
    const currHomeAtt = home.att * homeMult; // Keep using team stat for abstract Att/Def structure but scaled
    const currHomeDef = home.def * homeMult;
    const currAwayAtt = away.att * awayMult;
    const currAwayDef = away.def * awayMult;

    // Goal Probability Ratio
    const currHomeAttRatio = currHomeAtt / Math.max(1, currAwayDef);
    const currAwayAttRatio = currAwayAtt / Math.max(1, currHomeDef);

    const currHomeGoalProb = baseGoalChance * Math.pow(currHomeAttRatio, 2.5) * homeAdvantage;
    const currAwayGoalProb = baseGoalChance * Math.pow(currAwayAttRatio, 2.5);

    // --- INJURY LOGIC ---
    if (Math.random() < 0.002) { // 0.2% chance per minute per side approx
        const isHomeInjury = Math.random() < 0.5;
        let pitch = isHomeInjury ? homeOnPitch : awayOnPitch;
        let bench = isHomeInjury ? homeBench : awayBench;
        let subsUsed = isHomeInjury ? homeSubsUsed : awaySubsUsed;
        const team = isHomeInjury ? home : away;
        const sentOff = sentOffPlayers;

        const injuredPlayer = selectPlayer(pitch, 'CHANCE', sentOff); // Use generic weighting

        if (injuredPlayer) {
             events.push({ 
                 minute, 
                 extraMinute, 
                 type: 'injury', 
                 text: getRandomTemplate(INJURY_TEMPLATES, injuredPlayer), 
                 teamId: team.id, 
                 playerId: injuredPlayer.id, 
                 playerName: injuredPlayer.name, 
                 isImportant: true 
             });

             // Forced Substitution
             if (subsUsed < MAX_SUBS) {
                 const candidatesOn = bench.filter(p => p.position === injuredPlayer.position);
                 const subOn = candidatesOn.length > 0 ? candidatesOn[0] : bench[0];

                 if (subOn) {
                     // Perform sub
                     if (isHomeInjury) {
                         homeOnPitch = homeOnPitch.filter(p => p.id !== injuredPlayer.id);
                         homeOnPitch.push(subOn);
                         homeBench = homeBench.filter(p => p.id !== subOn.id);
                         homeSubsUsed++;
                         homeSubbedInIds.add(subOn.id);
                     } else {
                         awayOnPitch = awayOnPitch.filter(p => p.id !== injuredPlayer.id);
                         awayOnPitch.push(subOn);
                         awayBench = awayBench.filter(p => p.id !== subOn.id);
                         awaySubsUsed++;
                         awaySubbedInIds.add(subOn.id);
                     }
                     
                     let t = SUB_TEMPLATES[Math.floor(Math.random() * SUB_TEMPLATES.length)];
                     t = t.replace("{team}", team.name).replace("{in}", subOn.name).replace("{out}", injuredPlayer.name);
                     events.push({ minute, extraMinute, type: 'sub', text: t, teamId: team.id, subOn: { id: subOn.id, name: subOn.name }, subOff: { id: injuredPlayer.id, name: injuredPlayer.name }, isImportant: false });
                 }
             } else {
                 // No subs left - play with 10 men (treat like a red card effectively for simulation)
                 sentOffPlayers.add(injuredPlayer.id); // Re-using sentOff set to exclude them from play selection
                 events.push({ minute, extraMinute, type: 'commentary', text: `${team.name} have used all their substitutions and must continue with ten men as ${injuredPlayer.name} comes off injured.`, teamId: team.id, isImportant: true });
             }
             return; // Injury event takes up the minute
        }
    }

    // --- SUBSTITUTION LOGIC (Tactical) ---
    if (minute >= 46) {
        // Increase probability gradually throughout the second half
        let subProb = 0.015; // Very small chance early 2nd half (injuries etc)
        
        if (minute > 60) subProb = 0.05;  // Start tactical tweaks
        if (minute > 70) subProb = 0.10;  // Standard sub window
        if (minute > 75) subProb = 0.15;  // Late changes
        if (minute > 88) subProb = 0.18;  // Time wasting / desperation
        if (extraMinute > 0) subProb = 0.40;

        // Home Sub
        if (homeSubsUsed < MAX_SUBS && Math.random() < subProb) {
            const subOff = selectSubOffCandidate(homeOnPitch, matchYellowCards, homeSubbedInIds, sentOffPlayers);
            if (subOff) {
                const candidatesOn = homeBench.filter(p => p.position === subOff.position);
                const subOn = candidatesOn.length > 0 ? candidatesOn[0] : homeBench[0];

                if (subOn) {
                    homeOnPitch = homeOnPitch.filter(p => p.id !== subOff.id);
                    homeOnPitch.push(subOn);
                    homeBench = homeBench.filter(p => p.id !== subOn.id);
                    homeSubsUsed++;
                    homeSubbedInIds.add(subOn.id);
                    
                    let t = SUB_TEMPLATES[Math.floor(Math.random() * SUB_TEMPLATES.length)];
                    t = t.replace("{team}", home.name).replace("{in}", subOn.name).replace("{out}", subOff.name);
                    events.push({ minute, extraMinute, type: 'sub', text: t, teamId: home.id, subOn: { id: subOn.id, name: subOn.name }, subOff: { id: subOff.id, name: subOff.name }, isImportant: false });
                    return;
                }
            }
        }

        // Away Sub
        if (awaySubsUsed < MAX_SUBS && Math.random() < subProb) {
            const subOff = selectSubOffCandidate(awayOnPitch, matchYellowCards, awaySubbedInIds, sentOffPlayers);
            if (subOff) {
                const candidatesOn = awayBench.filter(p => p.position === subOff.position);
                const subOn = candidatesOn.length > 0 ? candidatesOn[0] : awayBench[0];

                if (subOn) {
                    awayOnPitch = awayOnPitch.filter(p => p.id !== subOff.id);
                    awayOnPitch.push(subOn);
                    awayBench = awayBench.filter(p => p.id !== subOn.id);
                    awaySubsUsed++;
                    awaySubbedInIds.add(subOn.id);
                    
                    let t = SUB_TEMPLATES[Math.floor(Math.random() * SUB_TEMPLATES.length)];
                    t = t.replace("{team}", away.name).replace("{in}", subOn.name).replace("{out}", subOff.name);
                    events.push({ minute, extraMinute, type: 'sub', text: t, teamId: away.id, subOn: { id: subOn.id, name: subOn.name }, subOff: { id: subOff.id, name: subOff.name }, isImportant: false });
                    return;
                }
            }
        }
    }

    // --- POSSESSION & EVENTS ---
    const isHomeAttacking = Math.random() < currHomePossession;
    const attackingTeam = isHomeAttacking ? home : away;
    const defendingTeam = isHomeAttacking ? away : home;
    const attackingPitch = isHomeAttacking ? homeOnPitch : awayOnPitch;
    const defendingPitch = isHomeAttacking ? awayOnPitch : homeOnPitch;

    // Desperate Mode: 90+ mins and losing by exactly 1 goal
    const isDesperate = (minute >= 90) && (isHomeAttacking ? (homeGoals === awayGoals - 1) : (awayGoals === homeGoals - 1));

    // Penalty Check
    if (Math.random() < 0.0038) {
        const taker = selectPlayer(attackingPitch, 'GOAL', sentOffPlayers);
        const fouler = selectPlayer(defendingPitch, 'DEFENDER', sentOffPlayers);

        events.push({ minute, extraMinute, type: 'penalty-award', text: getRandomTemplate(PENALTY_AWARD_TEMPLATES, taker, fouler), teamId: attackingTeam.id, isImportant: true });

        const conversionRate = 0.76;
        if (Math.random() < conversionRate) {
            if (isHomeAttacking) homeGoals++; else awayGoals++;
            events.push({ minute, extraMinute, type: 'goal', text: getRandomTemplate(PENALTY_GOAL_TEMPLATES, taker), teamId: attackingTeam.id, playerId: taker.id, playerName: taker.name, isImportant: true });
        } else {
            events.push({ minute, extraMinute, type: 'penalty-miss', text: getRandomTemplate(PENALTY_MISS_TEMPLATES, taker), teamId: attackingTeam.id, playerId: taker.id, playerName: taker.name, isImportant: true });
        }
        return;
    }

    // Normal Goal Logic
    const goalProb = isHomeAttacking ? currHomeGoalProb : currAwayGoalProb;
    
    if (Math.random() < goalProb) {
        // Pass isDesperate to allow GK selection
        const scorer = selectPlayer(attackingPitch, 'GOAL', sentOffPlayers, isDesperate);
        
        if (isHomeAttacking) homeGoals++; else awayGoals++;
        
        let template = ATTACKER_GOAL_TEMPLATES; // Default to Attacker templates for MID/FWD
        if (scorer.position === 'GK') {
             template = GK_GOAL_TEMPLATES;
        } else if (scorer.position === 'DEF') {
             template = DEFENDER_GOAL_TEMPLATES;
        }

        events.push({
          minute,
          extraMinute,
          type: 'goal',
          text: getRandomTemplate(template, scorer),
          teamId: attackingTeam.id,
          playerId: scorer.id,
          playerName: scorer.name,
          isImportant: true
        });
    } else if (Math.random() < 0.015) {
        const player = selectPlayer(attackingPitch, 'CHANCE', sentOffPlayers, isDesperate);
        events.push({
          minute,
          extraMinute,
          type: 'commentary',
          text: getRandomTemplate(CHANCE_TEMPLATES, player),
          teamId: attackingTeam.id,
          isImportant: false
        });
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
          if (matchYellowCards.has(offender.id)) {
              isRed = true; 
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

      events.push({ minute, extraMinute, type: 'card', cardType: isRed ? 'red' : 'yellow', text: cardText, teamId: team.id, playerId: offender.id, playerName: offender.name, isImportant: true });
    }
  };

  // --- Phase 1: First Half ---
  for (let m = 1; m <= 45; m++) simulateMinute(m);
  
  // --- Phase 2: First Half Stoppage ---
  if (firstHalfStoppage > 0) {
      events.push({ minute: 45, extraMinute: 0, type: 'whistle', text: `${firstHalfStoppage} minutes of stoppage time indicated.`, isImportant: false });
      for (let em = 1; em <= firstHalfStoppage; em++) simulateMinute(45, em);
  }
  events.push({ minute: 45, extraMinute: firstHalfStoppage, type: 'whistle', text: "Half Time whistle blows.", isImportant: false });

  // --- Phase 3: Second Half ---
  for (let m = 46; m <= 90; m++) simulateMinute(m);

  // --- Phase 4: Second Half Stoppage ---
  if (secondHalfStoppage > 0) {
      events.push({ minute: 90, extraMinute: 0, type: 'whistle', text: `${secondHalfStoppage} minutes of stoppage time indicated.`, isImportant: false });
      for (let em = 1; em <= secondHalfStoppage; em++) simulateMinute(90, em);
  }
  events.push({ minute: 90, extraMinute: secondHalfStoppage, type: 'whistle', text: "Full Time! The referee ends the match.", isImportant: true });

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
    secondHalfStoppage,
    homeLineup: homeSquad.starting,
    awayLineup: awaySquad.starting,
    homeFormation: homeSquad.formation,
    awayFormation: awaySquad.formation
  };
};

export const generateSchedule = (teams: Team[]): Match[][] => {
    let tempTeams = [...teams];
    if (tempTeams.length % 2 !== 0) {
        tempTeams.push({ id: 'BYE', name: 'BYE', league: teams[0].league } as any);
    }

    const numTeams = tempTeams.length;
    const schedule: Match[][] = [];
    const rounds = numTeams - 1;
    
    tempTeams = shuffleArray(tempTeams);
    const fixedTeam = tempTeams.shift(); 
    if (!fixedTeam) return [];

    for (let round = 0; round < rounds; round++) {
        const weekMatches: Match[] = [];
        const t2 = tempTeams[0];
        const fixedIsHome = round % 2 === 0;

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
        const first = tempTeams.shift();
        if (first) tempTeams.push(first);
    }

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