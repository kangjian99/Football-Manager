
import React from 'react';
import { Trash2, ShieldCheck, Info, Volume2, VolumeX } from 'lucide-react';

interface SettingsViewProps {
  onClearApiKey: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClearApiKey, soundEnabled, onToggleSound }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Manage your application preferences.</p>
      </div>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-8">
        
        {/* API KEY SECTION */}
        <div className="flex items-start gap-4">
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
    </div>
  );
};

export default SettingsView;
