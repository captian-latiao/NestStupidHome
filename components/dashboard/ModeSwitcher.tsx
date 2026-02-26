import React from 'react';
import { HomeMode } from '../../types';
import { Sun, Moon, Briefcase } from 'lucide-react';

interface ModeSwitcherProps {
  currentMode: HomeMode;
  onModeChange: (mode: HomeMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ currentMode, onModeChange }) => {
  const modes = [
    { id: HomeMode.HOME, label: '在家', icon: Sun },
    { id: HomeMode.AWAY, label: '离家', icon: Briefcase },
    { id: HomeMode.SLEEP, label: '睡眠', icon: Moon },
  ];

  return (
    <div className="flex w-full bg-white/60 p-1.5 rounded-full border border-wood-100/50 shadow-inner-wood">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all duration-300
              ${isActive 
                ? 'bg-wood-800 text-wood-50 shadow-md' 
                : 'text-wood-600 hover:bg-wood-50'
              }
            `}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-wood-50' : 'text-wood-500'} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};