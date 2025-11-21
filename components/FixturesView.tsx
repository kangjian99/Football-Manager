
import React, { useState } from 'react';
import { Team, Match, LeagueLevel } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FixturesViewProps {
  schedule: Match[][];
  teams: Team[];
  currentWeek: number;
}

const FixturesView: React.FC<FixturesViewProps> = ({ schedule, teams, currentWeek }) => {
  const [viewWeek, setViewWeek] = useState(currentWeek);
  
  const matches = schedule[viewWeek - 1] || [];
  const getTeam = (id: string) => teams.find(t => t.id === id);

  const handlePrev = () => {
      if (viewWeek > 1) setViewWeek(prev => prev - 1);
  };

  const handleNext = () => {
      if (viewWeek < schedule.length) setViewWeek(prev => prev + 1);
  };

  // Group matches by league based on the home team's league
  const leaguesInMatchWeek = Array.from(new Set(matches.map(m => getTeam(m.homeTeamId)?.league))).filter(Boolean) as LeagueLevel[];

  // Sort leagues (Tier 1 then Tier 2 - using team count average logic or just alphanumeric if simple, 
  // but since we know the data order usually, simple existence check is enough for display).
  // For display consistency, we can sort by the same logic as App.tsx or just alphabetic if we don't have context.
  // However, let's just render them in the order they appear or sort based on string to be deterministic.
  leaguesInMatchWeek.sort();

  const renderMatchRow = (match: Match) => {
        const home = getTeam(match.homeTeamId);
        const away = getTeam(match.awayTeamId);
        if (!home || !away) return null;

        return (
            <div key={match.id} className="flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors group border-b border-gray-700/50 last:border-0">
                {/* Home Team */}
                <div className="flex-1 flex items-center justify-end gap-3">
                    <span className={`font-bold hidden md:block ${match.played && match.homeScore > match.awayScore ? 'text-white' : 'text-gray-400'}`}>{home.name}</span>
                    <span className="font-bold md:hidden text-gray-300">{home.name.substring(0,3).toUpperCase()}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${home.color} text-white shadow-sm`}>
                        {home.logo}
                    </div>
                </div>

                {/* Score/Time */}
                <div className="w-24 flex justify-center">
                    {match.played ? (
                        <div className={`px-3 py-1 rounded border font-mono font-bold text-white ${
                            match.homeScore === match.awayScore ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-600'
                        }`}>
                            {match.homeScore} - {match.awayScore}
                        </div>
                    ) : (
                        <div className="bg-gray-700 px-3 py-1 rounded text-xs text-gray-300 min-w-[50px] text-center">
                            vs
                        </div>
                    )}
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${away.color} text-white shadow-sm`}>
                        {away.logo}
                    </div>
                    <span className={`font-bold hidden md:block ${match.played && match.awayScore > match.homeScore ? 'text-white' : 'text-gray-400'}`}>{away.name}</span>
                    <span className="font-bold md:hidden text-gray-300">{away.name.substring(0,3).toUpperCase()}</span>
                </div>
            </div>
        );
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-850 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Schedule</h2>
        <div className="flex items-center gap-4 bg-gray-900 rounded-full px-2 py-1 border border-gray-700">
            <button 
                onClick={handlePrev}
                disabled={viewWeek === 1}
                className="p-1 hover:bg-gray-700 rounded-full text-gray-400 disabled:opacity-30 transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="font-mono font-bold text-white w-20 text-center">Week {viewWeek}</span>
            <button 
                onClick={handleNext}
                disabled={viewWeek === schedule.length}
                className="p-1 hover:bg-gray-700 rounded-full text-gray-400 disabled:opacity-30 transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[70vh]">
        {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No fixtures scheduled for this week.</div>
        ) : (
            <>
                {leaguesInMatchWeek.map((league, index) => {
                    const leagueMatches = matches.filter(m => getTeam(m.homeTeamId)?.league === league);
                    // Heuristic to style Tier 1 vs Tier 2 differently if we wanted, but generic is safer.
                    const colorClass = index === 0 ? 'text-blue-400' : 'text-green-400';
                    
                    return (
                        <div key={league}>
                            <div className={`bg-gray-900/50 px-4 py-2 text-xs font-bold ${colorClass} uppercase tracking-wider border-b border-gray-700 ${index > 0 ? 'border-t' : ''}`}>
                                {league}
                            </div>
                            {leagueMatches.map(renderMatchRow)}
                        </div>
                    );
                })}
            </>
        )}
      </div>
    </div>
  );
};

export default FixturesView;
