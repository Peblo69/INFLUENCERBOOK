import React, { useState } from 'react';
import { ViewMode } from '../types';

interface LoginProps {
  setView: (view: ViewMode) => void;
}

export const Login: React.FC<LoginProps> = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend, simple redirect
    setTimeout(() => {
      setView('interface');
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center animate-fade-in px-4">
      <div className="w-full max-w-md border border-white/10 p-8 md:p-12 relative">
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white"></div>

        <h2 className="text-2xl font-bold tracking-widest mb-8 text-center uppercase">Identity Verify</h2>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs tracking-[0.2em] text-gray-500 uppercase block">User ID</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:outline-none focus:border-white transition-colors text-sm font-mono"
              placeholder="user@void.net"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs tracking-[0.2em] text-gray-500 uppercase block">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:outline-none focus:border-white transition-colors text-sm font-mono"
              placeholder="••••••••••••"
            />
          </div>

          <div className="pt-8">
            <button 
              type="submit"
              className="w-full bg-white/5 border border-white/20 text-white py-3 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300"
            >
              Authenticate
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-700 cursor-not-allowed">FORGOT PASSWORD? // CONTACT ADMIN</p>
        </div>
      </div>
    </div>
  );
};