
import React, { useEffect, useState, useRef } from 'react';
import { Team, Match, MatchEvent, Player } from '../types';
import { Play, FastForward, SkipForward, Timer, Volume2, VolumeX, RefreshCcw, ArrowLeftRight, Shirt } from 'lucide-react';
import { simulateMatch } from '../services/gameEngine';
import { playWhistle, playGoalSound, resumeAudio } from '../services/audioService';

interface MatchViewProps {
  homeTeam: Team;
  awayTeam: Team;
  week: number;
  matchId: string;
  userTeamId: string;
  onMatchStart: () => void;
  onMatchComplete: (matchResult: Match) => void;
  initialSoundEnabled: boolean;
}

const MatchView: React.FC<MatchViewProps> = ({ homeTeam, awayTeam, week, matchId, userTeamId, onMatchStart, onMatchComplete, initialSoundEnabled }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [minute, setMinute] = useState(0);
  const [extraMinute, setExtraMinute] = useState(0); // For stoppage time
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [speed, setSpeed] = useState(100); // ms per tick
  const [matchResult, setMatchResult] = useState<Match | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [isPaused, setIsPaused] = useState(false); // State for event pause
  
  const [lineups, setLineups] = useState<{home: Player[], away: Player[], homeFormation?: string, awayFormation?: string} | null>(null);

  // Simulate immediately on mount (calculation), but don't show result yet
  useEffect(() => {
    // We must simulate using homeTeam and awayTeam in that order
    const result = simulateMatch(homeTeam, awayTeam, week, matchId);
    setMatchResult(result);
    
    // Use the lineups generated during simulation
    if (result.homeLineup && result.awayLineup) {
        setLineups({ 
            home: result.homeLineup, 
            away: result.awayLineup,
            homeFormation: result.homeFormation,
            awayFormation: result.awayFormation
        });
    }
  }, [homeTeam, awayTeam, week, matchId]);

  const handleStartMatch = () => {
    onMatchStart(); // Lock navigation
    resumeAudio(); // Initialize audio context on user interaction
    setHasStarted(true);
  };

  const handleSkipMatch = () => {
    if (!matchResult) return;
    
    onMatchStart(); // Lock navigation
    // Initialize audio if skipping from start screen
    resumeAudio(); 
    
    setHasStarted(true);
    setIsFinished(true);
    setIsPaused(false);
    
    // Set time to end
    setMinute(90);
    setExtraMinute(matchResult.secondHalfStoppage);
    
    // Load ALL events in reverse chronological order (newest top)
    setEvents([...matchResult.events].reverse());
  };

  // Playback loop
  useEffect(() => {
    if (!hasStarted || !matchResult || isFinished || isPaused) return;

    const interval = setInterval(() => {
      // Logic for timing flow including stoppage time
      
      // Phase 1: 0 to 44 (going to 45)
      if (minute < 45) {
          setMinute(prev => prev + 1);
      } 
      // Phase 2: At 45, handle Stoppage First Half
      else if (minute === 45) {
          // If we are within allocated stoppage time
          if (extraMinute < matchResult.firstHalfStoppage) {
              // No need to wait an extra tick for stoppage time accumulation
              setExtraMinute(prev => prev + 1);
          } else {
              // Stoppage over
              setMinute(46);
              setExtraMinute(0);
          }
      }
      // Phase 3: 46 to 89 (going to 90)
      else if (minute < 90) {
          setMinute(prev => prev + 1);
      }
      // Phase 4: At 90, handle Stoppage Second Half
      else if (minute === 90) {
          if (extraMinute < matchResult.secondHalfStoppage) {
              setExtraMinute(prev => prev + 1);
          } else {
              // Stoppage over
               setIsFinished(true);
               clearInterval(interval);
          }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [hasStarted, speed, matchResult, isFinished, isPaused, minute, extraMinute]);

  // Update visible events and Play Sounds
  useEffect(() => {
    // IMPORTANT: Do not run this incremental logic if we just finished via skip
    if (matchResult && hasStarted && !isFinished) {
      // Filter events matching current minute AND extraMinute
      const currentEvents = matchResult.events.filter(e => {
          const eExtra = e.extraMinute || 0;
          return e.minute === minute && eExtra === extraMinute;
      });
      
      if (currentEvents.length > 0) {
        // Prepend new events to the top. We reverse currentEvents first to keep logic order (e.g. Foul -> Pen)
        setEvents(prev => [...currentEvents.reverse(), ...prev]);
        
        let pauseNeeded = false;

        // Sound Logic & Pause Check
        currentEvents.forEach(evt => {
            if (evt.isImportant) {
                pauseNeeded = true;
            }

            if (soundEnabled) {
                // Whistle
                if (evt.type === 'whistle') {
                    const isStoppageIndication = evt.text.includes('stoppage time indicated');
                    const isSecondHalfStart = evt.text.includes('Second half begins');

                    if (!isStoppageIndication && !isSecondHalfStart) {
                        playWhistle();
                    }
                }
                // Goal
                if (evt.type === 'goal') {
                    playGoalSound();
                }
                // Penalty Whistle (Optional: Re-use whistle for penalty award)
                if (evt.type === 'penalty-award') {
                    playWhistle();
                }
            }
        });

        // Trigger pause if important event occurred
        if (pauseNeeded) {
            setIsPaused(true);
            // Pause slightly longer for goals/pens to let user read
            setTimeout(() => {
                setIsPaused(false);
            }, 1500); 
        }
      }
    }
  }, [minute, extraMinute, matchResult, hasStarted, soundEnabled, isFinished]);

  // Calculate Score live
  const homeScore = events.filter(e => e.type === 'goal' && e.teamId === homeTeam.id).length;
  const awayScore = events.filter(e => e.type === 'goal' && e.teamId === awayTeam.id).length;

  // Helper to render text with highlighted player name
  const renderEventText = (event: MatchEvent) => {
      if(event.type === 'sub' && event.subOn && event.subOff) {
        const isAway = event.teamId === awayTeam.id;
        return (
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${isAway ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-center gap-1.5 text-green-400">
                    <span className="text-[10px] font-bold uppercase bg-green-900/40 border border-green-800/50 px-1 rounded">IN</span>
                    <span className="font-bold text-white text-xs md:text-sm">{event.subOn.name}</span>
                </div>
                <div className="text-gray-600 text-xs">|</div>
                <div className="flex items-center gap-1.5 text-red-400">
                    <span className="text-[10px] font-bold uppercase bg-red-900/40 border border-red-800/50 px-1 rounded">OUT</span>
                    <span className="font-bold text-gray-400 text-xs md:text-sm">{event.subOff.name}</span>
                </div>
            </div>
        );
      }

      if (!event.playerName) return event.text;
      
      const parts = event.text.split(event.playerName);
      if (parts.length === 1) return event.text;

      return (
          <span>
              {parts.map((part, i) => (
                  <React.Fragment key={i}>
                      {part}
                      {i < parts.length - 1 && (
                          <span className="font-bold text-yellow-300 bg-yellow-900/30 px-1 rounded mx-0.5">{event.playerName}</span>
                      )}
                  </React.Fragment>
              ))}
          </span>
      );
  };

  const formatTime = () => {
      if (extraMinute > 0) {
          return `${minute}+${extraMinute}'`;
      }
      return `${minute}'`;
  };

  if (!hasStarted) {
    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6a?q=80&w=2070')] bg-cover bg-center pointer-events-none"></div>
                
                <div className="z-10 flex flex-col items-center gap-6 w-full max-w-4xl">
                    <div className="flex items-center justify-center gap-4 md:gap-8 w-full animate-in zoom-in duration-500">
                        {/* HOME TEAM PREVIEW */}
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-3xl md:text-4xl ${homeTeam.color} shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-gray-700 relative group`}>
                                {homeTeam.logo}
                                {homeTeam.id === userTeamId && <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">YOU</div>}
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white text-center leading-tight">{homeTeam.name}</h2>
                        </div>

                        {/* VS SECTION - Compact & Small */}
                        <div className="flex flex-col items-center justify-center w-12 shrink-0 -mt-2">
                            <div className="text-[12px] font-mono text-gray-400 mb-1">WK {week}</div>
                            <div className="text-3xl md:text-4xl font-black text-white italic tracking-tighter drop-shadow-lg leading-none">VS</div>
                        </div>

                        {/* AWAY TEAM PREVIEW */}
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-3xl md:text-4xl ${awayTeam.color} shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-gray-700 relative group`}>
                                {awayTeam.logo}
                                {awayTeam.id === userTeamId && <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">YOU</div>}
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white text-center leading-tight">{awayTeam.name}</h2>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full max-w-xs mt-2">
                        <button 
                            onClick={handleStartMatch}
                            className="flex-1 group relative bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-full font-bold text-lg shadow-lg shadow-green-900/50 transition-all transform hover:scale-105 flex justify-center items-center gap-2"
                        >
                            <Timer size={20} />
                            KICK OFF
                        </button>
                        
                        <button 
                            onClick={handleSkipMatch}
                            className="w-12 h-12 shrink-0 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full shadow transition-all border border-gray-700 flex justify-center items-center transform hover:scale-105"
                            title="Instant Result"
                        >
                            <SkipForward size={20} />
                        </button>
                    </div>

                    {/* STARTING LINEUPS - Narrower box, slightly larger font */}
                    {lineups && (
                        <div className="w-full max-w-lg mx-auto grid grid-cols-2 gap-6 bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-gray-700 text-sm md:text-base mt-2 shadow-xl">
                            {/* Home XI */}
                            <div>
                                <h3 className="text-center text-gray-400 font-bold mb-3 uppercase tracking-widest text-xs">
                                    {homeTeam.name} <span className="bg-gray-700 px-1 rounded ml-1">{lineups.homeFormation || '4-4-2'}</span>
                                </h3>
                                <div className="space-y-2">
                                    {lineups.home.map((player, idx) => (
                                        <div key={player.id} className="flex items-center gap-2">
                                             <div className="w-5 text-right text-gray-500 font-mono text-xs">{idx + 1}</div>
                                             <div className={`w-8 text-center text-[10px] font-bold px-0.5 rounded ${
                                                player.position === 'GK' ? 'bg-yellow-700 text-yellow-100' : 
                                                player.position === 'DEF' ? 'bg-blue-800 text-blue-200' :
                                                player.position === 'MID' ? 'bg-green-800 text-green-200' :
                                                'bg-red-800 text-red-200'
                                             }`}>{player.position}</div>
                                             <div className="flex flex-col min-w-0">
                                                <div className="font-medium text-white truncate leading-none">{player.name}</div>
                                                {player.effectiveRating !== undefined && (
                                                    <div className="text-[10px] text-gray-400">
                                                        {player.effectiveRating} <span className={player.effectiveRating >= player.rating ? "text-green-400" : "text-red-400"}>
                                                            ({player.effectiveRating >= player.rating ? '+' : ''}{player.effectiveRating - player.rating})
                                                        </span>
                                                    </div>
                                                )}
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Away XI */}
                            <div>
                                <h3 className="text-center text-gray-400 font-bold mb-3 uppercase tracking-widest text-xs">
                                    {awayTeam.name} <span className="bg-gray-700 px-1 rounded ml-1">{lineups.awayFormation || '4-4-2'}</span>
                                </h3>
                                <div className="space-y-2">
                                    {lineups.away.map((player, idx) => (
                                        <div key={player.id} className="flex items-center gap-2 flex-row-reverse">
                                             <div className="w-5 text-left text-gray-500 font-mono text-xs">{idx + 1}</div>
                                             <div className={`w-8 text-center text-[10px] font-bold px-0.5 rounded ${
                                                player.position === 'GK' ? 'bg-yellow-700 text-yellow-100' : 
                                                player.position === 'DEF' ? 'bg-blue-800 text-blue-200' :
                                                player.position === 'MID' ? 'bg-green-800 text-green-200' :
                                                'bg-red-800 text-red-200'
                                             }`}>{player.position}</div>
                                             <div className="flex flex-col min-w-0 items-end">
                                                <div className="font-medium text-white truncate leading-none">{player.name}</div>
                                                {player.effectiveRating !== undefined && (
                                                    <div className="text-[10px] text-gray-400">
                                                        {player.effectiveRating} <span className={player.effectiveRating >= player.rating ? "text-green-400" : "text-red-400"}>
                                                            ({player.effectiveRating >= player.rating ? '+' : ''}{player.effectiveRating - player.rating})
                                                        </span>
                                                    </div>
                                                )}
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Scoreboard */}
      <div className="bg-gray-800 p-6 shadow-xl border-b border-gray-700 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-red-900/20 pointer-events-none"></div>
        
        {/* LEFT: HOME TEAM */}
        <div className="flex-1 flex items-center justify-end gap-4 z-10">
            <div className="text-right hidden md:block">
                <div className="text-2xl font-bold text-white leading-none">{homeTeam.name}</div>
                <div className="text-xs text-gray-400 mt-1">HOME</div>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${homeTeam.color} shadow-lg border-2 border-gray-700`}>
                {homeTeam.logo}
            </div>
        </div>

        <div className="mx-6 md:mx-12 text-center z-10 min-w-[120px]">
            <div className="text-4xl font-mono font-bold text-white tracking-normal bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
                {homeScore} - {awayScore}
            </div>
            <div className="text-green-400 font-mono mt-2 font-bold flex justify-center items-center gap-2">
                {!isFinished && !isPaused && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                {isPaused && <span className="text-xs text-yellow-400 uppercase">Event</span>}
                {formatTime()}
            </div>
        </div>

        {/* RIGHT: AWAY TEAM */}
        <div className="flex-1 flex items-center justify-start gap-4 z-10">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${awayTeam.color} shadow-lg border-2 border-gray-700`}>
                {awayTeam.logo}
            </div>
            <div className="text-left hidden md:block">
                <div className="text-2xl font-bold text-white leading-none">{awayTeam.name}</div>
                <div className="text-xs text-gray-400 mt-1">AWAY</div>
            </div>
        </div>
      </div>

      {/* Main Content - Flex Col Reverse for proper spacing when few items */}
      <div className="flex-1 flex overflow-hidden">
          {/* Live Text Commentary */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-3 scroll-smooth">
              {isFinished && (
                  <div className="text-center py-4 mb-4 border-b border-gray-800 animate-in zoom-in duration-500">
                      <div className="text-2xl font-bold text-white mb-1">FULL TIME</div>
                      <div className="text-xs text-gray-400 mb-4">The match has ended.</div>
                      <button 
                        onClick={() => matchResult && onMatchComplete(matchResult)}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform transform hover:scale-105"
                      >
                          Complete Match
                      </button>
                  </div>
              )}

              {events.length === 0 && minute < 5 && (
                  <div className="text-center text-gray-500 italic py-10 animate-pulse">Match is kicking off...</div>
              )}
              
              {events.map((event, idx) => {
                  const isAway = event.teamId === awayTeam.id;
                  // Use array index as key since we prepend
                  const uniqueKey = `${event.minute}-${event.extraMinute}-${idx}`;
                  
                  return (
                    <div key={uniqueKey} className={`flex w-full ${isAway ? 'justify-end' : 'justify-start'} ${event.isImportant ? 'my-4' : 'my-1'} animate-in slide-in-from-top-2 duration-300`}>
                        <div className={`flex max-w-[85%] md:max-w-[70%] gap-4 ${isAway ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                            
                            {/* Minute Bubble */}
                            <div className="w-12 flex-shrink-0 font-mono text-gray-500 text-sm pt-1 flex flex-col items-center">
                                <span>{event.extraMinute ? `${event.minute}+${event.extraMinute}` : event.minute}'</span>
                            </div>
                            
                            {/* Event Box */}
                            <div className={`flex-1 rounded-lg border shadow-sm relative overflow-hidden ${
                                (event.type === 'sub' || event.type === 'whistle') ? 'py-1.5 px-3' : 'py-2 px-3'
                            } ${
                                event.type === 'goal' ? 'bg-gray-800 border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.2)]' : 
                                event.type === 'card' ? (event.cardType === 'red' ? 'bg-red-900/20 border-red-600' : 'bg-yellow-900/10 border-yellow-600') : 
                                event.type === 'sub' ? 'bg-gray-800 border-blue-500/50' :
                                event.type === 'penalty-award' ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]' :
                                event.type === 'penalty-miss' ? 'bg-gray-800 border-red-800 text-gray-400' :
                                event.type === 'whistle' ? 'bg-gray-800 border-gray-600 text-center italic w-full' :
                                'bg-transparent border-gray-700 py-1'
                            } ${event.type === 'commentary' && (isAway ? 'border-r-2 pr-4' : 'border-l-2 pl-4')}`}>
                                
                                {/* Badge for important events */}
                                {event.type !== 'commentary' && event.type !== 'whistle' && (
                                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 uppercase tracking-wider ${
                                        event.type === 'goal' ? 'bg-green-600 text-white' : 
                                        event.type === 'card' ? (event.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black') : 
                                        event.type === 'sub' ? 'bg-blue-600 text-white' :
                                        event.type === 'penalty-award' ? 'bg-purple-600 text-white' :
                                        event.type === 'penalty-miss' ? 'bg-red-800 text-white' :
                                        'bg-gray-600'
                                    }`}>
                                        {event.type === 'card' && event.cardType === 'red' ? 'RED CARD' : 
                                         event.type === 'sub' ? 'SUBSTITUTION' : 
                                         event.type === 'penalty-award' ? 'PENALTY' :
                                         event.type === 'penalty-miss' ? 'MISSED PENALTY' :
                                         event.type}
                                    </div>
                                )}

                                {/* Text Content */}
                                <div className={`${
                                    event.type === 'goal' ? 'text-base md:text-lg font-bold text-white' : 
                                    event.type === 'whistle' ? 'text-xs md:text-sm text-gray-400' :
                                    'text-sm md:text-base text-gray-300'
                                }`}>
                                    {event.type === 'goal' && <span className="mx-2">⚽</span>}
                                    {event.type === 'card' && <span className="mx-2">{event.cardType === 'red' ? '🟥' : '🟨'}</span>}
                                    {event.type === 'penalty-award' && <span className="mx-2">⚠️</span>}
                                    {event.type === 'penalty-miss' && <span className="mx-2">❌</span>}
                                    {renderEventText(event)}
                                </div>
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>

          {/* Right Stats Column (Desktop) */}
          <div className="w-80 bg-gray-850 border-l border-gray-700 p-6 hidden lg:block shrink-0">
             <h3 className="text-xs font-bold text-gray-400 uppercase mb-6 tracking-widest">Live Match Stats</h3>
             
             <div className="space-y-8">
                 {/* Possession Bar */}
                 <div>
                     <div className="flex justify-between text-xs mb-2 font-bold text-gray-300">
                         <span>Possession</span>
                         <span>{minute > 0 ? Math.round(50 + (homeScore - awayScore) * 2) : 50}%</span>
                     </div>
                     <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                         <div style={{ width: `${50 + (homeScore - awayScore) * 2}%` }} className="bg-blue-500 h-full transition-all duration-1000"></div>
                     </div>
                 </div>

                 {/* Events Summary */}
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-3 text-center text-sm">
                        <div className="text-gray-400">Home</div>
                        <div className="font-bold text-gray-500">vs</div>
                        <div className="text-gray-400">Away</div>

                        <div className="text-xl font-bold text-white mt-2">{homeScore}</div>
                        <div className="text-xs text-gray-600 mt-3 uppercase">Goals</div>
                        <div className="text-xl font-bold text-white mt-2">{awayScore}</div>

                        <div className="text-lg font-bold text-yellow-500 mt-4">{events.filter(e => e.type === 'card' && e.teamId === homeTeam.id).length}</div>
                        <div className="text-xs text-gray-600 mt-5 uppercase">Cards</div>
                        <div className="text-lg font-bold text-yellow-500 mt-4">{events.filter(e => e.type === 'card' && e.teamId === awayTeam.id).length}</div>
                        
                        <div className="text-lg font-bold text-blue-400 mt-4">{events.filter(e => e.type === 'sub' && e.teamId === homeTeam.id).length}</div>
                        <div className="text-xs text-gray-600 mt-5 uppercase">Subs</div>
                        <div className="text-lg font-bold text-blue-400 mt-4">{events.filter(e => e.type === 'sub' && e.teamId === awayTeam.id).length}</div>
                    </div>
                 </div>
             </div>
          </div>
      </div>

      {/* Footer Controls */}
      {!isFinished && (
          <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-center items-center gap-6 z-20 shrink-0">
                <button 
                    onClick={() => setSoundEnabled(!soundEnabled)} 
                    className={`p-3 rounded-full transition-all ${soundEnabled ? 'text-blue-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-700'}`}
                    title="Toggle Sound"
                >
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
                <div className="h-8 w-px bg-gray-700"></div>
                <button onClick={() => setSpeed(200)} className={`p-3 rounded-full transition-all ${speed === 200 ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <Play size={20} fill="currentColor" />
                </button>
                <button onClick={() => setSpeed(20)} className={`p-3 rounded-full transition-all ${speed === 20 ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <FastForward size={20} fill="currentColor" />
                </button>
                <button 
                    onClick={handleSkipMatch} 
                    className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 transition-all hover:text-white hover:scale-105"
                    title="Skip to Result"
                >
                    <SkipForward size={20} fill="currentColor" />
                </button>
          </div>
      )}
    </div>
  );
};

export default MatchView;