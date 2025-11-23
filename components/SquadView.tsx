
import React from 'react';
import { Team } from '../types';
import { Shield, Zap, Target, User, Cross } from 'lucide-react';

interface SquadViewProps {
  team: Team;
}

const SquadView: React.FC<SquadViewProps> = ({ team }) => {
  // Sort players: GK -> DEF -> MID -> FWD, then by Rating descending
  const sortedPlayers = [...team.players].sort((a, b) => {
    const posOrder = { 'GK': 0, 'DEF': 1, 'MID': 2, 'FWD': 3 };
    const posDiff = posOrder[a.position] - posOrder[b.position];
    if (posDiff !== 0) return posDiff;
    return b.rating - a.rating;
  });

  const getPosColor = (pos: string) => {
    switch(pos) {
      case 'GK': return 'bg-yellow-600 text-black';
      case 'DEF': return 'bg-blue-600 text-white';
      case 'MID': return 'bg-green-600 text-white';
      case 'FWD': return 'bg-red-600 text-white';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg ${team.color}`}>{team.logo}</div>
                <div>
                    <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                    <p className="text-gray-400 text-sm">Squad Depth: {team.players.length} Players</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">ATT</div>
                    <div className="text-xl font-bold text-white">{team.att}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">MID</div>
                    <div className="text-xl font-bold text-white">{team.mid}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">DEF</div>
                    <div className="text-xl font-bold text-white">{team.def}</div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Roster List */}
            <div className="lg:col-span-2">
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-850 border-b border-gray-700 text-gray-400 text-xs uppercase sticky top-0 bg-gray-900 z-10">
                                <th className="px-4 py-3 text-left w-16">Pos</th>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-center w-12" title="Appearances">MP</th>
                                <th className="px-4 py-3 text-center w-12" title="Goals">G</th>
                                <th className="px-4 py-3 text-center w-12" title="Assists">A</th>
                                <th className="px-4 py-3 text-center w-12" title="Yellow Cards">YC</th>
                                <th className="px-4 py-3 text-center w-12" title="Red Cards">RC</th>
                                <th className="px-4 py-3 text-center w-12" title="Injury Status">Inj</th>
                                <th className="px-4 py-3 text-center w-12">Age</th>
                                <th className="px-4 py-3 text-center w-16">OVR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sortedPlayers.map(player => (
                                <tr key={player.id} className="hover:bg-gray-800 transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <span className={`
                                            px-2 py-1 rounded text-[10px] font-bold w-10 block text-center
                                            ${getPosColor(player.position)}
                                        `}>
                                            {player.position}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-gray-200 group-hover:text-white">
                                        {player.name}
                                        {player.id.includes('REAL') && <span className="ml-2 text-[10px] text-blue-400 border border-blue-900 px-1 rounded">Star</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-gray-400">{player.matchesPlayed}</td>
                                    <td className={`px-4 py-2.5 text-center font-bold ${player.goals > 0 ? 'text-green-400' : 'text-gray-600'}`}>{player.goals}</td>
                                    <td className="px-4 py-2.5 text-center text-gray-500">{player.assists}</td>
                                    <td className={`px-4 py-2.5 text-center ${player.yellowCards > 0 ? 'text-yellow-500' : 'text-gray-600'}`}>{player.yellowCards}</td>
                                    <td className={`px-4 py-2.5 text-center ${player.redCards > 0 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>{player.redCards}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        {player.injury > 0 ? (
                                            <div className="flex justify-center items-center text-red-500 font-bold" title={`${player.injury} weeks injured`}>
                                                <Cross size={14} className="mr-1" /> {player.injury}w
                                            </div>
                                        ) : (
                                            <span className="text-gray-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-gray-500">{player.age}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <div className={`font-bold inline-block w-8 text-center rounded ${
                                            player.rating >= 85 ? 'bg-green-900/50 text-green-400' : 
                                            player.rating >= 80 ? 'bg-blue-900/50 text-blue-400' : 
                                            player.rating >= 70 ? 'bg-gray-700/50 text-gray-300' : 'text-gray-500'
                                        }`}>
                                            {player.rating}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats & Tactics Side Panel */}
            <div className="space-y-6">
                 <div className="bg-gray-900 p-5 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
                        <User size={16} className="text-blue-500"/> Key Player
                    </h3>
                    {sortedPlayers[0] && (
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border-2 border-blue-500">
                                <span className="text-2xl font-bold text-blue-500">{sortedPlayers[0].rating}</span>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white leading-tight">{sortedPlayers[0].name}</div>
                                <div className="text-sm text-gray-400">{sortedPlayers[0].position}</div>
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="bg-gray-900 p-5 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
                        <Shield size={16} className="text-green-500"/> Formation
                    </h3>
                    <div className="relative aspect-[2/3] bg-green-800/20 rounded border border-green-800/50 mx-auto w-32">
                         {/* Simple visual dots for 4-3-3 */}
                         <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow"></div>
                         <div className="absolute top-[20%] left-[20%] w-3 h-3 bg-red-500 rounded-full shadow"></div>
                         <div className="absolute top-[20%] right-[20%] w-3 h-3 bg-red-500 rounded-full shadow"></div>

                         <div className="absolute top-[45%] left-[30%] w-3 h-3 bg-green-500 rounded-full shadow"></div>
                         <div className="absolute top-[45%] right-[30%] w-3 h-3 bg-green-500 rounded-full shadow"></div>
                         <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full shadow"></div>

                         <div className="absolute bottom-[25%] left-[15%] w-3 h-3 bg-blue-500 rounded-full shadow"></div>
                         <div className="absolute bottom-[25%] right-[15%] w-3 h-3 bg-blue-500 rounded-full shadow"></div>
                         <div className="absolute bottom-[25%] left-[35%] w-3 h-3 bg-blue-500 rounded-full shadow"></div>
                         <div className="absolute bottom-[25%] right-[35%] w-3 h-3 bg-blue-500 rounded-full shadow"></div>

                         <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow"></div>
                    </div>
                    <div className="text-center mt-2 text-sm text-gray-400">4-3-3 Attack</div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SquadView;