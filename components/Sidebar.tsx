
import React from 'react';
import { LayoutDashboard, Users, Trophy, Calendar, Settings, Shield, List, Flag, X } from 'lucide-react';
import { ViewState, Team } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  userTeam: Team;
  disabled?: boolean;
  isSeasonEnded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, userTeam, disabled = false, isSeasonEnded = false, isOpen = false, onClose }) => {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'SQUAD', label: 'Squad & Tactics', icon: Users },
    { id: 'LEAGUE', label: 'League Table', icon: Trophy },
    { id: 'FIXTURES', label: 'Fixtures & Results', icon: List },
    { 
        id: isSeasonEnded ? 'SEASON_END' : 'MATCH', 
        label: isSeasonEnded ? 'Season Summary' : 'Next Match', 
        icon: isSeasonEnded ? Flag : Calendar 
    },
    { id: 'TACTICS', label: 'Training', icon: Shield },
  ];

  const handleSetView = (id: ViewState) => {
      setView(id);
      if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
            onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
            bg-gray-800 h-screen flex flex-col border-r border-gray-700
            fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:shadow-none
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${userTeam.color}`}>
                {userTeam.logo}
            </div>
            <div>
                <h1 className="font-bold text-white leading-tight">{userTeam.name}</h1>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{userTeam.league}</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => handleSetView(item.id as ViewState)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active 
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400' 
                    : disabled 
                        ? 'text-gray-600 cursor-not-allowed' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-700">
          <button 
              disabled={disabled} 
              onClick={() => handleSetView('SETTINGS')}
              className={`w-full flex items-center gap-3 px-6 py-4 text-sm transition-colors ${
                  currentView === 'SETTINGS'
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400' 
                    : disabled 
                        ? 'text-gray-600 cursor-not-allowed' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
              <Settings size={18} />
              Settings
          </button>
          <div className="px-6 py-4 text-xs text-gray-400 border-t border-gray-700">
              <p>Developed by</p>
              <a href="mailto:sonic2112@gmail.com" className="hover:text-white transition-colors">sonic2112@gmail.com</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
