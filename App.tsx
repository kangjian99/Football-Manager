
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeagueTable from './components/LeagueTable';
import MatchView from './components/MatchView';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import SeasonEndView from './components/SeasonEndView';
import SettingsView from './components/SettingsView';
import { ALL_TEAMS, SERIE_A_TEAMS, SERIE_B_TEAMS } from './constants';
// To switch to English leagues, uncomment the line below and comment out the line above.
//import { PREMIER_LEAGUE_TEAMS as SERIE_A_TEAMS, CHAMPIONSHIP_TEAMS as SERIE_B_TEAMS, ALL_TEAMS } from './constants_e';
import { Team, ViewState, Match, LeagueLevel } from './types';
import { generateSchedule, simulateMatch, getStartingLineup } from './services/gameEngine';
import { Key, Lock, ShieldCheck, Info } from 'lucide-react';

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

  // Determine if navigation should be locked (Only if in match view AND match exists)
  const isMatchInProgress = currentView === 'MATCH' && !!userMatch && !isSeasonEnded;

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
  }, []); // Run once on mount (or when team set changes if we added that dep)

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

  // Unified logic to process a batch of match results (for one week)
  const processMatchResults = (results: Match[]) => {
      // Update Schedule
      setSchedule(prev => {
          const newSchedule = [...prev];
          newSchedule[currentWeek - 1] = results;
          return newSchedule;
      });

      // Update Teams & Players
      const newTeams = teams.map(team => {
          // Deep copy players, decrementing previous bans
          const updatedPlayers = team.players.map(p => ({
              ...p,
              matchesBanned: Math.max(0, p.matchesBanned - 1)
          }));

          // Check if this team played this week
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
                      if (playerRecord) playerRecord.matchesPlayed++;
                  });
              }

              match.events.forEach(evt => {
                  if (evt.teamId === team.id) {
                      if (evt.type === 'sub' && evt.subOn) {
                          const sub = updatedPlayers.find(p => p.id === evt.subOn!.id);
                          if (sub) sub.matchesPlayed++;
                      }
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

      setTeams(newTeams);
      setCurrentWeek(prev => prev + 1);
      
      if (currentWeek >= totalWeeks) {
          setCurrentView('SEASON_END');
      } else {
          setCurrentView('LEAGUE'); 
      }
  };

  const handleMatchComplete = (result: Match) => {
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
    // Simulate ALL matches for this week (User has no match)
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

    // 2. Create Next Season Team Data
    const nextTeams = teams.map(t => {
        let newLeague = t.league;
        if (relegated.some(r => r.id === t.id)) newLeague = tier2League;
        if (promoted.some(p => p.id === t.id)) newLeague = tier1League;

        return {
            ...t,
            league: newLeague,
            points: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, played: 0,
            // Reset player seasonal stats
            players: t.players.map(p => ({
                ...p,
                goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, matchesBanned: 0
            }))
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
                <p className="text-gray-400 text-center mb-8">Please enter your Google Gemini API Key to activate the scouting assistant and commentary engine.</p>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-200">
                    <p className="flex gap-2 mb-2"><ShieldCheck className="shrink-0" size={18} /> <strong>Privacy First:</strong> Your key is stored locally in your browser and is never sent to our servers.</p>
                    <p className="flex gap-2"><Info className="shrink-0" size={18} /> <strong>Just playing?</strong> You can enter any random string (e.g. "demo") to bypass this screen and play without AI features.</p>
                </div>

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
  if (!userTeamId) {
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
        disabled={isMatchInProgress} // Only disable if actually playing a match
        isSeasonEnded={isSeasonEnded}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-900">
        <header className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-8 sticky top-0 z-20">
            <h1 className="text-xl font-bold text-gray-200">
                {currentView === 'DASHBOARD' && 'Manager Dashboard'}
                {currentView === 'SQUAD' && 'Squad Management'}
                {currentView === 'LEAGUE' && 'League Tables'}
                {currentView === 'FIXTURES' && 'Fixtures & Results'}
                {currentView === 'MATCH' && 'Match Center'}
                {currentView === 'SEASON_END' && 'End of Season Summary'}
                {currentView === 'SETTINGS' && 'Application Settings'}
            </h1>
            <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">Current Season</span>
                    <span className="font-bold text-white">{seasonYear}</span>
                </div>
                <div className="w-px h-8 bg-gray-700"></div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">Week</span>
                    <span className={`font-bold ${isSeasonEnded ? 'text-red-400' : 'text-blue-400'}`}>
                        {isSeasonEnded ? 'END' : currentWeek}
                    </span>
                </div>
            </div>
        </header>

        <div className="p-8 h-[calc(100%-4rem)]">
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
                />
            )}
            {currentView === 'LEAGUE' && (
                 <div className="space-y-4">
                    <div className="flex gap-2 bg-gray-800 p-1 rounded-lg w-fit">
                        {activeLeagues.map((league, index) => (
                            <button 
                                key={league}
                                onClick={() => setViewLeague(league)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
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
                                        Simulate Week
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
