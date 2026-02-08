import React, { useState } from 'react';
import { 
  User, CreditCard, Bell, Lock, Shield, Zap, 
  Check, Copy, ExternalLink, ChevronRight, Mail, 
  Smartphone, Eye, EyeOff, Key
} from 'lucide-react';

type SettingsTab = 'general' | 'billing' | 'notifications' | 'api' | 'security';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-black overflow-hidden animate-fade-in-up">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <div className="w-64 border-r border-white/5 bg-zinc-950/50 p-6 flex flex-col gap-1">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 font-display">Configuration</h2>
        
        <SettingsNavBtn 
          active={activeTab === 'general'} 
          onClick={() => setActiveTab('general')} 
          icon={<User size={18} />} 
          label="Account" 
        />
        <SettingsNavBtn 
          active={activeTab === 'billing'} 
          onClick={() => setActiveTab('billing')} 
          icon={<CreditCard size={18} />} 
          label="Billing & Plans" 
        />
        <SettingsNavBtn 
          active={activeTab === 'notifications'} 
          onClick={() => setActiveTab('notifications')} 
          icon={<Bell size={18} />} 
          label="Notifications" 
        />
        <SettingsNavBtn 
          active={activeTab === 'api'} 
          onClick={() => setActiveTab('api')} 
          icon={<Key size={18} />} 
          label="API Keys" 
        />
        <SettingsNavBtn 
          active={activeTab === 'security'} 
          onClick={() => setActiveTab('security')} 
          icon={<Shield size={18} />} 
          label="Security" 
        />
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-8 md:p-12">
        <div className="max-w-3xl mx-auto space-y-12">
          
          {/* --- GENERAL TAB --- */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h1 className="text-3xl font-display font-bold text-white mb-2">Account Settings</h1>
                <p className="text-zinc-500">Manage your personal information and profile appearance.</p>
              </div>

              {/* Avatar Section */}
              <div className="flex items-center gap-6 p-6 rounded-2xl border border-white/5 bg-zinc-900/30">
                <div className="w-20 h-20 rounded-full bg-gradient-brand p-[2px]">
                   <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                     <img src="https://picsum.photos/seed/user_avatar/200/200" alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                </div>
                <div>
                   <h3 className="text-white font-bold mb-1">Profile Picture</h3>
                   <div className="flex gap-3">
                      <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">Change</button>
                      <button className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors">Remove</button>
                   </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <InputField label="Display Name" defaultValue="Kiara Artist" />
                 <InputField label="Username" defaultValue="@kiara_vision" />
                 <InputField label="Email Address" defaultValue="artist@kiaravision.ai" type="email" />
                 <InputField label="Website" defaultValue="https://kiara.art/portfolio" />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bio</label>
                 <textarea 
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all resize-none h-32"
                    defaultValue="Digital artist exploring the boundaries of AI generation. Creating daily."
                 />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                 <button className="bg-gradient-brand hover:bg-gradient-brand-hover text-black px-6 py-2.5 rounded-lg font-bold text-sm shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:scale-105 transition-all">
                    Save Changes
                 </button>
              </div>
            </div>
          )}

          {/* --- BILLING TAB --- */}
          {activeTab === 'billing' && (
            <div className="space-y-8 animate-fade-in-up">
               <div>
                <h1 className="text-3xl font-display font-bold text-white mb-2">Billing & Usage</h1>
                <p className="text-zinc-500">Manage your subscription and credit usage.</p>
              </div>

              {/* Current Plan Card */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-8 group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
                 
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-white font-display">Pro Plan</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-brand text-black uppercase tracking-wide">Active</span>
                       </div>
                       <p className="text-zinc-400 text-sm mb-4">Renews on Oct 24, 2025</p>
                       <div className="text-3xl font-mono text-white">$29<span className="text-lg text-zinc-500 font-sans">/mo</span></div>
                    </div>
                    <div className="flex flex-col gap-3">
                       <button className="px-6 py-2.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors">Manage Subscription</button>
                       <button className="px-6 py-2.5 border border-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/5 transition-colors">Upgrade to Enterprise</button>
                    </div>
                 </div>
              </div>

              {/* Usage Stats */}
              <div className="space-y-6">
                 <h4 className="text-lg font-bold text-white font-display">Monthly Usage</h4>
                 
                 {/* Generation Credits */}
                 <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-zinc-300 font-medium">Generation Credits</span>
                       <span className="text-white font-mono">2,450 / 5,000</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full w-[49%] bg-gradient-brand rounded-full shadow-[0_0_10px_rgba(192,132,252,0.5)]"></div>
                    </div>
                 </div>

                 {/* Storage */}
                 <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-zinc-300 font-medium">Cloud Storage</span>
                       <span className="text-white font-mono">12.5 GB / 50 GB</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full w-[25%] bg-zinc-600 rounded-full"></div>
                    </div>
                 </div>
              </div>

              {/* Payment Methods */}
              <div className="pt-8 border-t border-white/5">
                 <h4 className="text-lg font-bold text-white font-display mb-4">Payment Method</h4>
                 <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-zinc-900/30">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center border border-white/5">
                          <span className="font-bold text-white text-xs italic">VISA</span>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white">Visa ending in 4242</p>
                          <p className="text-xs text-zinc-500">Expires 12/28</p>
                       </div>
                    </div>
                    <button className="text-zinc-400 hover:text-white transition-colors">Edit</button>
                 </div>
              </div>
            </div>
          )}

          {/* --- NOTIFICATIONS TAB --- */}
          {activeTab === 'notifications' && (
             <div className="space-y-8 animate-fade-in-up">
                <div>
                   <h1 className="text-3xl font-display font-bold text-white mb-2">Notifications</h1>
                   <p className="text-zinc-500">Choose what we get in touch about.</p>
                </div>

                <div className="space-y-6">
                   <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/20 space-y-6">
                      <h3 className="text-white font-bold flex items-center gap-2">
                         <Mail size={18} className="text-purple-400" /> Email Notifications
                      </h3>
                      <ToggleRow label="Product Updates" desc="New features and improvements to Kiara Vision." defaultChecked />
                      <ToggleRow label="Generation Complete" desc="Get notified when large batch jobs finish." defaultChecked />
                      <ToggleRow label="Marketing & Offers" desc="Tips, tricks, and special promotions." />
                   </div>

                   <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/20 space-y-6">
                      <h3 className="text-white font-bold flex items-center gap-2">
                         <Smartphone size={18} className="text-pink-400" /> Push Notifications
                      </h3>
                      <ToggleRow label="Comments & Likes" desc="When someone interacts with your creations." defaultChecked />
                      <ToggleRow label="New Followers" desc="When a user follows your profile." defaultChecked />
                   </div>
                </div>
             </div>
          )}

          {/* --- API TAB --- */}
          {activeTab === 'api' && (
             <div className="space-y-8 animate-fade-in-up">
                <div>
                   <h1 className="text-3xl font-display font-bold text-white mb-2">API Access</h1>
                   <p className="text-zinc-500">Manage API keys for external integrations.</p>
                </div>

                <div className="p-6 border border-yellow-500/20 bg-yellow-500/5 rounded-xl flex gap-4">
                   <Lock size={24} className="text-yellow-500 flex-shrink-0" />
                   <div>
                      <h4 className="text-yellow-500 font-bold mb-1">Security Warning</h4>
                      <p className="text-sm text-yellow-500/80 leading-relaxed">
                         Your API key provides full access to your account credits. Never share it or commit it to public repositories.
                      </p>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active API Key</label>
                   <div className="flex gap-2">
                      <div className="flex-1 bg-zinc-900 border border-white/10 rounded-lg flex items-center px-4 relative">
                         <code className="text-zinc-300 font-mono text-sm truncate">
                            {apiKeyVisible ? 'sk-kiara-8923-x928-1923-m293-p992' : 'sk-kiara-••••-••••-••••-••••'}
                         </code>
                         <button 
                           onClick={() => setApiKeyVisible(!apiKeyVisible)}
                           className="absolute right-3 text-zinc-500 hover:text-white"
                        >
                            {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                         </button>
                      </div>
                      <button className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center gap-2 transition-colors">
                         <Copy size={16} />
                      </button>
                   </div>
                   <p className="text-xs text-zinc-500">Created on Oct 12, 2024</p>
                </div>

                <div className="pt-6 border-t border-white/5">
                   <button className="flex items-center gap-2 text-sm font-bold text-white hover:text-purple-300 transition-colors group">
                      Read API Documentation <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const SettingsNavBtn = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
   <button 
     onClick={onClick}
     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        active 
        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
        : 'text-zinc-400 hover:text-white hover:bg-white/5'
     }`}
   >
      {icon}
      {label}
      {active && <ChevronRight size={14} className="ml-auto" />}
   </button>
);

const InputField = ({ label, defaultValue, type = "text" }: { label: string, defaultValue: string, type?: string }) => (
   <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
      <input 
         type={type}
         defaultValue={defaultValue}
         className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all"
      />
   </div>
);

const ToggleRow = ({ label, desc, defaultChecked }: { label: string, desc: string, defaultChecked?: boolean }) => {
   const [checked, setChecked] = useState(defaultChecked || false);
   return (
      <div className="flex items-center justify-between">
         <div>
            <h4 className="text-sm font-bold text-white">{label}</h4>
            <p className="text-xs text-zinc-500">{desc}</p>
         </div>
         <button 
            onClick={() => setChecked(!checked)}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-gradient-brand' : 'bg-zinc-800'}`}
         >
            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
         </button>
      </div>
   )
}