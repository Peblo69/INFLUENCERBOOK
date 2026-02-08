import React, { useState } from 'react';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, X, 
  Zap, Copy, Bookmark, UserPlus, Search, Filter,
  ArrowRight, Eye, Layers
} from 'lucide-react';

// --- MOCK DATA ---

const USERS = {
  u1: { id: 'u1', name: 'Neon Dreamer', handle: '@neodream', avatar: 'https://picsum.photos/seed/u1/200/200', bio: 'Cyberpunk enthusiast. AI Whisperer.' },
  u2: { id: 'u2', name: 'Sarah Conners', handle: '@sarah_ai', avatar: 'https://picsum.photos/seed/u2/200/200', bio: 'Creating digital nature and landscapes.' },
  u3: { id: 'u3', name: 'Design God', handle: '@design_god', avatar: 'https://picsum.photos/seed/u3/200/200', bio: 'Abstract concepts and architectural viz.' },
};

const POSTS = [
  { 
    id: 1, 
    user: USERS.u1, 
    src: 'https://picsum.photos/seed/cyber_neon/800/1000', 
    likes: 2450, 
    comments: 124, 
    title: 'Neon Tokyo 2099',
    prompt: 'Cyberpunk street level view, raining, neon lights reflecting on wet pavement, cinematic lighting, 8k resolution, highly detailed',
    model: 'Kling O1',
    ratio: '4:5'
  },
  { 
    id: 2, 
    user: USERS.u2, 
    src: 'https://picsum.photos/seed/nature_fantasy/800/600', 
    likes: 1890, 
    comments: 56, 
    title: 'Ethereal Forest',
    prompt: 'Mystical forest with glowing mushrooms, fog, sun rays breaking through trees, fantasy style, unreal engine 5 render',
    model: 'Seedream 4.5',
    ratio: '4:3'
  },
  { 
    id: 3, 
    user: USERS.u3, 
    src: 'https://picsum.photos/seed/arch_viz/800/800', 
    likes: 3200, 
    comments: 210, 
    title: 'Modern Concrete Villa',
    prompt: 'Brutalist architecture, concrete villa in desert, sunset lighting, minimal design, architectural photography',
    model: 'FLUX.2 Pro',
    ratio: '1:1'
  },
  { 
    id: 4, 
    user: USERS.u1, 
    src: 'https://picsum.photos/seed/robot_portrait/800/1200', 
    likes: 890, 
    comments: 34, 
    title: 'Android Geisha',
    prompt: 'Portrait of a female android geisha, intricate mechanical details, porcelain skin face, cherry blossoms background',
    model: 'Kling O1',
    ratio: '2:3'
  },
  { 
    id: 5, 
    user: USERS.u2, 
    src: 'https://picsum.photos/seed/space_nebula/1200/800', 
    likes: 4100, 
    comments: 340, 
    title: 'Nebula Walker',
    prompt: 'Astronaut floating in colorful nebula, wide shot, cinematic composition, interstellar movie style',
    model: 'Nano Banana',
    ratio: '16:9'
  },
  { 
    id: 6, 
    user: USERS.u3, 
    src: 'https://picsum.photos/seed/abstract_fluid/800/1000', 
    likes: 1200, 
    comments: 88, 
    title: 'Liquid Gold',
    prompt: 'Abstract fluid simulation, gold and black liquid mixing, macro photography, depth of field',
    model: 'FLUX.2 Flex',
    ratio: '4:5'
  },
];

interface CommunityFeedProps {
  onNavigateToProfile: (userId: string) => void;
  onRemix: (prompt: string) => void;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ onNavigateToProfile, onRemix }) => {
  const [activeTab, setActiveTab] = useState('trending');
  const [selectedPost, setSelectedPost] = useState<typeof POSTS[0] | null>(null);
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handlePostClick = (post: typeof POSTS[0]) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  return (
    <div className="min-h-screen bg-black animate-fade-in-up pb-20">
      
      {/* 1. HEADER & FILTERS */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar w-full md:w-auto">
                   <h1 className="text-xl font-display font-bold text-white mr-4">Community</h1>
                   <TabButton label="Trending" active={activeTab === 'trending'} onClick={() => setActiveTab('trending')} icon={<Zap size={14} />} />
                   <TabButton label="Newest" active={activeTab === 'newest'} onClick={() => setActiveTab('newest')} icon={<Eye size={14} />} />
                   <TabButton label="Following" active={activeTab === 'following'} onClick={() => setActiveTab('following')} icon={<UserPlus size={14} />} />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                       <input 
                          type="text" 
                          placeholder="Search prompts, tags, users..." 
                          className="w-full bg-zinc-900 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-purple-500/50 outline-none transition-colors"
                       />
                   </div>
                   <button className="p-2 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                       <Filter size={18} />
                   </button>
              </div>
          </div>
      </div>

      {/* 2. MASONRY GRID */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {POSTS.map((post, idx) => (
                  <div 
                    key={post.id} 
                    onClick={() => handlePostClick(post)}
                    className="group relative break-inside-avoid rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-fade-in-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                      {/* Image */}
                      <img 
                        src={post.src} 
                        alt={post.title} 
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                          
                          {/* Top Actions (Hover) */}
                          <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] group-hover:translate-y-0 transition-transform duration-300">
                              <button className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20">
                                  <Bookmark size={16} />
                              </button>
                          </div>

                          {/* Bottom Info */}
                          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              <h3 className="font-display font-bold text-white text-lg leading-tight mb-1">{post.title}</h3>
                              
                              <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-2 group/user hover:bg-white/10 rounded-full pr-3 transition-colors" onClick={(e) => { e.stopPropagation(); onNavigateToProfile(post.user.id); }}>
                                      <img src={post.user.avatar} className="w-6 h-6 rounded-full border border-white/20" />
                                      <span className="text-xs font-medium text-zinc-200 group-hover/user:text-white truncate max-w-[100px]">{post.user.name}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs font-bold text-zinc-300">
                                      <span className="flex items-center gap-1"><Heart size={12} className="fill-white" /> {(post.likes / 1000).toFixed(1)}k</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* 3. DETAILED IMAGE MODAL - RESIZED & REPOSITIONED */}
      {selectedPost && (
          // Changed items-center to items-start and added pt-12 md:pt-24 to push it higher
          <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/90 backdrop-blur-sm p-4 pt-12 md:pt-24 animate-fade-in-up">
              
              {/* Close Button */}
              <button 
                onClick={handleCloseModal}
                className="absolute top-4 right-4 md:top-6 md:right-8 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[110]"
              >
                  <X size={20} />
              </button>

              <div className="w-full max-w-5xl h-[85vh] md:h-[700px] bg-[#09090b] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row relative">
                  
                  {/* LEFT: IMAGE VIEW */}
                  <div className="flex-1 bg-black/50 relative flex items-center justify-center p-6 group overflow-hidden">
                       {/* Background Blur */}
                       <img src={selectedPost.src} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-150 pointer-events-none" />
                       
                       <img 
                          src={selectedPost.src} 
                          alt={selectedPost.title} 
                          className="relative max-w-full max-h-full object-contain rounded-lg shadow-2xl z-10"
                       />

                       {/* Action Buttons Floating */}
                       <div className="absolute bottom-6 flex gap-3 z-20">
                           <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all hover:scale-105">
                               <Heart size={16} /> Like
                           </button>
                           <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all hover:scale-105">
                               <Share2 size={16} /> Share
                           </button>
                       </div>
                  </div>

                  {/* RIGHT: DETAILS SIDEBAR - Compact Width */}
                  <div className="w-full md:w-[360px] bg-[#09090b] border-l border-white/5 flex flex-col h-full">
                      
                      {/* 1. Artist Mini-Profile */}
                      <div className="p-5 border-b border-white/5">
                          <div className="flex items-center justify-between mb-3">
                              <div 
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={() => onNavigateToProfile(selectedPost.user.id)}
                              >
                                  <div className="relative">
                                      <div className="absolute -inset-1 bg-gradient-brand rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                                      <img src={selectedPost.user.avatar} className="w-10 h-10 rounded-full border border-white/10 relative z-10" />
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{selectedPost.user.name}</h3>
                                      <p className="text-[10px] text-zinc-500">{selectedPost.user.handle}</p>
                                  </div>
                              </div>
                              <button 
                                onClick={(e) => toggleFollow(selectedPost.user.id, e)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                    isFollowing[selectedPost.user.id] 
                                    ? 'bg-transparent border-white/20 text-zinc-400' 
                                    : 'bg-white text-black border-transparent hover:bg-zinc-200'
                                }`}
                              >
                                  {isFollowing[selectedPost.user.id] ? 'Following' : 'Follow'}
                              </button>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">{selectedPost.user.bio}</p>
                      </div>

                      {/* 2. Prompt & Params (Scrollable) */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                          <div>
                              <h2 className="text-xl font-display font-bold text-white mb-1.5">{selectedPost.title}</h2>
                              <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-3">
                                  <span>2h ago</span>
                                  <span>•</span>
                                  <span>{selectedPost.comments} comments</span>
                                  <span>•</span>
                                  <span>{(selectedPost.likes/1000).toFixed(1)}k likes</span>
                              </div>
                          </div>

                          <div className="bg-zinc-900/50 rounded-lg p-3.5 border border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prompt</span>
                                  <button className="text-zinc-500 hover:text-white"><Copy size={12} /></button>
                              </div>
                              <p className="text-xs text-zinc-300 font-light leading-relaxed">
                                  {selectedPost.prompt}
                              </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                              <ParamBox label="Model" value={selectedPost.model} />
                              <ParamBox label="Ratio" value={selectedPost.ratio} />
                              <ParamBox label="Seed" value="89230122" />
                              <ParamBox label="Guidance" value="7.5" />
                          </div>

                          {/* Mock Comments */}
                          <div className="pt-3 border-t border-white/5">
                              <h4 className="text-xs font-bold text-white mb-3">Comments</h4>
                              <div className="space-y-3">
                                  <Comment user="Alex Art" text="This lighting is insane! 🔥" time="10m" />
                                  <Comment user="Future_Dev" text="Did you use LoRA?" time="1h" />
                                  <Comment user="Kiara Fan" text="Absolutely stunning." time="2h" />
                              </div>
                          </div>
                      </div>

                      {/* 3. Footer Action (Remix) */}
                      <div className="p-5 border-t border-white/5 bg-[#09090b]">
                          <button 
                            onClick={() => onRemix(selectedPost.prompt)}
                            className="w-full py-3 rounded-lg bg-gradient-brand hover:bg-gradient-brand-hover text-black font-bold font-display uppercase tracking-wide text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(232,121,249,0.3)]"
                          >
                              <Layers size={16} /> Remix this Creation
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const TabButton = ({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button 
       onClick={onClick}
       className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
           active 
           ? 'bg-white text-black' 
           : 'text-zinc-400 hover:text-white hover:bg-white/5'
       }`}
    >
        {icon} {label}
    </button>
);

const ParamBox = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-2.5">
        <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{label}</span>
        <span className="text-xs text-zinc-300 font-mono">{value}</span>
    </div>
);

const Comment = ({ user, text, time }: { user: string, text: string, time: string }) => (
    <div className="flex gap-2.5">
        <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0"></div>
        <div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{user}</span>
                <span className="text-[9px] text-zinc-600">{time}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{text}</p>
        </div>
    </div>
);