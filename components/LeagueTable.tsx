import React from 'react';
import { Team } from '../types';

interface LeagueTableProps {
  teams: Team[];
  userTeamId: string;
}

const LeagueTable: React.FC<LeagueTableProps> = ({ teams, userTeamId }) => {
  // Sort teams: Points > GD > GF
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-850">
        <h2 className="text-lg font-bold text-white">League Standings</h2>
      </div>
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
                    {index < 4 && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>}
                    {index >= sortedTeams.length - 3 && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>}
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
    </div>
  );
};

export default LeagueTable;
