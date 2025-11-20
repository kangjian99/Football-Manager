
import React, { useEffect, useState, useRef } from 'react';
import { Team, Match, MatchEvent } from '../types';
import { Play, FastForward, SkipForward, Timer, Volume2, VolumeX } from 'lucide-react';
import { simulateMatch } from '../services/gameEngine';
import { playWhistle, playGoalSound, resumeAudio } from '../services/audioService';

interface MatchViewProps {
  homeTeam: Team;
  awayTeam: Team;
  week: number;
  matchId: string;
  userTeamId: string;
  onMatchComplete: (matchResult: Match) => void;
  initialSoundEnabled: boolean;
}

const MatchView: React.FC<MatchViewProps> = ({ homeTeam, awayTeam, week, matchId, userTeamId, onMatchComplete, initialSoundEnabled }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [minute, setMinute] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [speed, setSpeed] = useState(100); // ms per tick
  const [matchResult, setMatchResult] = useState<Match | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Keep track of events we've already processed for sound to avoid double playing
  const processedEventsRef = useRef<Set<number>>(new Set());

  // Simulate immediately on mount (calculation), but don't show result yet
  useEffect(() => {
    // We must simulate using homeTeam and awayTeam in that order
    const result = simulateMatch(homeTeam, awayTeam, week, matchId);
    setMatchResult(result);
  }, [homeTeam, awayTeam, week, matchId]);

  const handleStartMatch = () => {
    resumeAudio(); // Initialize audio context on user interaction
    setHasStarted(true);
  };

  // Playback loop
  useEffect(() => {
    if (!hasStarted || !matchResult || isFinished) return;

    const interval = setInterval(() => {
      setMinute(prev => {
        if (prev >= 90) {
          setIsFinished(true);
          clearInterval(interval);
          return 90;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [hasStarted, speed, matchResult, isFinished]);

  // Update visible events and Play Sounds
  useEffect(() => {
    if (matchResult && hasStarted) {
      const currentEvents = matchResult.events.filter(e => e.minute === minute);
      
      if (currentEvents.length > 0) {
        setEvents(prev => [...prev, ...currentEvents]);
        
        // Sound Logic
        if (soundEnabled) {
            currentEvents.forEach(evt => {
                // Whistle for Kickoff (1) and Half Time (46)
                if (evt.type === 'whistle') {
                    playWhistle();
                }
                // Goal
                if (evt.type === 'goal') {
                    playGoalSound();
                }
            });
        }
      }
    }
  }, [minute, matchResult, hasStarted, soundEnabled]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Calculate Score live
  const homeScore = events.filter(e => e.type === 'goal' && e.teamId === homeTeam.id).length;
  const awayScore = events.filter(e => e.type === 'goal' && e.teamId === awayTeam.id).length;

  // Helper to render text with highlighted player name
  const renderEventText = (event: MatchEvent) => {
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

  if (!hasStarted) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-900 p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6a?q=80&w=2070')] bg-cover bg-center"></div>
            
            <div className="z-10 flex flex-col items-center gap-12 w-full max-w-4xl">
                <div className="flex items-center justify-between w-full">
                    {/* HOME TEAM PREVIEW */}
                    <div className="flex flex-col items-center gap-4">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl ${homeTeam.color} shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-gray-700`}>
                            {homeTeam.logo}
                        </div>
                        <h2 className="text-3xl font-bold text-white">{homeTeam.name}</h2>
                        {homeTeam.id === userTeamId && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">YOU</span>}
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-xl font-mono text-gray-400 mb-2">WEEK {week}</div>
                        <div className="text-6xl font-bold text-white italic">VS</div>
                        <div className="text-sm text-gray-500 mt-4">Stadio Olimpico</div>
                    </div>

                    {/* AWAY TEAM PREVIEW */}
                    <div className="flex flex-col items-center gap-4">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl ${awayTeam.color} shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 border-gray-700`}>
                            {awayTeam.logo}
                        </div>
                        <h2 className="text-3xl font-bold text-white">{awayTeam.name}</h2>
                        {awayTeam.id === userTeamId && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">YOU</span>}
                    </div>
                </div>

                <button 
                    onClick={handleStartMatch}
                    className="group relative bg-green-600 hover:bg-green-500 text-white px-16 py-5 rounded-full font-bold text-2xl shadow-lg shadow-green-900/50 transition-all transform hover:scale-105"
                >
                    <span className="flex items-center gap-3">
                        <Timer size={32} />
                        KICK OFF
                    </span>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Scoreboard */}
      <div className="bg-gray-800 p-6 shadow-xl border-b border-gray-700 flex justify-between items-center relative overflow-hidden">
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
            <div className="text-5xl font-mono font-bold text-white tracking-wider bg-black/40 px-4 py-1 rounded-lg backdrop-blur-sm">
                {homeScore} - {awayScore}
            </div>
            <div className="text-green-400 font-mono mt-2 font-bold flex justify-center items-center gap-2">
                {minute < 90 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                {minute}'
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Live Text Commentary */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-3 scroll-smooth" ref={scrollRef}>
              {events.length === 0 && minute < 5 && (
                  <div className="text-center text-gray-500 italic py-10 animate-pulse">Match is kicking off...</div>
              )}
              
              {events.map((event, idx) => (
                  <div key={idx} className={`flex gap-4 ${event.isImportant ? 'my-4' : 'my-1'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className="w-12 text-right font-mono text-gray-500 text-sm pt-1">{event.minute}'</div>
                      
                      <div className={`flex-1 p-3 rounded-lg border shadow-sm relative overflow-hidden ${
                          event.type === 'goal' ? 'bg-gray-800 border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.2)]' : 
                          event.type === 'card' ? (event.cardType === 'red' ? 'bg-red-900/20 border-red-600' : 'bg-yellow-900/10 border-yellow-600') : 
                          event.type === 'whistle' ? 'bg-gray-800 border-gray-600 text-center italic' :
                          'bg-transparent border-l-2 border-gray-700 pl-4 py-1'
                      }`}>
                          {/* Badge for important events */}
                          {event.type !== 'commentary' && event.type !== 'whistle' && (
                            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 uppercase tracking-wider ${
                                event.type === 'goal' ? 'bg-green-600 text-white' : 
                                event.type === 'card' ? (event.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black') : 'bg-gray-600'
                            }`}>
                                {event.type === 'card' && event.cardType === 'red' ? 'RED CARD' : event.type}
                            </div>
                          )}

                          {/* Text Content */}
                          <div className={`${event.type === 'goal' ? 'text-lg md:text-xl font-bold text-white' : 'text-sm md:text-base text-gray-300'}`}>
                              {event.type === 'goal' && <span className="mr-2">⚽</span>}
                              {event.type === 'card' && <span className="mr-2">{event.cardType === 'red' ? '🟥' : '🟨'}</span>}
                              {renderEventText(event)}
                          </div>
                      </div>
                  </div>
              ))}
              
              {isFinished && (
                  <div className="text-center py-10 mt-10 border-t border-gray-800 animate-in zoom-in duration-500">
                      <div className="text-4xl font-bold text-white mb-2">FULL TIME</div>
                      <div className="text-gray-400 mb-6">The match has ended.</div>
                      <button 
                        onClick={() => matchResult && onMatchComplete(matchResult)}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform transform hover:scale-105"
                      >
                          Complete Match
                      </button>
                  </div>
              )}
              
              {/* Spacer for auto-scroll */}
              <div className="h-20"></div>
          </div>

          {/* Right Stats Column (Desktop) */}
          <div className="w-80 bg-gray-850 border-l border-gray-700 p-6 hidden lg:block">
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
                    </div>
                 </div>
             </div>
          </div>
      </div>

      {/* Footer Controls */}
      {!isFinished && (
          <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-center items-center gap-6 z-20">
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
                <button onClick={() => setMinute(90)} className="p-3 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 transition-all hover:text-white">
                    <SkipForward size={20} fill="currentColor" />
                </button>
          </div>
      )}
    </div>
  );
};

export default MatchView;
