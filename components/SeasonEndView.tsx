
import React from 'react';
import { Team, LeagueLevel } from '../types';
import { Trophy, ArrowUpCircle, ArrowDownCircle, PlayCircle } from 'lucide-react';

interface SeasonEndViewProps {
  teams: Team[];
  onStartNewSeason: () => void;
  seasonYear: string;
}

const SeasonEndView: React.FC<SeasonEndViewProps> = ({ teams, onStartNewSeason, seasonYear }) => {
  // Helper to sort teams
  const sortTeams = (teamList: Team[]) => {
    return [...teamList].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  };

  const serieA = sortTeams(teams.filter(t => t.league === LeagueLevel.SERIE_A));
  const serieB = sortTeams(teams.filter(t => t.league === LeagueLevel.SERIE_B));

  const champion = serieA[0];
  const relegated = serieA.slice(-3);
  const promoted = serieB.slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">Season {seasonYear} Completed</h1>
        <p className="text-gray-400">A look back at the winners and losers of the campaign.</p>
      </div>

      {/* Champion Card */}
      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-600/50 rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <Trophy className="text-yellow-500 mb-4" size={64} />
        <div className="text-yellow-400 font-bold tracking-widest uppercase mb-2">Serie A Champions</div>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(234,179,8,0.4)] ${champion.color} border-4 border-yellow-500 mb-4`}>
            {champion.logo}
        </div>
        <h2 className="text-5xl font-bold text-white">{champion.name}</h2>
        <div className="mt-4 text-xl text-gray-300 font-mono">{champion.points} Points</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Relegation Zone */}
        <div className="bg-gray-800 rounded-xl border border-red-900/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <ArrowDownCircle size={100} />
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <ArrowDownCircle /> Relegated to Serie B
            </h3>
            <div className="space-y-3">
                {relegated.map(team => (
                    <div key={team.id} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${team.color}`}>{team.logo}</div>
                            <span className="font-bold text-white">{team.name}</span>
                        </div>
                        <span className="font-mono text-red-500">{team.points} pts</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Promotion Zone */}
        <div className="bg-gray-800 rounded-xl border border-green-900/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <ArrowUpCircle size={100} />
            </div>
            <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
                <ArrowUpCircle /> Promoted to Serie A
            </h3>
            <div className="space-y-3">
                {promoted.map(team => (
                    <div key={team.id} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${team.color}`}>{team.logo}</div>
                            <span className="font-bold text-white">{team.name}</span>
                        </div>
                        <span className="font-mono text-green-500">{team.points} pts</span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <button 
            onClick={onStartNewSeason}
            className="group bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-full font-bold text-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105 flex items-center gap-3"
        >
            <PlayCircle size={32} className="group-hover:rotate-90 transition-transform duration-500" />
            Start Next Season
        </button>
      </div>
    </div>
  );
};

export default SeasonEndView;
