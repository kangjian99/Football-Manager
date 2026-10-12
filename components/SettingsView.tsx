
import React, { useState } from 'react';
import { Trash2, ShieldCheck, Info, Volume2, VolumeX, Users, FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
import { Team } from '../types';
import { RosterImporterModal } from './RosterImporterModal';

interface SettingsViewProps {
  onClearApiKey: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  teams?: Team[];
  onApplyRoster?: (updatedTeams: Team[]) => void;
  onResetToDefaults?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  onClearApiKey, 
  soundEnabled, 
  onToggleSound,
  teams = [],
  onApplyRoster,
  onResetToDefaults
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Export current squad data as CSV
  const handleExportAllTeams = () => {
    let csv = '\uFEFF球队,联赛,姓名,位置,评分,年龄,进球,助攻,出场\n';
    teams.forEach(t => {
      t.players.forEach(p => {
        csv += `"${t.name}","${t.league}","${p.name}","${p.position}",${p.rating},${p.age},${p.goals},${p.assists},${p.matchesPlayed}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `football_manager_rosters_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Manage your application preferences and squad database.</p>
      </div>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-8">

        {/* SQUAD & ROSTER SECTION */}
        {onApplyRoster && onResetToDefaults && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-900/30 p-3 rounded-full text-blue-400">
                <Users size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Squad & Roster Database</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  Import updated player rosters from spreadsheets (.xlsx, .xls, .csv, .json) or paste data directly from Excel / WPS.
                  Changes are stored locally in your browser.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md shadow-blue-900/20"
                  >
                    <FileSpreadsheet size={16} />
                    导入 / 更新名单
                  </button>
                  <button
                    onClick={handleExportAllTeams}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={16} />
                    导出全部球员名单 (CSV)
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('确定要恢复所有球队的预设默认名单吗？已导入的自定义数据将被清除。')) {
                        onResetToDefaults();
                      }
                    }}
                    className="flex items-center gap-2 bg-gray-900/60 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw size={15} />
                    重置为初始名单
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* API KEY SECTION */}
        <div className="pt-6 border-t border-gray-700 flex items-start gap-4">
            <div className="bg-blue-900/30 p-3 rounded-full text-blue-400">
                <ShieldCheck size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Data & Privacy</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    Your Google Gemini API Key is stored locally in your browser's storage (LocalStorage). 
                    This application does not collect any personal data or send your key to any external servers other than Google's generative AI endpoints directly.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900/50 p-3 rounded border border-gray-700">
                    <Info size={14} />
                    <span>If you wish to use a different key or reset your access, you can clear it below.</span>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-gray-700 flex justify-between items-center">
          <div>
            <div className="font-medium text-red-400">Clear API Key</div>
            <div className="text-xs text-gray-500">This will sign you out and return you to the startup screen.</div>
          </div>
          
          <button 
            onClick={onClearApiKey}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg transition-colors font-medium shadow-lg shadow-red-900/20"
          >
            <Trash2 size={18} />
            Clear Key
          </button>
        </div>
        
        {/* AUDIO SECTION */}
        <div className="pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${soundEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </div>
                    <div>
                         <h3 className="text-lg font-bold text-white">Sound Effects</h3>
                         <p className="text-gray-400 text-sm">Enable match day sounds (whistles, crowd, goals).</p>
                    </div>
                </div>
                
                <button 
                    onClick={onToggleSound}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${
                        soundEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-300 ${
                        soundEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`} />
                </button>
            </div>
        </div>
      </div>

      {onApplyRoster && onResetToDefaults && (
        <RosterImporterModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          teams={teams}
          onApplyRoster={onApplyRoster}
          onResetToDefaults={onResetToDefaults}
        />
      )}
    </div>
  );
};

export default SettingsView;
