
import React, { useEffect, useState } from 'react';
import { Team, Match } from '../types';
import { PlayCircle, TrendingUp, Activity, Users, MapPin, Trophy } from 'lucide-react';
import { getPreMatchAnalysis } from '../services/geminiService';

interface DashboardProps {
  userTeam: Team;
  rank: number;
  nextMatch: Match | null;
  opponent: Team | null;
  isHome: boolean;
  onPlayMatch: () => void;
  isSeasonEnded: boolean;
  onViewSeasonEnd: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userTeam, rank, nextMatch, opponent, isHome, onPlayMatch, isSeasonEnded, onViewSeasonEnd }) => {
  const [analysis, setAnalysis] = useState<string>('Loading assistant report...');

  useEffect(() => {
    if (userTeam && opponent) {
      // Simple caching to prevent API spam
      const key = `analysis-${userTeam.id}-${opponent.id}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        setAnalysis(cached);
      } else {
        getPreMatchAnalysis(userTeam, opponent).then(text => {
          setAnalysis(text);
          localStorage.setItem(key, text);
        });
      }
    } else if (isSeasonEnded) {
        setAnalysis("The season has concluded. The board is reviewing the results.");
    } else {
        setAnalysis("No upcoming match scheduled.");
    }
  }, [userTeam, opponent, isSeasonEnded]);

  const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <div className="text-gray-400 text-sm mb-1">League Position</div>
           <div className="text-3xl font-bold text-white">{getOrdinal(rank)}</div>
           <div className="text-xs text-green-400 flex items-center mt-2"><TrendingUp size={12} className="mr-1"/> Season Target: Top 4</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <div className="text-gray-400 text-sm mb-1">Team Morale</div>
           <div className="text-3xl font-bold text-white">High</div>
           <div className="text-xs text-blue-400 flex items-center mt-2"><Activity size={12} className="mr-1"/> Players are happy</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <div className="text-gray-400 text-sm mb-1">Next Opponent</div>
           <div className="text-xl font-bold text-white truncate">{opponent?.name || (isSeasonEnded ? 'Season Ended' : 'None')}</div>
           <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
               <MapPin size={10}/> {isSeasonEnded ? '-' : (isHome ? 'Home' : 'Away')}
           </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <div className="text-gray-400 text-sm mb-1">Board Trust</div>
           <div className="text-3xl font-bold text-green-500">A-</div>
           <div className="text-xs text-gray-400 mt-2">Secure job</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Match Card or Season End Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                {isSeasonEnded ? <Trophy size={200} /> : <PlayCircle size={200} />}
            </div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                {isSeasonEnded ? 'Season Status' : 'Next Fixture'}
            </h2>

            {isSeasonEnded ? (
                 <div className="text-center py-8 relative z-10">
                    <h3 className="text-3xl font-bold text-white mb-2">Season Completed</h3>
                    <p className="text-gray-400 mb-8">All matches have been played. It's time to review the season outcomes.</p>
                    <button 
                        onClick={onViewSeasonEnd}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-full font-bold text-lg shadow-lg shadow-blue-900/50 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        <Trophy size={24} />
                        VIEW SEASON SUMMARY
                    </button>
                 </div>
            ) : opponent ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    {/* Display Home Team on Left, Away on Right */}
                    <div className="text-center flex-1">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl shadow-lg ${(isHome ? userTeam : opponent).color} border-4 border-gray-700 mb-4`}>
                            {(isHome ? userTeam : opponent).logo}
                        </div>
                        <h3 className="text-2xl font-bold">{(isHome ? userTeam : opponent).name}</h3>
                        <div className="flex justify-center gap-2 mt-2">
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">ATT {(isHome ? userTeam : opponent).att}</span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">DEF {(isHome ? userTeam : opponent).def}</span>
                        </div>
                    </div>

                    <div className="text-center px-4">
                        <div className="text-sm font-mono text-gray-400 mb-2">WEEK {nextMatch?.week}</div>
                        <div className="text-4xl font-bold text-gray-600 my-2">VS</div>
                        <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded inline-block">
                            {isHome ? 'Home Game' : 'Away Game'}
                        </div>
                    </div>

                    <div className="text-center flex-1">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl shadow-lg ${(isHome ? opponent : userTeam).color} border-4 border-gray-700 mb-4`}>
                            {(isHome ? opponent : userTeam).logo}
                        </div>
                        <h3 className="text-2xl font-bold">{(isHome ? opponent : userTeam).name}</h3>
                        <div className="flex justify-center gap-2 mt-2">
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">ATT {(isHome ? opponent : userTeam).att}</span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">DEF {(isHome ? opponent : userTeam).def}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">No matches scheduled</div>
            )}
            
            {opponent && !isSeasonEnded && (
                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={onPlayMatch}
                        className="bg-green-600 hover:bg-green-500 text-white px-12 py-4 rounded-full font-bold text-lg shadow-lg shadow-green-900/50 transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                        <PlayCircle size={24} />
                        GO TO MATCH
                    </button>
                </div>
            )}
        </div>

        {/* Assistant Report */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-blue-400" size={20} />
                Assistant Manager Report
            </h2>
            <div className="flex-1 bg-gray-900/50 rounded-lg p-4 text-gray-300 text-sm leading-relaxed border border-gray-700/50 italic">
                "{analysis}"
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs font-medium">Adjust Tactics</button>
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-xs font-medium">Team Talk</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
