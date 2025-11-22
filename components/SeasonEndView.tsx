
import React, { useMemo } from 'react';
import { Team, LeagueLevel } from '../types';
import { Trophy, ArrowUpCircle, ArrowDownCircle, Briefcase, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SeasonEndViewProps {
  teams: Team[];
  onTransitionSeason: (newTeamId?: string) => void;
  seasonYear: string;
  userTeamId: string;
}

const SeasonEndView: React.FC<SeasonEndViewProps> = ({ teams, onTransitionSeason, seasonYear, userTeamId }) => {
  // Helper to sort teams by points (Actual Table)
  const sortTeamsByPoints = (teamList: Team[]) => {
    return [...teamList].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  };

  // Helper to sort teams by Strength (Expected Table)
  const sortTeamsByStrength = (teamList: Team[]) => {
      return [...teamList].sort((a, b) => {
          const getStr = (t: Team) => t.att + t.mid + t.def;
          return getStr(b) - getStr(a);
      });
  };

  // Dynamically determine active leagues and their hierarchy
  const leagues = Array.from(new Set(teams.map(t => t.league))) as LeagueLevel[];
  const sortedLeagues = leagues.sort((a, b) => {
      const getAvg = (l: LeagueLevel) => {
          const ts = teams.filter(t => t.league === l);
          if (ts.length === 0) return 0;
          return ts.reduce((acc, t) => acc + t.att + t.mid + t.def, 0) / ts.length;
      };
      return getAvg(b) - getAvg(a);
  });

  const tier1League = sortedLeagues[0];
  const tier2League = sortedLeagues[1];

  const tier1Teams = sortTeamsByPoints(teams.filter(t => t.league === tier1League));
  const tier2Teams = sortTeamsByPoints(teams.filter(t => t.league === tier2League));

  const champion = tier1Teams[0];
  const relegated = tier1Teams.slice(-3);
  const promoted = tier2Teams.slice(0, 3);

  const userTeam = teams.find(t => t.id === userTeamId);

  // --- PERFORMANCE & OFFERS LOGIC ---
  const { jobOffers, careerStatus, isFired } = useMemo(() => {
      if (!userTeam) return { jobOffers: [], careerStatus: 'UNKNOWN', isFired: false };

      const userLeague = userTeam.league;
      const leagueTeamsPoints = sortTeamsByPoints(teams.filter(t => t.league === userLeague));
      const leagueTeamsStrength = sortTeamsByStrength(teams.filter(t => t.league === userLeague));

      const actualRank = leagueTeamsPoints.findIndex(t => t.id === userTeamId) + 1;
      const expectedRank = leagueTeamsStrength.findIndex(t => t.id === userTeamId) + 1;
      
      // Performance Diff: Negative is GOOD (Finished 1st, Expected 5th = -4). Positive is BAD.
      const diff = actualRank - expectedRank; 

      const isRelegated = relegated.some(t => t.id === userTeamId);
      
      let status = 'MEETING'; // OVER, MEETING, UNDER
      let fired = false;

      // 1. Determine Status
      if (isRelegated) {
          // If relegated but expected to be Safe (Top 75% of league), that's a sacking offense
          const safeZoneThreshold = Math.floor(leagueTeamsStrength.length * 0.75);
          if (expectedRank <= safeZoneThreshold) {
              fired = true;
              status = 'SACKED';
          } else {
              // Expected to struggle, so maybe not fired, but still relegated
              status = 'RELEGATED';
          }
      } else {
          if (diff <= -3) status = 'OVER';
          else if (diff >= 5) status = 'UNDER';
          else status = 'MEETING';
      }

      // 2. Generate Offers based on Status
      let candidates: Team[] = [];
      const userStrength = (userTeam.att + userTeam.mid + userTeam.def) / 3;

      // Helper to filter valid employers (exclude current team)
      const allOtherTeams = teams.filter(t => t.id !== userTeamId);

      if (status === 'OVER') {
          // Offer: Higher rated teams or Top Tier teams
          candidates = allOtherTeams.filter(t => {
              const tStrength = (t.att + t.mid + t.def) / 3;
              return tStrength >= userStrength; // Better or Equal
          });
          // Prioritize the best teams
          candidates.sort((a, b) => (b.att+b.mid+b.def) - (a.att+a.mid+a.def));
      } else if (status === 'MEETING') {
          // Offer: Similar rated teams
          candidates = allOtherTeams.filter(t => {
              const tStrength = (t.att + t.mid + t.def) / 3;
              return Math.abs(tStrength - userStrength) < 3; 
          });
      } else if (status === 'UNDER' || status === 'RELEGATED') {
          // Offer: Lower rated teams or similar
          candidates = allOtherTeams.filter(t => {
              const tStrength = (t.att + t.mid + t.def) / 3;
              return tStrength <= userStrength && tStrength > userStrength - 8;
          });
      } else if (status === 'SACKED') {
          // Offer: Significantly lower teams, fighting for survival or lower division
          candidates = allOtherTeams.filter(t => {
              const tStrength = (t.att + t.mid + t.def) / 3;
              return tStrength < userStrength - 2;
          });
      }

      // Fallback: If no candidates found (rare), just pick random other teams
      if (candidates.length === 0) {
          candidates = allOtherTeams;
      }

      // Shuffle and pick 3
      const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);

      // Sort offers by prestige (rating)
      const finalOffers = shuffled.sort((a, b) => (b.att+b.mid+b.def) - (a.att+a.mid+a.def));

      return { jobOffers: finalOffers, careerStatus: status, isFired: fired };
  }, [teams, userTeam, userTeamId, relegated]);

  if (!champion) return <div className="text-center text-white p-10">Calculating season results...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">Season {seasonYear} Completed</h1>
        <p className="text-gray-400">A look back at the winners and losers of the campaign.</p>
      </div>

      {/* Champion Card */}
      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-600/50 rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <Trophy className="text-yellow-500 mb-4" size={64} />
        <div className="text-yellow-400 font-bold tracking-widest uppercase mb-2">{tier1League} Champions</div>
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
                <ArrowDownCircle /> Relegated to {tier2League}
            </h3>
            <div className="space-y-3">
                {relegated.map(team => (
                    <div key={team.id} className={`flex items-center justify-between p-4 rounded-lg border ${team.id === userTeamId ? 'bg-red-900/40 border-red-500' : 'bg-gray-900/50 border-gray-700'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${team.color}`}>{team.logo}</div>
                            <span className="font-bold text-white">{team.name}</span>
                            {team.id === userTeamId && <span className="text-[10px] bg-red-600 text-white px-2 rounded-full">YOU</span>}
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
                <ArrowUpCircle /> Promoted to {tier1League}
            </h3>
            <div className="space-y-3">
                {promoted.map(team => (
                    <div key={team.id} className={`flex items-center justify-between p-4 rounded-lg border ${team.id === userTeamId ? 'bg-green-900/40 border-green-500' : 'bg-gray-900/50 border-gray-700'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${team.color}`}>{team.logo}</div>
                            <span className="font-bold text-white">{team.name}</span>
                            {team.id === userTeamId && <span className="text-[10px] bg-blue-600 text-white px-2 rounded-full">YOU</span>}
                        </div>
                        <span className="font-mono text-green-500">{team.points} pts</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* CONTRACT & OFFERS SECTION */}
      <div className="border-t border-gray-700 pt-8 mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
              <Briefcase size={28} /> Managerial Career
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Current Status Card */}
              <div className={`p-6 rounded-xl border-2 shadow-lg flex flex-col h-full relative overflow-hidden ${
                  isFired ? 'bg-red-900/20 border-red-600' : 'bg-gray-800 border-blue-600'
              }`}>
                  <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${isFired ? 'bg-red-600' : 'bg-blue-600'}`}>
                      {isFired ? 'TERMINATION' : 'CURRENT CONTRACT'}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${userTeam?.color}`}>{userTeam?.logo}</div>
                      <div>
                          <h3 className="text-xl font-bold text-white">{userTeam?.name}</h3>
                          <p className={`${isFired ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                              {isFired ? 'Board Confidence: Critical' : 'Board Confidence: Stable'}
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex-1 text-gray-300 text-sm mb-6 leading-relaxed">
                      {isFired ? (
                          <div className="space-y-2">
                              <p><strong>Statement from the Board:</strong></p>
                              <p className="italic">"Given the significant resources invested and the disappointing relegation this season, we feel a change in leadership is necessary. Your contract has been terminated with immediate effect."</p>
                          </div>
                      ) : careerStatus === 'OVER' ? (
                          "You've exceeded all expectations this season! The fans adore you, and the board is offering a lucrative contract extension. However, your success has attracted attention from bigger clubs."
                      ) : careerStatus === 'UNDER' ? (
                          "It was a tough season. We barely met our minimum targets. The board is willing to give you one more chance, but performance must improve next season."
                      ) : (
                          "A solid season meeting our objectives. We are happy to offer you a contract extension to continue building this project."
                      )}
                  </div>

                  {isFired ? (
                      <div className="bg-red-900/50 text-red-200 px-4 py-3 rounded border border-red-700 flex items-center gap-2 font-bold justify-center">
                          <XCircle /> You have been Sacked.
                      </div>
                  ) : (
                      <button 
                            onClick={() => onTransitionSeason()}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <CheckCircle size={20} />
                            Stay at {userTeam?.name}
                      </button>
                  )}
              </div>

              {/* Job Offers */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                       <div className="text-gray-400 text-sm uppercase font-bold tracking-wider">
                           {jobOffers.length > 0 ? 'Job Offers Available' : 'No Other Offers'}
                       </div>
                       {careerStatus === 'OVER' && <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded border border-green-800">In High Demand</span>}
                       {(careerStatus === 'UNDER' || isFired) && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded border border-yellow-800">Reputation Damaged</span>}
                  </div>

                  {jobOffers.length === 0 ? (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center text-gray-500 italic">
                          No other clubs are currently interested in your services.
                      </div>
                  ) : (
                      jobOffers.map(offer => {
                          // Helper to show if this is an upgrade or downgrade
                          const userStr = (userTeam!.att + userTeam!.mid + userTeam!.def);
                          const offerStr = (offer.att + offer.mid + offer.def);
                          const isUpgrade = offerStr > userStr + 5;
                          const isDowngrade = offerStr < userStr - 5;

                          return (
                            <div key={offer.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-green-500 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm ${offer.color}`}>{offer.logo}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white group-hover:text-green-400 transition-colors">{offer.name}</span>
                                            {isUpgrade && <ArrowUpCircle size={14} className="text-green-500" />}
                                            {isDowngrade && <ArrowDownCircle size={14} className="text-red-500" />}
                                        </div>
                                        <div className="text-xs text-gray-400 flex gap-2 mt-1">
                                            <span className="bg-gray-700 px-1.5 rounded">ATT {offer.att}</span>
                                            <span className="bg-gray-700 px-1.5 rounded">MID {offer.mid}</span>
                                            <span className="bg-gray-700 px-1.5 rounded">DEF {offer.def}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onTransitionSeason(offer.id)}
                                    className="bg-gray-700 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                                >
                                    Accept Offer
                                </button>
                            </div>
                          );
                      })
                  )}
              </div>
          </div>
      </div>

    </div>
  );
};

export default SeasonEndView;
