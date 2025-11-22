
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeagueTable from './components/LeagueTable';
import MatchView from './components/MatchView';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import SeasonEndView from './components/SeasonEndView';
import SettingsView from './components/SettingsView';
import { ALL_TEAMS } from './constants';
// To switch to English leagues, uncomment the line below and comment out the line above.
//import { ALL_TEAMS } from './constants_e';
import { Team, ViewState, Match, LeagueLevel } from './types';
import { generateSchedule, simulateMatch, getStartingLineup } from './services/gameEngine';
import { Key, Lock, ShieldCheck, Info, Menu } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  // Default to Italian leagues as per initial configuration. 
  // To change data source, swap the imports above.
  const [teams, setTeams] = useState<Team[]>(ALL_TEAMS);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [schedule, setSchedule] = useState<Match[][]>([]);
  const [viewLeague, setViewLeague] = useState<LeagueLevel>(LeagueLevel.SERIE_A); // Default, will update on load
  const [seasonYear, setSeasonYear] = useState("2024/2025");
  const [isMatchInProgress, setIsMatchInProgress] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Sound Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('sound_enabled');
    return stored === null ? true : stored === 'true';
  });

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('sound_enabled', String(newVal));
  };

  // Computed: Identify active leagues dynamically
  const activeLeagues = useMemo(() => {
      const leagues = Array.from(new Set(teams.map(t => t.league))) as LeagueLevel[];
      // Sort leagues by average team strength to determine hierarchy (Tier 1 vs Tier 2)
      return leagues.sort((a, b) => {
          const getAvg = (l: LeagueLevel) => {
             const ts = teams.filter(t => t.league === l);
             return ts.reduce((acc, t) => acc + t.att + t.mid + t.def, 0) / ts.length;
          };
          return getAvg(b) - getAvg(a);
      });
  }, [teams]);

  // Computed
  const userTeam = teams.find(t => t.id === userTeamId);
  const totalWeeks = schedule.length;
  const isSeasonEnded = totalWeeks > 0 && currentWeek > totalWeeks;

  // Calculate Rank (Always relative to user's league)
  const userLeagueTeams = teams.filter(t => t.league === userTeam?.league);
  const sortedUserLeagueTeams = [...userLeagueTeams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
  const userRank = userTeam ? sortedUserLeagueTeams.findIndex(t => t.id === userTeam.id) + 1 : 0;

  // Find next match for user
  const currentWeekMatches = !isSeasonEnded ? (schedule[currentWeek - 1] || []) : [];
  const userMatch = currentWeekMatches.find(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
  
  // Determine Home/Away context for the user
  const isUserHome = userMatch?.homeTeamId === userTeamId;
  const opponentId = userMatch ? (isUserHome ? userMatch.awayTeamId : userMatch.homeTeamId) : null;
  const opponent = teams.find(t => t.id === opponentId) || null;

  // Determine if user has ANY matches left in the schedule
  const userHasFutureMatches = useMemo(() => {
      if (!userTeamId) return false;
      // Check from current week onwards
      const remainingWeeks = schedule.slice(currentWeek - 1);
      return remainingWeeks.some(weekMatches => 
          weekMatches.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)
      );
  }, [schedule, currentWeek, userTeamId]);

  // Initialization
  useEffect(() => {
    // Generate schedule based on dynamically detected leagues
    if (activeLeagues.length > 0) {
        const tier1Teams = teams.filter(t => t.league === activeLeagues[0]);
        const tier2Teams = teams.filter(t => t.league === activeLeagues[1]);
        
        const s1 = generateSchedule(tier1Teams);
        const s2 = generateSchedule(tier2Teams);
        
        // Merge schedules week by week
        const combinedSchedule: Match[][] = [];
        const maxWeeks = Math.max(s1.length, s2.length);
        
        for(let i = 0; i < maxWeeks; i++) {
            const matches1 = s1[i] || [];
            const matches2 = s2[i] || [];
            combinedSchedule.push([...matches1, ...matches2]);
        }
        
        setSchedule(combinedSchedule);
        setViewLeague(activeLeagues[0]); // Default view to top tier
    }
  }, []); // Run once on mount

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (document.getElementById('apiKeyInput') as HTMLInputElement).value;
    if (input.trim()) {
        localStorage.setItem('gemini_api_key', input.trim());
        setApiKey(input.trim());
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setCurrentView('DASHBOARD'); 
  };

  const handleTeamSelect = (id: string) => {
    const t = teams.find(team => team.id === id);
    if (t) {
        setViewLeague(t.league);
    }
    setUserTeamId(id);
    setCurrentView('DASHBOARD');
  };

  const handlePlayMatch = () => {
    setCurrentView('MATCH');
  };

  // Pure function to calculate stats updates
  const calculateTeamUpdates = (currentTeams: Team[], results: Match[]): Team[] => {
      return currentTeams.map(team => {
          // Deep copy players, decrementing previous bans
          const updatedPlayers = team.players.map(p => ({
              ...p,
              matchesBanned: Math.max(0, p.matchesBanned - 1)
          }));

          // Check if this team played in this batch of results
          const match = results.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
          
          // Update container variables
          let { points, won, drawn, lost, gf, ga, played } = team;

          if (match) {
              played++;
              const isHome = (m: Match) => m.homeTeamId === team.id;
              const myScore = isHome(match) ? match.homeScore : match.awayScore;
              const opScore = isHome(match) ? match.awayScore : match.homeScore;

              gf += myScore;
              ga += opScore;

              if (myScore > opScore) {
                  points += 3;
                  won++;
              } else if (myScore === opScore) {
                  points += 1;
                  drawn++;
              } else {
                  lost++;
              }

              // --- UPDATE PLAYER STATS ---
              const matchLineup = isHome(match) ? match.homeLineup : match.awayLineup;

              if (matchLineup) {
                  matchLineup.forEach(starter => {
                      const playerRecord = updatedPlayers.find(p => p.id === starter.id);
                      if (playerRecord) {
                          // Check if subbed out
                          const subOutEvent = match.events.find(e => e.type === 'sub' && e.subOff?.id === starter.id);
                          let minutesPlayed = 0;
                          
                          if (subOutEvent) {
                             minutesPlayed = subOutEvent.minute; // Started at 0
                          } else {
                             minutesPlayed = 90 + match.secondHalfStoppage; // Full match including stoppage
                          }
                          
                          // Only count MP if played at least 5 minutes
                          if (minutesPlayed >= 5) {
                              playerRecord.matchesPlayed++;
                          }
                      }
                  });
              }

              match.events.forEach(evt => {
                  if (evt.teamId === team.id) {
                      // Handle Substitutes
                      if (evt.type === 'sub' && evt.subOn) {
                          const sub = updatedPlayers.find(p => p.id === evt.subOn!.id);
                          if (sub) {
                              const startMinute = evt.minute;
                              const startExtra = evt.extraMinute || 0;
                              
                              // Check if subbed out later (rare but possible)
                              const subOutEvent = match.events.find(e => 
                                  e.type === 'sub' && 
                                  e.subOff?.id === evt.subOn?.id && 
                                  (e.minute > startMinute || (e.minute === startMinute && (e.extraMinute || 0) > startExtra))
                              );

                              let duration = 0;
                              if (subOutEvent) {
                                  duration = subOutEvent.minute - startMinute;
                              } else {
                                  // Played until end
                                  if (startMinute >= 90) {
                                      duration = Math.max(0, match.secondHalfStoppage - startExtra);
                                  } else {
                                      duration = (90 - startMinute) + match.secondHalfStoppage;
                                  }
                              }

                              if (duration >= 5) {
                                  sub.matchesPlayed++;
                              }
                          }
                      }
                      
                      // Handle Goals and Cards
                      if (evt.playerId) {
                           const player = updatedPlayers.find(p => p.id === evt.playerId);
                           if (player) {
                               if (evt.type === 'goal') player.goals++;
                               if (evt.type === 'card') {
                                   if (evt.cardType === 'red') {
                                       player.redCards++;
                                       player.matchesBanned = 1;
                                   } else {
                                       player.yellowCards++;
                                       if (player.yellowCards > 0 && player.yellowCards % 3 === 0) {
                                           player.matchesBanned = 1;
                                       }
                                   }
                               }
                           }
                      }
                  }
              });
          }
          
          return { 
              ...team, 
              points, won, drawn, lost, gf, ga, played,
              players: updatedPlayers
          };
      });
  };

  const processMatchResults = (results: Match[]) => {
      // Update Schedule
      setSchedule(prev => {
          const newSchedule = [...prev];
          newSchedule[currentWeek - 1] = results;
          return newSchedule;
      });

      // Update Teams using the helper logic
      const newTeams = calculateTeamUpdates(teams, results);
      setTeams(newTeams);

      setCurrentWeek(prev => prev + 1);
      
      if (currentWeek >= totalWeeks) {
          setCurrentView('SEASON_END');
      } else {
          setCurrentView('LEAGUE'); 
      }
  };

  const handleMatchComplete = (result: Match) => {
    setIsMatchInProgress(false);
    // Simulate all OTHER matches in the background for this week
    const otherMatches = currentWeekMatches.filter(m => m.id !== result.id);
    const simulatedOtherMatches = otherMatches.map(m => {
        const home = teams.find(t => t.id === m.homeTeamId)!;
        const away = teams.find(t => t.id === m.awayTeamId)!;
        return simulateMatch(home, away, currentWeek, m.id);
    });

    const allResults = [result, ...simulatedOtherMatches];
    processMatchResults(allResults);
  };

  const handleSimulateWeek = () => {
    // Check if user is essentially done with the season (e.g. Tier 1 finished, Tier 2 still going)
    if (!userHasFutureMatches && currentWeek <= totalWeeks) {
        // BULK SIMULATION: Fast forward through all remaining weeks
        let tempTeams = [...teams];
        let tempSchedule = [...schedule];
        
        for (let w = currentWeek; w <= totalWeeks; w++) {
            const weekMatches = tempSchedule[w-1];
            const results = weekMatches.map(m => {
               const home = tempTeams.find(t => t.id === m.homeTeamId)!;
               const away = tempTeams.find(t => t.id === m.awayTeamId)!;
               // Simulate logic
               return simulateMatch(home, away, w, m.id);
            });
            
            // Update schedule for this week
            tempSchedule[w-1] = results;
            // Accumulate stats for next iteration
            tempTeams = calculateTeamUpdates(tempTeams, results);
        }
        
        // Final State Updates
        setSchedule(tempSchedule);
        setTeams(tempTeams);
        setCurrentWeek(totalWeeks + 1);
        setCurrentView('SEASON_END');
        return;
    }

    // Normal Single Week Simulation
    const simulatedMatches = currentWeekMatches.map(m => {
        const home = teams.find(t => t.id === m.homeTeamId)!;
        const away = teams.find(t => t.id === m.awayTeamId)!;
        return simulateMatch(home, away, currentWeek, m.id);
    });
    processMatchResults(simulatedMatches);
  };

  const handleStartNewSeason = () => {
    // 1. Identify Promotions and Relegations dynamically based on active leagues
    const tier1League = activeLeagues[0];
    const tier2League = activeLeagues[1];

    const sortByPoints = (a: Team, b: Team) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.gf - b.ga) - (a.gf - a.ga);
    };

    const tier1Teams = teams.filter(t => t.league === tier1League).sort(sortByPoints);
    const tier2Teams = teams.filter(t => t.league === tier2League).sort(sortByPoints);

    const relegated = tier1Teams.slice(-3);
    const promoted = tier2Teams.slice(0, 3);

    // 2. Create Next Season Team Data & Apply Player Growth
    const nextTeams = teams.map(t => {
        let newLeague = t.league;
        if (relegated.some(r => r.id === t.id)) newLeague = tier2League;
        if (promoted.some(p => p.id === t.id)) newLeague = tier1League;

        // Update Player Ages and Ratings
        const updatedPlayers = t.players.map(p => {
            const newAge = p.age + 1;
            let newRating = p.rating;
            const randomFactor = Math.random();

            // Development Logic based on Age
            if (newAge <= 21) {
                // Youngsters improve fast
                if (randomFactor > 0.3) newRating += Math.floor(Math.random() * 3) + 1; // +1 to +3
            } else if (newAge <= 26) {
                // Developing/Prime entry
                if (randomFactor > 0.4) newRating += Math.floor(Math.random() * 2) + 1; // +1 to +2
            } else if (newAge <= 31) {
                // Prime - mostly stable, small variations
                if (randomFactor > 0.7) newRating += 1;
                else if (randomFactor < 0.3) newRating -= 1;
            } else {
                // Decline for older players
                if (randomFactor > 0.2) newRating -= Math.floor(Math.random() * 3) + 1; // -1 to -3
            }

            // Clamp rating
            if (newRating > 99) newRating = 99;
            if (newRating < 50) newRating = 50;

            return {
                ...p,
                age: newAge,
                rating: newRating,
                // Reset seasonal stats
                goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, matchesBanned: 0,
                form: 6 + Math.floor(Math.random() * 4)
            };
        });

        // Recalculate Team Stats based on new squad
        const getPosAvg = (pos: string) => {
            const ps = updatedPlayers.filter(p => p.position === pos).sort((a,b) => b.rating - a.rating).slice(0, 5); 
            if (ps.length === 0) return t[pos === 'FWD' ? 'att' : pos === 'MID' ? 'mid' : 'def'];
            return Math.round(ps.reduce((sum, p) => sum + p.rating, 0) / ps.length);
        };

        // GK contributes to DEF stat
        const defPlayers = updatedPlayers.filter(p => p.position === 'DEF').sort((a,b) => b.rating - a.rating).slice(0, 4);
        const gkPlayer = updatedPlayers.filter(p => p.position === 'GK').sort((a,b) => b.rating - a.rating)[0];
        
        const newAtt = getPosAvg('FWD');
        const newMid = getPosAvg('MID');
        
        let newDef = t.def;
        if (defPlayers.length > 0 && gkPlayer) {
            const defSum = defPlayers.reduce((sum, p) => sum + p.rating, 0);
            newDef = Math.round((defSum + gkPlayer.rating) / (defPlayers.length + 1));
        }

        return {
            ...t,
            league: newLeague,
            att: newAtt, 
            mid: newMid, 
            def: newDef,
            points: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, played: 0,
            players: updatedPlayers
        };
    });

    // 3. Generate New Schedule
    const nextTier1Teams = nextTeams.filter(t => t.league === tier1League);
    const nextTier2Teams = nextTeams.filter(t => t.league === tier2League);
    
    const s1 = generateSchedule(nextTier1Teams);
    const s2 = generateSchedule(nextTier2Teams);

    const combinedSchedule: Match[][] = [];
    const maxWeeks = Math.max(s1.length, s2.length);
    for(let i = 0; i < maxWeeks; i++) {
        const matches1 = s1[i] || [];
        const matches2 = s2[i] || [];
        combinedSchedule.push([...matches1, ...matches2]);
    }

    // 4. Update State
    setTeams(nextTeams);
    setSchedule(combinedSchedule);
    setCurrentWeek(1);
    
    const [startYear, endYear] = seasonYear.split('/');
    setSeasonYear(`${parseInt(startYear) + 1}/${parseInt(endYear) + 1}`);
    
    setCurrentView('DASHBOARD');
  };

  // --- API KEY SCREEN ---
  if (!apiKey && !process.env.API_KEY) {
    return (
        <div className="h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full animate-in zoom-in duration-300">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
                        <Key size={32} />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome Manager</h1>
                <p className="text-gray-400 text-center mb-8">请输入您的 Google Gemini API 密钥，以激活球探助手和解说引擎</p>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-200">
                    <p className="flex gap-2"><Info className="shrink-0" size={18} /> <strong>只想试玩？</strong><span className="flex-1">您可以输入任意字符串（例如“demo”）跳过此页面，无需使用 AI 功能即可体验游戏</span></p>
                </div>
{/*
                <p className="text-gray-400 text-center mb-8">Please enter your Google Gemini API Key to activate the scouting assistant and commentary engine.</p>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-200">
                    <p className="flex gap-2 mb-2"><ShieldCheck className="shrink-0" size={18} /> <strong>Privacy First:</strong> Your key is stored locally in your browser and is never sent to our servers.</p>
                    <p className="flex gap-2"><Info className="shrink-0" size={18} /> <strong>Just playing?</strong> You can enter any random string (e.g. "demo") to bypass this screen and play without AI features.</p>
                </div>
*/}
                <form onSubmit={handleSaveApiKey} className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            id="apiKeyInput"
                            type="password" 
                            placeholder="Paste your API Key here" 
                            className="w-full bg-gray-900 border border-gray-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-900/30">
                        Start Game
                    </button>
                </form>
                <p className="text-xs text-gray-500 text-center mt-6">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get an API key here</a>
                </p>
            </div>
        </div>
    );
  }

  // --- TEAM SELECTION SCREEN ---
  // Fix: Ensure we not only have an ID, but a VALID team object.
  // If userTeamId is stale (e.g. from previous session with different league data), userTeam will be undefined.
  if (!userTeamId || !userTeam) {
    return (
      <div className="h-screen bg-gray-900 overflow-y-auto flex flex-col items-center p-6">
        <div className="max-w-6xl w-full py-12 pb-20">
            <div className="flex justify-between items-center mb-2">
                <div></div> {/* Spacer */}
                <h1 className="text-5xl font-bold text-white text-center">Calcio Manager AI</h1>
                <button 
                    onClick={handleClearApiKey}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
                    title="Clear API Key"
                >
                    <Key size={12} /> Reset Key
                </button>
            </div>
            
            <p className="text-gray-400 text-center mb-12">Select your club to begin your journey</p>
            
            {activeLeagues.map((league, index) => (
                <div key={league} className="mb-12">
                     <h2 className={`text-2xl font-bold text-gray-300 mb-6 pl-2 border-l-4 ${index === 0 ? 'border-blue-500' : 'border-green-500'}`}>
                        {league}
                     </h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {teams.filter(t => t.league === league).map(team => (
                            <button 
                                key={team.id}
                                onClick={() => handleTeamSelect(team.id)}
                                className={`bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 transition-all flex flex-col items-center gap-3 group ${index === 0 ? 'hover:border-blue-500' : 'hover:border-green-500'}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${team.color} group-hover:scale-110 transition-transform`}>
                                    {team.logo}
                                </div>
                                <div className="font-bold text-white">{team.name}</div>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span>ATT {team.att}</span>
                                    <span>DEF {team.def}</span>
                                </div>
                            </button>
                        ))}
                     </div>
                </div>
            ))}

        </div>
      </div>
    );
  }

  // Prepare MatchView props safely
  const homeTeamForMatch = userMatch ? teams.find(t => t.id === userMatch.homeTeamId) : null;
  const awayTeamForMatch = userMatch ? teams.find(t => t.id === userMatch.awayTeamId) : null;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        userTeam={userTeam!} 
        disabled={isMatchInProgress} // Lock navigation during match
        isSeasonEnded={isSeasonEnded}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-900 flex flex-col">
        <header className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shrink-0">
            <div className="flex items-center">
                <button 
                    className="md:hidden mr-4 text-gray-400 hover:text-white"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu />
                </button>
                <h1 className="text-lg md:text-xl font-bold text-gray-200 truncate">
                    {currentView === 'DASHBOARD' && 'Manager Dashboard'}
                    {currentView === 'SQUAD' && 'Squad Management'}
                    {currentView === 'LEAGUE' && 'League Tables'}
                    {currentView === 'FIXTURES' && 'Fixtures & Results'}
                    {currentView === 'MATCH' && 'Match Center'}
                    {currentView === 'SEASON_END' && 'End of Season Summary'}
                    {currentView === 'SETTINGS' && 'Application Settings'}
                </h1>
            </div>
            <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm">
                <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-gray-400">Current Season</span>
                    <span className="font-bold text-white">{seasonYear}</span>
                </div>
                <div className="w-px h-8 bg-gray-700 hidden sm:block"></div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">Week</span>
                    <span className={`font-bold ${isSeasonEnded ? 'text-red-400' : 'text-blue-400'}`}>
                        {isSeasonEnded ? 'END' : currentWeek}
                    </span>
                </div>
            </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
            {currentView === 'DASHBOARD' && (
                <Dashboard 
                    userTeam={userTeam!} 
                    rank={userRank}
                    nextMatch={userMatch || null}
                    opponent={opponent}
                    isHome={isUserHome}
                    onPlayMatch={handlePlayMatch}
                    isSeasonEnded={isSeasonEnded}
                    onViewSeasonEnd={() => setCurrentView('SEASON_END')}
                    onSimulateWeek={handleSimulateWeek}
                    userHasFutureMatches={userHasFutureMatches}
                />
            )}
            {currentView === 'LEAGUE' && (
                 <div className="space-y-4">
                    <div className="flex gap-2 bg-gray-800 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                        {activeLeagues.map((league, index) => (
                            <button 
                                key={league}
                                onClick={() => setViewLeague(league)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${
                                    viewLeague === league 
                                        ? (index === 0 ? 'bg-blue-600 text-white shadow' : 'bg-green-600 text-white shadow') 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {league}
                            </button>
                        ))}
                    </div>
                    <LeagueTable teams={teams.filter(t => t.league === viewLeague)} userTeamId={userTeamId} />
                </div>
            )}
            {currentView === 'SQUAD' && (
                <SquadView team={userTeam!} />
            )}
            {currentView === 'FIXTURES' && (
                <FixturesView schedule={schedule} teams={teams} currentWeek={currentWeek > totalWeeks ? totalWeeks : currentWeek} />
            )}
            {currentView === 'MATCH' && (
                (homeTeamForMatch && awayTeamForMatch && userMatch && !isSeasonEnded) ? (
                    <MatchView 
                        homeTeam={homeTeamForMatch}
                        awayTeam={awayTeamForMatch}
                        week={currentWeek}
                        matchId={userMatch.id}
                        userTeamId={userTeamId}
                        onMatchStart={() => setIsMatchInProgress(true)}
                        onMatchComplete={handleMatchComplete}
                        initialSoundEnabled={soundEnabled}
                    />
                ) : (
                    // Fallback UI if in MATCH view but no match exists (e.g. Season End or Bye Week)
                    <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in">
                        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl max-w-md">
                            <h2 className="text-2xl font-bold text-white mb-4">No Match Scheduled</h2>
                            <p className="text-gray-400 mb-6">
                                {isSeasonEnded 
                                    ? "The season has concluded. Please view the summary." 
                                    : `Your team does not have a fixture in Week ${currentWeek} (Bye Week or League Completed).`}
                            </p>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => setCurrentView('DASHBOARD')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold transition-colors"
                                >
                                    Return to Dashboard
                                </button>
                                {!isSeasonEnded && (
                                    <button 
                                        onClick={() => {
                                            handleSimulateWeek();
                                            setCurrentView('DASHBOARD');
                                        }}
                                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-full font-bold transition-colors"
                                    >
                                        {userHasFutureMatches ? 'Simulate Week' : 'Simulate Season Remainder'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            )}
            {currentView === 'SEASON_END' && (
                <SeasonEndView 
                    teams={teams} 
                    onStartNewSeason={handleStartNewSeason} 
                    seasonYear={seasonYear}
                />
            )}
            {currentView === 'SETTINGS' && (
                <SettingsView 
                    onClearApiKey={handleClearApiKey} 
                    soundEnabled={soundEnabled}
                    onToggleSound={handleToggleSound}
                />
            )}
             {currentView === 'TACTICS' && (
                <div className="text-center py-20 text-gray-500">
                    <h2 className="text-2xl font-bold mb-4">Training Ground</h2>
                    <p>Training features coming in next update.</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
