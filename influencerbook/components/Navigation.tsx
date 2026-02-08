import React from 'react';
import { ViewMode } from '../types';

interface NavigationProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const navItems: { label: string; value: ViewMode }[] = [
    { label: '// HOME', value: 'landing' },
    { label: '// INTERFACE', value: 'interface' },
    { label: '// LOGIN', value: 'login' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-difference">
      <div 
        className="text-white text-sm font-bold tracking-widest cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => setView('landing')}
      >
        THE AI INFLUENCERBOOK <span className="text-[10px] text-gray-500 ml-2">v0.9.1</span>
      </div>
      <div className="flex gap-8">
        {navItems.map((item) => (
          <button
            key={item.value}
            onClick={() => setView(item.value)}
            className={`text-xs tracking-widest transition-all duration-300 ${
              currentView === item.value 
                ? 'text-white opacity-100 border-b border-white pb-1' 
                : 'text-gray-500 opacity-60 hover:opacity-100 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};