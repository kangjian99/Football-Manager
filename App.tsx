
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeagueTable from './components/LeagueTable';
import MatchView from './components/MatchView';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import SeasonEndView from './components/SeasonEndView';
import { ALL_TEAMS, SERIE_A_TEAMS, SERIE_B_TEAMS } from './constants';
import { Team, ViewState, Match, LeagueLevel } from './types';
import { generateSchedule, simulateMatch } from './services/gameEngine';

const App: React.FC = () => {
  // State
  const [teams, setTeams] = useState<Team[]>(ALL_TEAMS);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [schedule, setSchedule] = useState<Match[][]>([]);
  const [viewLeague, setViewLeague] = useState<LeagueLevel>(LeagueLevel.SERIE_A);
  const [seasonYear, setSeasonYear] = useState("2024/2025");

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

  // Initialization
  useEffect(() => {
    // Initialize Schedule for BOTH leagues
    const sA = generateSchedule(SERIE_A_TEAMS);
    const sB = generateSchedule(SERIE_B_TEAMS);
    
    // Merge schedules week by week
    const combinedSchedule: Match[][] = [];
    const maxWeeks = Math.max(sA.length, sB.length);
    
    for(let i = 0; i < maxWeeks; i++) {
        const matchesA = sA[i] || [];
        const matchesB = sB[i] || [];
        combinedSchedule.push([...matchesA, ...matchesB]);
    }
    
    setSchedule(combinedSchedule);
  }, []);

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

  const handleMatchComplete = (result: Match) => {
    // 1. Simulate all OTHER matches in the background for this week
    const otherMatches = currentWeekMatches.filter(m => m.id !== result.id);
    const simulatedOtherMatches = otherMatches.map(m => {
        const home = teams.find(t => t.id === m.homeTeamId)!;
        const away = teams.find(t => t.id === m.awayTeamId)!;
        return simulateMatch(home, away, currentWeek, m.id);
    });

    const allResults = [result, ...simulatedOtherMatches];

    // Update the schedule state
    setSchedule(prev => {
        const newSchedule = [...prev];
        newSchedule[currentWeek - 1] = allResults;
        return newSchedule;
    });

    // 2. Update Standings and Player Stats
    const newTeams = [...teams].map(team => {
        let points = 0;
        let won = 0;
        let drawn = 0;
        let lost = 0;
        let gf = 0;
        let ga = 0;
        let played = 0;

        // Create a deep copy of players to reset stats
        const newPlayers = team.players.map(p => ({
            ...p,
            goals: 0,
            assists: 0,
            matchesPlayed: 0,
            yellowCards: 0,
            redCards: 0
        }));

        // Iterate through all weeks up to current
        schedule.forEach((weekMatches, idx) => {
            const weekResults = idx === currentWeek - 1 ? allResults : weekMatches;
            
            weekResults.forEach(m => {
                if (m.played && (m.homeTeamId === team.id || m.awayTeamId === team.id)) {
                    // Team Stats
                    played++;
                    const isHome = m.homeTeamId === team.id;
                    const myScore = isHome ? m.homeScore : m.awayScore;
                    const opScore = isHome ? m.awayScore : m.homeScore;

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

                    // Player Stats
                    const sortedForLineup = [...newPlayers].sort((a,b) => b.rating - a.rating);
                    const starters = sortedForLineup.slice(0, 14);
                    starters.forEach(starter => {
                        const pRef = newPlayers.find(p => p.id === starter.id);
                        if (pRef) pRef.matchesPlayed++;
                    });

                    m.events.forEach(evt => {
                        if (evt.teamId === team.id && evt.playerId) {
                            const player = newPlayers.find(p => p.id === evt.playerId);
                            if (player) {
                                if (evt.type === 'goal') player.goals++;
                                if (evt.type === 'card') {
                                    if (evt.cardType === 'red') player.redCards++;
                                    else player.yellowCards++;
                                }
                            }
                        }
                    });
                }
            });
        });
        
        return { 
            ...team, 
            points, won, drawn, lost, gf, ga, played,
            players: newPlayers
        };
    });

    setTeams(newTeams);
    setCurrentWeek(prev => prev + 1);
    
    // Determine next view
    if (currentWeek >= totalWeeks) {
        setCurrentView('SEASON_END');
    } else {
        setCurrentView('LEAGUE'); 
    }
  };

  const handleStartNewSeason = () => {
    // 1. Identify Promotions and Relegations
    const sortByPoints = (a: Team, b: Team) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.gf - b.ga) - (a.gf - a.ga);
    };

    const serieATeams = teams.filter(t => t.league === LeagueLevel.SERIE_A).sort(sortByPoints);
    const serieBTeams = teams.filter(t => t.league === LeagueLevel.SERIE_B).sort(sortByPoints);

    const relegated = serieATeams.slice(-3);
    const promoted = serieBTeams.slice(0, 3);

    // 2. Create Next Season Team Data
    const nextTeams = teams.map(t => {
        let newLeague = t.league;
        if (relegated.some(r => r.id === t.id)) newLeague = LeagueLevel.SERIE_B;
        if (promoted.some(p => p.id === t.id)) newLeague = LeagueLevel.SERIE_A;

        return {
            ...t,
            league: newLeague,
            points: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, played: 0,
            // Reset player seasonal stats
            players: t.players.map(p => ({
                ...p,
                goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0
            }))
        };
    });

    // 3. Generate New Schedule
    const nextSerieATeams = nextTeams.filter(t => t.league === LeagueLevel.SERIE_A);
    const nextSerieBTeams = nextTeams.filter(t => t.league === LeagueLevel.SERIE_B);
    
    const sA = generateSchedule(nextSerieATeams);
    const sB = generateSchedule(nextSerieBTeams);

    const combinedSchedule: Match[][] = [];
    const maxWeeks = Math.max(sA.length, sB.length);
    for(let i = 0; i < maxWeeks; i++) {
        const matchesA = sA[i] || [];
        const matchesB = sB[i] || [];
        combinedSchedule.push([...matchesA, ...matchesB]);
    }

    // 4. Update State
    setTeams(nextTeams);
    setSchedule(combinedSchedule);
    setCurrentWeek(1);
    
    const [startYear, endYear] = seasonYear.split('/');
    setSeasonYear(`${parseInt(startYear) + 1}/${parseInt(endYear) + 1}`);
    
    setCurrentView('DASHBOARD');
  };

  // Selection Screen
  if (!userTeamId) {
    return (
      <div className="h-screen bg-gray-900 overflow-y-auto flex flex-col items-center p-6">
        <div className="max-w-4xl w-full py-12 pb-20">
            <h1 className="text-5xl font-bold text-white text-center mb-2">Calcio Manager AI</h1>
            <p className="text-gray-400 text-center mb-12">Select your club to begin your journey</p>
            
            {/* Serie A Selection */}
            <h2 className="text-2xl font-bold text-gray-300 mb-6 pl-2 border-l-4 border-blue-500">Serie A</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {SERIE_A_TEAMS.map(team => (
                    <button 
                        key={team.id}
                        onClick={() => handleTeamSelect(team.id)}
                        className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 hover:border-blue-500 transition-all flex flex-col items-center gap-3 group"
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

             {/* Serie B Selection */}
             <h2 className="text-2xl font-bold text-gray-300 mb-6 pl-2 border-l-4 border-green-500">Serie B</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {SERIE_B_TEAMS.map(team => (
                    <button 
                        key={team.id}
                        onClick={() => handleTeamSelect(team.id)}
                        className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 hover:border-green-500 transition-all flex flex-col items-center gap-3 group"
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
        disabled={currentView === 'MATCH'} // Disable navigation while in a match
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

        <div className="p-8">
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
                />
            )}
            {currentView === 'LEAGUE' && (
                 <div className="space-y-4">
                    <div className="flex gap-2 bg-gray-800 p-1 rounded-lg w-fit">
                        <button 
                            onClick={() => setViewLeague(LeagueLevel.SERIE_A)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewLeague === LeagueLevel.SERIE_A ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Serie A
                        </button>
                        <button 
                            onClick={() => setViewLeague(LeagueLevel.SERIE_B)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewLeague === LeagueLevel.SERIE_B ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Serie B
                        </button>
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
            {currentView === 'MATCH' && homeTeamForMatch && awayTeamForMatch && userMatch && !isSeasonEnded && (
                <MatchView 
                    homeTeam={homeTeamForMatch}
                    awayTeam={awayTeamForMatch}
                    week={currentWeek}
                    matchId={userMatch.id}
                    userTeamId={userTeamId}
                    onMatchComplete={handleMatchComplete}
                />
            )}
            {currentView === 'SEASON_END' && (
                <SeasonEndView 
                    teams={teams} 
                    onStartNewSeason={handleStartNewSeason} 
                    seasonYear={seasonYear}
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
