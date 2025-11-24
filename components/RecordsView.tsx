
import React from 'react';
import { Match, Team } from '../types';
import { Flame, Activity } from 'lucide-react';

interface RecordsViewProps {
  schedule: Match[][];
  teams: Team[];
}

const RecordsView: React.FC<RecordsViewProps> = ({ schedule, teams }) => {
  const getTeam = (id: string) => teams.find(t => t.id === id);

  // Flatten schedule and filter matches
  const excitingMatches = schedule.flat().filter(match => {
    if (!match.played) return false;
    
    const diff = Math.abs(match.homeScore - match.awayScore);
    const totalGoals = match.homeScore + match.awayScore;
    
    // Condition: Goal Difference > 4 OR Total Goals > 5
    return diff > 4 || totalGoals > 5 && diff > 2;
  });

  // Sort by total goals descending
  const sortedMatches = excitingMatches.sort((a, b) => {
    const totalA = a.homeScore + a.awayScore;
    const totalB = b.homeScore + b.awayScore;
    return totalB - totalA;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Flame className="text-orange-500" /> Season Highlights
        </h2>
        <p className="text-gray-400">
            Showcasing the most thrilling encounters of the season across all leagues. 
            (Goal Difference &gt; 4 or Total Goals &gt; 5)
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
        {sortedMatches.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Activity size={48} className="mb-4 opacity-20" />
                <p>No historic matches recorded yet this season.</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-700">
                {sortedMatches.map(match => {
                    const home = getTeam(match.homeTeamId);
                    const away = getTeam(match.awayTeamId);
                    
                    if (!home || !away) return null;

                    const totalGoals = match.homeScore + match.awayScore;
                    const diff = Math.abs(match.homeScore - match.awayScore);
                    const isBlowout = diff > 4;

                    return (
                        <div key={match.id} className="p-6 hover:bg-gray-700/50 transition-colors flex flex-col md:flex-row items-center justify-between gap-6 group">
                            {/* League Badge */}
                            <div className="md:w-32 flex flex-col items-center md:items-start shrink-0">
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                                    home.league.includes('Serie A') || home.league.includes('Premier') 
                                    ? 'bg-blue-900/30 text-blue-400 border-blue-800' 
                                    : 'bg-green-900/30 text-green-400 border-green-800'
                                }`}>
                                    {home.league}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">Week {match.week}</span>
                            </div>

                            {/* Scoreboard */}
                            <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 w-full">
                                {/* Home */}
                                <div className="flex-1 flex flex-col items-center text-center">
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg ${home.color} mb-2`}>
                                        {home.logo}
                                    </div>
                                    <span className="font-bold text-white text-sm md:text-base leading-tight">{home.name}</span>
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-center">
                                    <div className="text-3xl md:text-5xl font-black text-white font-mono tracking-tighter bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-600">
                                        {match.homeScore} - {match.awayScore}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        {isBlowout && <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">Massacre</span>}
                                        {totalGoals > 6 && !isBlowout && <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase">Goal Fest</span>}
                                    </div>
                                </div>

                                {/* Away */}
                                <div className="flex-1 flex flex-col items-center text-center">
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg ${away.color} mb-2`}>
                                        {away.logo}
                                    </div>
                                    <span className="font-bold text-white text-sm md:text-base leading-tight">{away.name}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default RecordsView;
