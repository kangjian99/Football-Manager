import React, { useState, useMemo } from 'react';
import { Team, Player, TacticsConfig, FormationType, MentalityType } from '../types';
import { FORMATION_SLOTS, getDefaultTactics } from '../services/gameEngine';
import { 
  Shield, 
  Zap, 
  Swords, 
  RotateCcw, 
  Wand2, 
  AlertTriangle, 
  Cross, 
  CheckCircle2, 
  Info,
  ChevronDown
} from 'lucide-react';

interface TacticsViewProps {
  team: Team;
  tactics: TacticsConfig;
  onUpdateTactics: (newTactics: TacticsConfig) => void;
}

const AVAILABLE_FORMATIONS: FormationType[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];

const MENTALITY_DETAILS: Record<MentalityType, { 
  name: string; 
  desc: string; 
  attMod: string; 
  defMod: string; 
  color: string; 
  icon: any 
}> = {
  ATTACKING: {
    name: 'Attacking (全力进攻)',
    desc: '高位压迫，全线压上。大幅提升进攻创造力与射门转化率，但后场会留下反击空档。',
    attMod: '+10%',
    defMod: '-8%',
    color: 'border-red-500 bg-red-950/40 text-red-300',
    icon: Swords
  },
  BALANCED: {
    name: 'Balanced (攻守平衡)',
    desc: '稳妥适中的现代战术节奏，攻防两端保持秩序，依据局势自然应变。',
    attMod: '±0%',
    defMod: '±0%',
    color: 'border-blue-500 bg-blue-950/40 text-blue-300',
    icon: Zap
  },
  DEFENSIVE: {
    name: 'Defensive (稳固防守)',
    desc: '深度收缩大巴战术，封堵禁区通道，限制对手破门机会，进攻端减少投入。',
    attMod: '-12%',
    defMod: '+12%',
    color: 'border-indigo-500 bg-indigo-950/40 text-indigo-300',
    icon: Shield
  },
  COUNTER: {
    name: 'Counter-Attack (防守反击)',
    desc: '中后场严密布防，断球后迅速长传打身后，利用前锋的速度和单刀致命一击。',
    attMod: '+4%',
    defMod: '+4%',
    color: 'border-emerald-500 bg-emerald-950/40 text-emerald-300',
    icon: Wand2
  }
};

const TacticsView: React.FC<TacticsViewProps> = ({ team, tactics, onUpdateTactics }) => {
  // Selected slot for swap interaction (can be player id on pitch or bench)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  const playerMap = useMemo(() => {
    return new Map(team.players.map(p => [p.id, p]));
  }, [team.players]);

  // Resolve starting players
  const startingPlayers = useMemo(() => {
    return tactics.startingIds
      .map(id => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [tactics.startingIds, playerMap]);

  // Resolve bench & reserve players
  const benchPlayers = useMemo(() => {
    const starterSet = new Set(tactics.startingIds);
    return team.players.filter(p => !starterSet.has(p.id));
  }, [tactics.startingIds, team.players]);

  // Group starters by line for pitch visualization
  const pitchLines = useMemo(() => {
    const slots = FORMATION_SLOTS[tactics.formation] || FORMATION_SLOTS['4-3-3'];
    
    // Sort starting players to best fit positions
    const gks = startingPlayers.filter(p => p.position === 'GK');
    const defs = startingPlayers.filter(p => p.position === 'DEF');
    const mids = startingPlayers.filter(p => p.position === 'MID');
    const fwds = startingPlayers.filter(p => p.position === 'FWD');
    
    // Fallback for players out of natural positions
    const others = startingPlayers.filter(p => !gks.includes(p) && !defs.includes(p) && !mids.includes(p) && !fwds.includes(p));

    return {
      gk: gks.slice(0, 1),
      def: defs,
      mid: mids,
      fwd: fwds,
      others
    };
  }, [startingPlayers, tactics.formation]);

  // Filtered bench list
  const filteredBench = useMemo(() => {
    let list = benchPlayers;
    if (posFilter !== 'ALL') {
      list = list.filter(p => p.position === posFilter);
    }
    return [...list].sort((a, b) => b.rating - a.rating);
  }, [benchPlayers, posFilter]);

  // Computed Team Strengths from starting 11
  const startingStats = useMemo(() => {
    if (startingPlayers.length === 0) return { avgRating: 0, att: 0, mid: 0, def: 0 };
    const avg = Math.round(startingPlayers.reduce((sum, p) => sum + p.rating, 0) / startingPlayers.length);
    const defPlayers = startingPlayers.filter(p => p.position === 'DEF' || p.position === 'GK');
    const midPlayers = startingPlayers.filter(p => p.position === 'MID');
    const fwdPlayers = startingPlayers.filter(p => p.position === 'FWD');

    const defAvg = defPlayers.length ? Math.round(defPlayers.reduce((s, p) => s + p.rating, 0) / defPlayers.length) : avg;
    const midAvg = midPlayers.length ? Math.round(midPlayers.reduce((s, p) => s + p.rating, 0) / midPlayers.length) : avg;
    const fwdAvg = fwdPlayers.length ? Math.round(fwdPlayers.reduce((s, p) => s + p.rating, 0) / fwdPlayers.length) : avg;

    return { avgRating: avg, att: fwdAvg, mid: midAvg, def: defAvg };
  }, [startingPlayers]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Change formation
  const handleFormationChange = (formation: FormationType) => {
    const updated = getDefaultTactics(team, formation, tactics.mentality);
    onUpdateTactics(updated);
    setSelectedPlayerId(null);
    showNotification(`Formation changed to ${formation}`);
  };

  // Change mentality
  const handleMentalityChange = (mentality: MentalityType) => {
    onUpdateTactics({
      ...tactics,
      mentality
    });
    showNotification(`Tactical mentality changed to ${MENTALITY_DETAILS[mentality].name}`);
  };

  // Auto-pick optimal starting XI
  const handleAutoPick = () => {
    const optimized = getDefaultTactics(team, tactics.formation, tactics.mentality);
    onUpdateTactics(optimized);
    setSelectedPlayerId(null);
    showNotification("Auto Pick: Top rated available squad selected!");
  };

  // Player Selection / Swap Handler
  const handlePlayerClick = (playerId: string) => {
    const isStarter = tactics.startingIds.includes(playerId);

    // If nothing currently selected
    if (!selectedPlayerId) {
      setSelectedPlayerId(playerId);
      return;
    }

    // If clicking the same player again, deselect
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
      return;
    }

    const firstIsStarter = tactics.startingIds.includes(selectedPlayerId);

    // Case 1: Both are starters -> swap their order in startingIds
    if (firstIsStarter && isStarter) {
      const newStarters = [...tactics.startingIds];
      const idxA = newStarters.indexOf(selectedPlayerId);
      const idxB = newStarters.indexOf(playerId);
      if (idxA !== -1 && idxB !== -1) {
        newStarters[idxA] = playerId;
        newStarters[idxB] = selectedPlayerId;
        onUpdateTactics({
          ...tactics,
          startingIds: newStarters
        });
        showNotification("Starting positions swapped");
      }
      setSelectedPlayerId(null);
      return;
    }

    // Case 2: One starter, one bench player -> swap between pitch and bench!
    if (firstIsStarter !== isStarter) {
      const starterId = firstIsStarter ? selectedPlayerId : playerId;
      const benchId = firstIsStarter ? playerId : selectedPlayerId;

      const newStarters = tactics.startingIds.map(id => id === starterId ? benchId : id);
      const newBench = tactics.benchIds.filter(id => id !== benchId);
      newBench.push(starterId);

      onUpdateTactics({
        ...tactics,
        startingIds: newStarters,
        benchIds: newBench
      });

      const swappedIn = playerMap.get(benchId);
      const swappedOut = playerMap.get(starterId);
      showNotification(`Substituted: ${swappedIn?.name} in for ${swappedOut?.name}`);
      setSelectedPlayerId(null);
      return;
    }

    // Case 3: Both are bench players -> just switch selection to the new bench player
    setSelectedPlayerId(playerId);
  };

  const getPositionBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-amber-500 text-black';
      case 'DEF': return 'bg-blue-600 text-white';
      case 'MID': return 'bg-emerald-600 text-white';
      case 'FWD': return 'bg-rose-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg ${team.color} border border-white/20`}>
            {team.logo}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Tactics & Lineup
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-normal">
                {team.name}
              </span>
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Drag or click players to rearrange starting 11 & substitute bench
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoPick}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5"
            title="Automatically pick the highest rated available players"
          >
            <Wand2 size={15} />
            Auto Pick (最强阵容)
          </button>
          <button
            onClick={() => handleFormationChange(tactics.formation)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-lg transition-colors"
            title="Reset squad positions"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notice && (
        <div className="bg-blue-600/90 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 border border-blue-400/30">
          <CheckCircle2 size={16} className="text-blue-200" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tactics Configuration Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Formations Selector */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center justify-between">
            <span>Formation (阵型系统)</span>
            <span className="text-gray-500 text-[11px] lowercase">slots: {FORMATION_SLOTS[tactics.formation].def}-{FORMATION_SLOTS[tactics.formation].mid}-{FORMATION_SLOTS[tactics.formation].fwd}</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVAILABLE_FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all ${
                  tactics.formation === f
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-2 ring-blue-400'
                    : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Mentality Selector */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center justify-between">
            <span>Team Mentality (战术风格)</span>
            <span className="text-[11px] text-blue-400 font-mono">
              ATT {MENTALITY_DETAILS[tactics.mentality].attMod} | DEF {MENTALITY_DETAILS[tactics.mentality].defMod}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(MENTALITY_DETAILS) as MentalityType[]).map(m => {
              const details = MENTALITY_DETAILS[m];
              const Icon = details.icon;
              const active = tactics.mentality === m;
              return (
                <button
                  key={m}
                  onClick={() => handleMentalityChange(m)}
                  className={`py-2 px-2 text-center rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    active
                      ? `${details.color} ring-2 ring-current shadow-md`
                      : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent'
                  }`}
                  title={details.desc}
                >
                  <Icon size={14} />
                  <span className="truncate">{m}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Tactical Pitch & Squad Bench Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2D Football Pitch View (7 Cols) */}
        <div className="lg:col-span-7 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Starting 11 (首发名单)</span>
              <span className="text-xs text-gray-400">({startingPlayers.length}/11)</span>
            </div>
            
            {/* Live XI Stats Bar */}
            <div className="flex items-center gap-3 text-xs bg-gray-900/90 px-3 py-1 rounded-md border border-gray-700">
              <span className="text-gray-400">OVR: <strong className="text-white">{startingStats.avgRating}</strong></span>
              <span className="text-rose-400">ATT: <strong>{startingStats.att}</strong></span>
              <span className="text-emerald-400">MID: <strong>{startingStats.mid}</strong></span>
              <span className="text-blue-400">DEF: <strong>{startingStats.def}</strong></span>
            </div>
          </div>

          {/* Interactive Pitch Canvas Container */}
          <div className="relative flex-1 min-h-[540px] rounded-lg overflow-hidden border-2 border-emerald-900/70 shadow-inner bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-800 flex flex-col justify-between p-4 select-none">
            {/* Pitch Markings Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              {/* Half-way line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2"></div>
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              {/* Top Penalty Area (Opponent) */}
              <div className="absolute top-0 left-1/2 w-52 h-24 border-2 border-t-0 border-white transform -translate-x-1/2"></div>
              {/* Bottom Penalty Area (Our Goal) */}
              <div className="absolute bottom-0 left-1/2 w-52 h-24 border-2 border-b-0 border-white transform -translate-x-1/2"></div>
              <div className="absolute bottom-16 left-1/2 w-20 h-10 border-2 border-b-0 border-white rounded-t-full transform -translate-x-1/2"></div>
              {/* Pitch Grass Pattern Stripes */}
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.06)_0px,rgba(0,0,0,0.06)_40px,transparent_40px,transparent_80px)]"></div>
            </div>

            {/* Hint overlay if a player is selected */}
            {selectedPlayerId && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 bg-black/80 backdrop-blur text-yellow-300 text-xs px-3 py-1.5 rounded-full border border-yellow-500/40 shadow-lg flex items-center gap-1.5 animate-pulse">
                <Info size={13} />
                <span>Click another player on pitch or bench to swap</span>
              </div>
            )}

            {/* FORWARD LINE (Top) */}
            <div className="relative z-10 flex justify-around items-center pt-2">
              {pitchLines.fwd.map(player => (
                <PitchPlayerCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  badgeColor={getPositionBadgeColor(player.position)}
                />
              ))}
            </div>

            {/* MIDFIELD LINE (Center-Top) */}
            <div className="relative z-10 flex justify-around items-center py-2">
              {pitchLines.mid.map(player => (
                <PitchPlayerCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  badgeColor={getPositionBadgeColor(player.position)}
                />
              ))}
            </div>

            {/* DEFENDER LINE (Center-Bottom) */}
            <div className="relative z-10 flex justify-around items-center py-2">
              {pitchLines.def.map(player => (
                <PitchPlayerCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  badgeColor={getPositionBadgeColor(player.position)}
                />
              ))}
            </div>

            {/* GOALKEEPER LINE (Bottom) */}
            <div className="relative z-10 flex justify-center items-center pb-1">
              {pitchLines.gk.map(player => (
                <PitchPlayerCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  badgeColor={getPositionBadgeColor(player.position)}
                />
              ))}
            </div>

            {/* ANY EXTRA/OUT OF POSITION PLAYERS */}
            {pitchLines.others.length > 0 && (
              <div className="relative z-10 flex justify-center gap-2 pt-2 border-t border-emerald-600/50">
                {pitchLines.others.map(player => (
                  <PitchPlayerCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayerId === player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    badgeColor={getPositionBadgeColor(player.position)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bench & Reserves Sidebar (5 Cols) */}
        <div className="lg:col-span-5 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Bench & Reserves (替补与板凳)</span>
                <span className="text-xs text-gray-400 font-normal">({benchPlayers.length})</span>
              </h2>
            </div>
            
            {/* Position Filter Pills */}
            <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-700 text-[11px]">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPosFilter(p)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    posFilter === p ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Bench Roster List */}
          <div className="flex-1 overflow-y-auto max-h-[520px] space-y-2 pr-1 custom-scrollbar">
            {filteredBench.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No players found matching filter.
              </div>
            ) : (
              filteredBench.map(player => {
                const isSelected = selectedPlayerId === player.id;
                const isInjured = player.injury > 0;
                const isBanned = player.matchesBanned > 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-yellow-950/60 border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg'
                        : isInjured || isBanned
                        ? 'bg-gray-900/50 border-gray-800 opacity-60 hover:opacity-90'
                        : 'bg-gray-900/90 border-gray-700/80 hover:bg-gray-750 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold w-9 text-center uppercase shrink-0 ${getPositionBadgeColor(player.position)}`}>
                        {player.position}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-gray-200 truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {player.id.includes('REAL') && (
                            <span className="text-[9px] bg-blue-900/50 text-blue-300 border border-blue-700/60 px-1 rounded shrink-0">
                              Star
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>Age: {player.age}</span>
                          <span>•</span>
                          <span>MP: {player.matchesPlayed}</span>
                          <span>•</span>
                          <span>G: {player.goals}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isInjured && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-bold" title={`${player.injury} weeks injured`}>
                          <Cross size={11} /> {player.injury}w
                        </span>
                      )}
                      {isBanned && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-bold" title="Suspended">
                          <AlertTriangle size={11} /> BAN
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-xs font-black text-white px-2 py-1 bg-gray-800 rounded border border-gray-700">
                          {player.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700 text-[11px] text-gray-400 flex items-center justify-between">
            <span>💡 Click to swap onto pitch</span>
            <span className="text-gray-500">Total Squad: {team.players.length}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component for individual player chip on the 2D pitch
interface PitchPlayerCardProps {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
  badgeColor: string;
}

const PitchPlayerCard: React.FC<PitchPlayerCardProps> = ({ player, isSelected, onClick, badgeColor }) => {
  const isInjured = player.injury > 0;
  const isBanned = player.matchesBanned > 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center focus:outline-none transition-transform duration-150 ${
        isSelected ? 'scale-110 -translate-y-1' : 'hover:scale-105'
      }`}
    >
      {/* Player Token Circle */}
      <div className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ${
        isSelected
          ? 'bg-yellow-400 text-black ring-4 ring-yellow-300 ring-offset-2 ring-offset-emerald-900 shadow-yellow-500/50'
          : isInjured || isBanned
          ? 'bg-gray-800 text-gray-400 border-2 border-red-500'
          : 'bg-gray-900 text-white border-2 border-white/80 group-hover:border-yellow-300 group-hover:shadow-lg'
      }`}>
        <span className="text-xs font-black tracking-tight">{player.rating}</span>
        <span className={`text-[8px] font-bold px-1 rounded-sm uppercase leading-none mt-0.5 ${badgeColor}`}>
          {player.position}
        </span>

        {/* Status Indicators */}
        {isInjured && (
          <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 border border-white" title="Injured">
            <Cross size={10} />
          </div>
        )}
        {isBanned && !isInjured && (
          <div className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-0.5 border border-white" title="Suspended">
            <AlertTriangle size={10} />
          </div>
        )}
      </div>

      {/* Name Ribbon */}
      <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold truncate max-w-[84px] text-center shadow-md transition-colors ${
        isSelected 
          ? 'bg-yellow-400 text-black shadow-yellow-900/50' 
          : 'bg-gray-950/85 text-gray-200 group-hover:text-white border border-gray-700/50'
      }`}>
        {player.name}
      </div>
    </button>
  );
};

export default TacticsView;
