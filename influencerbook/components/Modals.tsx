
import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- SHARED WRAPPER ---
const ModalWrapper: React.FC<ModalProps & { children: React.ReactNode, title: string, maxWidth?: string }> = ({ 
    isOpen, onClose, children, title, maxWidth = "max-w-4xl" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]" 
        onClick={onClose}
      ></div>

      {/* Content */}
      <div className={`relative w-full ${maxWidth} bg-[#080808] ring-1 ring-white/10 shadow-2xl rounded-[32px] overflow-hidden animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)]`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-20 pointer-events-none">
            <h2 className="text-xl font-bold tracking-tight text-white pointer-events-auto">{title}</h2>
            <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Body */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            {children}
        </div>
      </div>
    </div>
  );
};

// --- UPGRADE MODAL ---
export const UpgradeModal: React.FC<ModalProps> = (props) => {
    return (
        <ModalWrapper {...props} title="Upgrade Plan" maxWidth="max-w-6xl">
            <div className="p-8 md:p-16 bg-[#080808] min-h-[600px] flex flex-col justify-center">
                <div className="text-center mb-16 mt-8">
                    <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Unlock Full Potential</h3>
                    <p className="text-gray-400 text-lg">Choose the intelligence level that fits your ambition.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {/* FREE TIER */}
                    <PricingCard 
                        tier="Free Plan" 
                        price="$0" 
                        period="forever"
                        desc="Essential access for beginners."
                        features={[
                            "Standard Speed",
                            "Basic Text Generation",
                            "Limited Daily Prompts",
                            "Community Support"
                        ]}
                    />

                    {/* PLUS TIER */}
                    <PricingCard 
                        tier="Plus Plan" 
                        price="$9.99" 
                        period="per month"
                        desc="For creators ready to scale."
                        features={[
                            "Fast Response Speed",
                            "Unlimited Text Generation",
                            "50 Daily Visual Prompts",
                            "Strategy Module",
                            "Priority Support"
                        ]}
                    />

                    {/* PRO TIER (Special) */}
                    <div className="relative group">
                        {/* Moving Light Gradient Behind */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500"></div>
                        <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-b from-white/20 to-white/5 opacity-50"></div>
                        
                        <div className="relative h-full bg-[#0F0F0F] rounded-[31px] p-8 border border-white/10 flex flex-col overflow-hidden">
                            {/* Subtle Ambient Glow inside card */}
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="mb-8 relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xl font-bold text-white">Pro Plan</h4>
                                    <span className="bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Best Value</span>
                                </div>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-5xl font-bold text-white tracking-tight">$29.99</span>
                                    <span className="text-sm text-gray-500 font-medium">/ month</span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">The ultimate suite for professional dominance.</p>
                            </div>

                            <div className="space-y-4 mb-10 flex-1 relative z-10">
                                {[
                                    "Instant Latency (<100ms)",
                                    "Flux & Midjourney V6",
                                    "Unlimited Visual Prompts",
                                    "Parasocial Engine",
                                    "Automated DM Scripts",
                                    "24/7 Priority Access"
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                            <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <span className="text-sm text-gray-200 font-medium">{feat}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="relative w-full py-4 rounded-xl bg-white text-black font-bold text-sm tracking-wider uppercase hover:scale-[1.02] transition-transform duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                Get Pro Plan
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="mt-16 text-center opacity-40">
                    <p className="text-[10px] uppercase tracking-widest">
                        Secure Payment via Stripe • Cancel Anytime
                    </p>
                </div>
            </div>
        </ModalWrapper>
    );
};

const PricingCard = ({ tier, price, period, desc, features }: any) => {
    return (
        <div className="relative h-full bg-[#0a0a0a] rounded-[32px] p-8 border border-white/5 flex flex-col hover:border-white/20 transition-colors duration-300">
            <div className="mb-8">
                <h4 className="text-xl font-bold text-white mb-2">{tier}</h4>
                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-white tracking-tight">{price}</span>
                    <span className="text-sm text-gray-500 font-medium">/ {period}</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>

            <div className="space-y-4 mb-10 flex-1">
                {features.map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span className="text-sm text-gray-400">{feat}</span>
                    </div>
                ))}
            </div>

            <button className="w-full py-4 rounded-xl border border-white/10 text-white font-semibold text-sm hover:bg-white hover:text-black transition-all duration-200">
                Current Plan
            </button>
        </div>
    )
}

// --- SETTINGS MODAL ---
export const SettingsModal: React.FC<ModalProps> = (props) => {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'model', label: 'Intelligence' },
        { id: 'billing', label: 'Billing' },
    ];

    return (
        <ModalWrapper {...props} title="Configuration">
            <div className="flex flex-col md:flex-row min-h-[500px] bg-[#080808] p-8 pt-20 gap-8">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                ${activeTab === tab.id 
                                    ? 'bg-white text-black shadow-lg shadow-white/5' 
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#0F0F0F] rounded-[24px] border border-white/5 p-8">
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-[fadeIn_0.3s]">
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-white">Appearance</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 rounded-2xl bg-black border-2 border-white relative overflow-hidden cursor-pointer">
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">Dark Mode</div>
                                        <div className="absolute bottom-3 right-3 w-4 h-4 bg-white rounded-full"></div>
                                    </div>
                                    <div className="h-24 rounded-2xl bg-[#1a1a1a] border border-white/10 relative overflow-hidden cursor-pointer opacity-50">
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">Light Mode</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-white">Display Name</label>
                                <input 
                                    type="text" 
                                    defaultValue="kacinka74" 
                                    className="w-full bg-[#1a1a1a] border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/20 outline-none transition-all" 
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'model' && (
                        <div className="space-y-8 animate-[fadeIn_0.3s]">
                             <div className="space-y-3">
                                <label className="text-sm font-medium text-white">System Personality Override</label>
                                <p className="text-xs text-gray-500">Define how the AI should behave.</p>
                                <textarea 
                                    className="w-full h-40 bg-[#1a1a1a] border-none rounded-xl p-4 text-sm text-gray-200 focus:ring-2 focus:ring-white/20 outline-none resize-none"
                                    placeholder="e.g. You are a cynical marketing genius..."
                                ></textarea>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl">
                                <div>
                                    <div className="text-sm font-medium text-white">Chain of Thought</div>
                                    <div className="text-xs text-gray-500">Show reasoning process</div>
                                </div>
                                <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer transition-colors hover:bg-white/20">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-8 animate-[fadeIn_0.3s]">
                            <div className="p-6 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Plan</div>
                                        <div className="text-2xl font-bold text-white">Pro Plan</div>
                                    </div>
                                    <div className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full">ACTIVE</div>
                                </div>
                                <div className="w-full bg-black/30 h-2 rounded-full mb-2 overflow-hidden">
                                    <div className="w-[74%] h-full bg-white rounded-full"></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>7,420 / 10,000 Credits</span>
                                    <span>Renews in 12 days</span>
                                </div>
                            </div>

                            <button className="text-red-400 text-sm hover:text-red-300 transition-colors font-medium">
                                Cancel Subscription
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalWrapper>
    );
};
