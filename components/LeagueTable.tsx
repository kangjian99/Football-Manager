
import React, { useState } from 'react';
import { Team, Player } from '../types';
import { Trophy, Medal } from 'lucide-react';

interface LeagueTableProps {
  teams: Team[];
  userTeamId: string;
}

const LeagueTable: React.FC<LeagueTableProps> = ({ teams, userTeamId }) => {
  const [view, setView] = useState<'TABLE' | 'SCORERS'>('TABLE');

  // Sort teams: Points > GD > GF
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });

  // Get Top Scorers
  const allPlayers = teams.flatMap(t => 
    t.players.map(p => ({ 
      ...p, 
      teamName: t.name, 
      teamLogo: t.logo,
      teamColor: t.color 
    }))
  );
  
  const topScorers = allPlayers
    .filter(p => p.goals > 0)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.matchesPlayed - b.matchesPlayed; // Less matches played is better tiebreaker
    })
    .slice(0, 15);

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-850 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">
             {teams.length > 0 ? teams[0].league : 'League'} Stats
        </h2>
        <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
            <button 
                onClick={() => setView('TABLE')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'TABLE' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Trophy size={14} /> Standings
            </button>
            <button 
                onClick={() => setView('SCORERS')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'SCORERS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Medal size={14} /> Top Scorers
            </button>
        </div>
      </div>

      {view === 'TABLE' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 uppercase text-xs">
                <th className="px-6 py-3 font-semibold">Pos</th>
                <th className="px-6 py-3 font-semibold">Club</th>
                <th className="px-4 py-3 font-semibold text-center">P</th>
                <th className="px-4 py-3 font-semibold text-center">W</th>
                <th className="px-4 py-3 font-semibold text-center">D</th>
                <th className="px-4 py-3 font-semibold text-center">L</th>
                <th className="px-4 py-3 font-semibold text-center">GF</th>
                <th className="px-4 py-3 font-semibold text-center">GA</th>
                <th className="px-4 py-3 font-semibold text-center">GD</th>
                <th className="px-6 py-3 font-bold text-right text-white">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedTeams.map((team, index) => {
                const isUser = team.id === userTeamId;
                const gd = team.gf - team.ga;
                return (
                  <tr 
                      key={team.id} 
                      className={`${isUser ? 'bg-blue-900/30' : 'hover:bg-gray-700/50'} transition-colors`}
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono">
                      {index + 1}
                      {index < 4 && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" title="Promotion / CL Spot"></span>}
                      {index >= sortedTeams.length - 3 && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-red-500 inline-block" title="Relegation Zone"></span>}
                    </td>
                    <td className="px-6 py-3 font-medium text-white flex items-center gap-3">
                       <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${team.color}`}>{team.logo}</div>
                       {team.name}
                       {isUser && <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded text-white ml-2">YOU</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">{team.played}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.won}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.drawn}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.lost}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.gf}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.ga}</td>
                    <td className={`px-4 py-3 text-center font-medium ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>{gd > 0 ? '+' : ''}{gd}</td>
                    <td className="px-6 py-3 text-right font-bold text-white">{team.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 uppercase text-xs">
                <th className="px-6 py-3 font-semibold">Rank</th>
                <th className="px-6 py-3 font-semibold">Player</th>
                <th className="px-6 py-3 font-semibold">Club</th>
                <th className="px-4 py-3 font-semibold text-center">Matches</th>
                <th className="px-6 py-3 font-bold text-right text-white">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topScorers.map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-3 text-gray-400 font-mono w-16">
                        {index + 1}
                        {index === 0 && <span className="ml-2">🥇</span>}
                        {index === 1 && <span className="ml-2">🥈</span>}
                        {index === 2 && <span className="ml-2">🥉</span>}
                      </td>
                      <td className="px-6 py-3 font-medium text-white">
                          <div className="flex flex-col">
                              <span>{player.name}</span>
                              <span className="text-[10px] text-gray-500">{player.position} • {player.age} yrs</span>
                          </div>
                      </td>
                      <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                             <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${player.teamColor}`}>{player.teamLogo}</div>
                             <span className="text-gray-300">{player.teamName}</span>
                          </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">{player.matchesPlayed}</td>
                      <td className="px-6 py-3 text-right font-bold text-xl text-green-400">{player.goals}</td>
                  </tr>
              ))}
            </tbody>
          </table>
          {topScorers.length === 0 && (
              <div className="p-8 text-center text-gray-500">No goals scored yet this season.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeagueTable;
