import React, { useState, useEffect } from 'react';
import { 
  MapPin, Link as LinkIcon, Calendar, MoreHorizontal, 
  Share2, Edit3, Heart, MessageCircle, Image as ImageIcon,
  Grid, Bookmark, Zap, Lock, Globe, UserPlus, Mail,
  CheckCircle2, X, Camera, FolderOpen, Layers, Activity
} from 'lucide-react';

// --- MOCK DATA GENERATORS ---

const GENERATE_ACTIVITY = () => {
  // Generates a fake contribution graph for the "About" tab
  return Array.from({ length: 52 * 7 }).map(() => Math.random() > 0.7 ? Math.ceil(Math.random() * 4) : 0);
};

const INITIAL_USER_DATA = {
  self: {
    id: 'self',
    name: 'Kiara Artist',
    handle: '@kiara_vision',
    avatar: 'https://picsum.photos/seed/user_avatar/400/400',
    cover: 'https://picsum.photos/seed/nebula_cover/1920/600',
    bio: 'Digital artist exploring the boundaries of AI generation. Creating daily dreamscapes and futuristic concepts. Open for collaborations.',
    location: 'Tokyo, Japan',
    website: 'kiara.art/portfolio',
    joined: 'March 2024',
    isPro: true,
    stats: { creations: 2405, followers: 14200, following: 892, likes: 1800000 }
  },
  other: {
    id: 'other',
    name: 'Neon Dreamer',
    handle: '@neodream',
    avatar: 'https://picsum.photos/seed/u1/400/400',
    cover: 'https://picsum.photos/seed/cyber_cover/1920/600',
    bio: 'Cyberpunk enthusiast. AI Whisperer. Creating digital dreams one pixel at a time.',
    location: 'Neo Seoul, KR',
    website: 'neon.dream/ai',
    joined: 'Dec 2024',
    isPro: true,
    stats: { creations: 1203, followers: 45200, following: 120, likes: 580000 }
  }
};

const COLLECTIONS = [
    { id: 1, title: 'Cyberpunk Cities', count: 124, cover: 'https://picsum.photos/seed/cyber/400/400' },
    { id: 2, title: 'Character Design', count: 45, cover: 'https://picsum.photos/seed/char/400/400' },
    { id: 3, title: 'Abstract Fluids', count: 89, cover: 'https://picsum.photos/seed/fluid/400/400' },
    { id: 4, title: 'Landscapes', count: 201, cover: 'https://picsum.photos/seed/land/400/400' },
];

const FOLLOWERS_LIST = [
    { id: 101, name: 'Alice Wonder', handle: '@alice_ai', avatar: 'https://picsum.photos/seed/alice/100/100' },
    { id: 102, name: 'Bob Builder', handle: '@bob_builds', avatar: 'https://picsum.photos/seed/bob/100/100' },
    { id: 103, name: 'Charlie Day', handle: '@charlie_d', avatar: 'https://picsum.photos/seed/charlie/100/100' },
    { id: 104, name: 'Dave Wave', handle: '@wave_dave', avatar: 'https://picsum.photos/seed/dave/100/100' },
    { id: 105, name: 'Eve Online', handle: '@eve_ai', avatar: 'https://picsum.photos/seed/eve/100/100' },
];

interface ProfileProps {
    viewingUserId?: string | null; // If null, viewing self
}

export const Profile: React.FC<ProfileProps> = ({ viewingUserId }) => {
  const [activeTab, setActiveTab] = useState<'creations' | 'liked' | 'collections' | 'about'>('creations');
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Local state to manage user data (so we can edit it)
  const isSelf = !viewingUserId;
  const [userData, setUserData] = useState(isSelf ? INITIAL_USER_DATA.self : INITIAL_USER_DATA.other);
  
  // Sync state when prop changes
  useEffect(() => {
      setUserData(isSelf ? INITIAL_USER_DATA.self : INITIAL_USER_DATA.other);
      setIsFollowing(false); // Reset follow state on user switch
  }, [viewingUserId, isSelf]);

  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  // --- Handlers ---
  
  const handleFollowToggle = () => {
      setIsFollowing(!isFollowing);
      setUserData(prev => ({
          ...prev,
          stats: {
              ...prev.stats,
              followers: prev.stats.followers + (isFollowing ? -1 : 1)
          }
      }));
  };

  const handleSaveProfile = (newData: any) => {
      setUserData(prev => ({ ...prev, ...newData }));
      setIsEditModalOpen(false);
  };

  const openListModal = (type: 'followers' | 'following') => {
      setModalType(type);
      setIsFollowersModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black animate-fade-in-up pb-20 relative">
      
      {/* 1. COVER BANNER */}
      <div className="h-64 md:h-80 w-full relative group overflow-hidden">
         <img 
            src={userData.cover} 
            alt="Cover" 
            className="w-full h-full object-cover transition-transform duration-[3s] hover:scale-105"
         />
         <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black"></div>
         
         {/* Edit Cover Button (Self Only) */}
         {isSelf && (
            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:scale-110"
            >
                <Camera size={18} />
            </button>
         )}
      </div>

      {/* 2. PROFILE INFO SECTION */}
      <div className="max-w-7xl mx-auto px-6 relative -mt-20">
         <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
            
            {/* Avatar */}
            <div className="relative group">
                {/* Holographic Ring */}
                <div className="absolute -inset-1 bg-gradient-brand rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse-slow"></div>
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black relative z-10 overflow-hidden bg-black group-hover:scale-[1.02] transition-transform duration-300">
                    <img 
                        src={userData.avatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                    />
                    {isSelf && (
                        <div 
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <Camera size={24} className="text-white" />
                        </div>
                    )}
                </div>
                {userData.isPro && (
                    <div className="absolute bottom-2 right-2 z-20 bg-black rounded-full p-1 border border-white/10" title="Pro Creator">
                        <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center shadow-[0_0_10px_rgba(232,121,249,0.5)]">
                            <Zap size={12} className="fill-black text-black" />
                        </div>
                    </div>
                )}
            </div>

            {/* User Details */}
            <div className="flex-1 pb-2 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-2">
                            {userData.name}
                            {userData.isPro && (
                                <span className="text-[10px] px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 font-mono font-bold uppercase tracking-widest align-middle">
                                    Pro
                                </span>
                            )}
                        </h1>
                        <p className="text-zinc-400 font-mono text-sm mt-1">{userData.handle}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isSelf ? (
                            <button 
                                onClick={() => setIsEditModalOpen(true)}
                                className="px-4 py-2 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <Edit3 size={16} /> Edit Profile
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={handleFollowToggle}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-2 ${
                                        isFollowing 
                                        ? 'bg-transparent border-zinc-600 text-zinc-300 hover:border-red-500 hover:text-red-400' 
                                        : 'bg-white text-black border-transparent hover:bg-zinc-200 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                    }`}
                                >
                                    {isFollowing ? 'Unfollow' : <><UserPlus size={16} /> Follow</>}
                                </button>
                                <button className="p-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors">
                                    <Mail size={18} />
                                </button>
                            </>
                        )}
                        <button className="p-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors">
                            <Share2 size={18} />
                        </button>
                        <button className="p-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>

                {/* Bio & Meta */}
                <p className="text-zinc-300 mt-4 max-w-2xl leading-relaxed">
                    {userData.bio}
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-zinc-400" /> {userData.location}
                    </div>
                    <a href={`https://${userData.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors cursor-pointer">
                        <LinkIcon size={14} className="text-zinc-400" /> {userData.website}
                    </a>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-zinc-400" /> Joined {userData.joined}
                    </div>
                </div>
            </div>
         </div>

         {/* Stats Row - Clickable */}
         <div className="flex items-center gap-8 py-6 border-y border-white/5 mb-8 overflow-x-auto hide-scrollbar">
             <StatItem label="Creations" value={userData.stats.creations} onClick={() => setActiveTab('creations')} />
             <StatItem label="Followers" value={userData.stats.followers} onClick={() => openListModal('followers')} />
             <StatItem label="Following" value={userData.stats.following} onClick={() => openListModal('following')} />
             <StatItem label="Likes" value={userData.stats.likes} onClick={() => setActiveTab('liked')} />
         </div>

         {/* 3. TABS & CONTENT */}
         <div>
             {/* Tabs Header */}
             <div className="flex items-center gap-8 mb-6 border-b border-white/5 overflow-x-auto hide-scrollbar">
                 <ProfileTab 
                    label="Creations" 
                    active={activeTab === 'creations'} 
                    onClick={() => setActiveTab('creations')} 
                    icon={<ImageIcon size={16} />}
                 />
                 <ProfileTab 
                    label="Collections" 
                    active={activeTab === 'collections'} 
                    onClick={() => setActiveTab('collections')} 
                    icon={<Grid size={16} />}
                 />
                 <ProfileTab 
                    label="Liked" 
                    active={activeTab === 'liked'} 
                    onClick={() => setActiveTab('liked')} 
                    icon={<Heart size={16} />}
                 />
                 <ProfileTab 
                    label="About" 
                    active={activeTab === 'about'} 
                    onClick={() => setActiveTab('about')} 
                    icon={<Activity size={16} />}
                 />
             </div>

             {/* Tab Content */}
             <div className="min-h-[400px]">
                 {activeTab === 'creations' && <CreationsGrid handle={userData.handle} isSelf={isSelf} />}
                 {activeTab === 'liked' && <CreationsGrid handle={userData.handle} isSelf={isSelf} type="liked" />}
                 {activeTab === 'collections' && <CollectionsGrid />}
                 {activeTab === 'about' && <AboutSection user={userData} />}
             </div>
         </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Edit Profile Modal */}
      {isEditModalOpen && (
          <EditProfileModal 
            user={userData} 
            onClose={() => setIsEditModalOpen(false)} 
            onSave={handleSaveProfile} 
          />
      )}

      {/* Followers/Following List Modal */}
      {isFollowersModalOpen && (
          <UserListModal 
            title={modalType === 'followers' ? 'Followers' : 'Following'} 
            onClose={() => setIsFollowersModalOpen(false)} 
          />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatItem = ({ label, value, onClick }: { label: string, value: number, onClick: () => void }) => {
    // Format large numbers (e.g. 1800 -> 1.8k)
    const formatter = Intl.NumberFormat('en', { notation: "compact" });
    
    return (
        <button onClick={onClick} className="flex flex-col items-start group min-w-[80px]">
            <span className="text-xl font-bold text-white font-display group-hover:text-purple-300 transition-colors">
                {formatter.format(value)}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-zinc-300">
                {label}
            </span>
        </button>
    );
};

const ProfileTab = ({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button 
        onClick={onClick}
        className={`pb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-all relative whitespace-nowrap ${
            active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
    >
        {icon} {label}
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-brand shadow-[0_-2px_10px_rgba(232,121,249,0.5)]"></div>
        )}
    </button>
);

const CreationsGrid = ({ handle, isSelf, type = 'created' }: { handle: string, isSelf: boolean, type?: 'created' | 'liked' }) => {
    // Mock varied heights for masonry feel
    const heights = [1000, 600, 800, 1200, 600, 450, 1000, 800];
    
    return (
        <div className="columns-1 md:columns-3 lg:columns-4 gap-4 space-y-4 animate-fade-in-up">
            {heights.map((h, idx) => (
                <div key={idx} className="group relative break-inside-avoid rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                    <img 
                       src={`https://picsum.photos/seed/${handle}_${type}_${idx}/800/${h}`} 
                       alt="Art" 
                       className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Heart size={14} className="fill-white" /> {Math.floor(Math.random() * 5000)}
                            </div>
                            <div className="flex gap-2">
                                {isSelf && Math.random() > 0.8 && (
                                   <div className="p-1.5 rounded-md bg-black/50 text-zinc-400" title="Private">
                                       <Lock size={14} />
                                   </div>
                                )}
                                <button className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors">
                                    <Bookmark size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
};

const CollectionsGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
        {COLLECTIONS.map((col) => (
            <div key={col.id} className="group cursor-pointer">
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 mb-3">
                    {/* Folder Stack Effect */}
                    <div className="absolute top-2 left-2 right-2 bottom-0 bg-zinc-800 rounded-t-xl opacity-50 transform -translate-y-2 scale-95"></div>
                    <img 
                        src={col.cover} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10" 
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors z-20" />
                    <div className="absolute bottom-3 right-3 z-30 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-bold text-white flex items-center gap-1">
                        <Layers size={12} /> {col.count}
                    </div>
                </div>
                <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">{col.title}</h3>
                <p className="text-xs text-zinc-500">Updated 2 days ago</p>
            </div>
        ))}
        
        {/* New Collection Button */}
        <div className="group cursor-pointer border border-dashed border-zinc-700 rounded-2xl aspect-square flex flex-col items-center justify-center gap-3 hover:bg-zinc-900 hover:border-purple-500/50 transition-all">
             <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-black transition-colors">
                 <FolderOpen size={20} />
             </div>
             <span className="text-sm font-bold text-zinc-500 group-hover:text-white">New Collection</span>
        </div>
    </div>
);

const AboutSection = ({ user }: { user: any }) => {
    const activityData = GENERATE_ACTIVITY();
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-2 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <AboutCard label="Avg. Generation Time" value="1.2s" icon={<Zap className="text-yellow-400" />} />
                     <AboutCard label="Tools Used" value="14" icon={<Grid className="text-purple-400" />} />
                     <AboutCard label="Member Since" value="Mar '24" icon={<Calendar className="text-blue-400" />} />
                     <AboutCard label="Total Likes" value="1.8M" icon={<Heart className="text-pink-400" />} />
                </div>

                {/* Activity Graph */}
                <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/30">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-green-400" /> Creative Activity
                    </h3>
                    <div className="flex flex-wrap gap-1">
                        {activityData.map((level, i) => (
                            <div 
                                key={i} 
                                className={`w-3 h-3 rounded-sm ${
                                    level === 0 ? 'bg-zinc-800' :
                                    level === 1 ? 'bg-green-900' :
                                    level === 2 ? 'bg-green-700' :
                                    level === 3 ? 'bg-green-500' :
                                    'bg-green-400'
                                }`}
                                title={`${level} contributions`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
                <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/30">
                    <h3 className="text-white font-bold mb-4">Software & Tools</h3>
                    <div className="flex flex-wrap gap-2">
                        {['Stable Diffusion', 'Midjourney', 'Blender', 'Photoshop', 'DaVinci Resolve'].map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-zinc-300">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/30">
                    <h3 className="text-white font-bold mb-4">Connect</h3>
                    <div className="space-y-3">
                        <SocialLink icon={<Globe size={16} />} label="Portfolio" value={user.website} />
                        <SocialLink icon={<Mail size={16} />} label="Email" value="Contact Me" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutCard = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
        <div className="mb-2">{icon}</div>
        <div className="text-xl font-bold text-white font-display">{value}</div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</div>
    </div>
);

const SocialLink = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-white/5 hover:border-white/20 transition-colors cursor-pointer group">
        <div className="flex items-center gap-3">
            <div className="text-zinc-500 group-hover:text-white transition-colors">{icon}</div>
            <span className="text-sm font-medium text-zinc-300">{label}</span>
        </div>
        <span className="text-xs text-purple-400 group-hover:text-purple-300">{value}</span>
    </div>
);


// --- MODAL COMPONENTS ---

const EditProfileModal = ({ user, onClose, onSave }: { user: any, onClose: () => void, onSave: (data: any) => void }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        handle: user.handle,
        bio: user.bio,
        location: user.location,
        website: user.website
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="w-full max-w-lg bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white font-display">Edit Profile</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Image Mockup */}
                    <div className="flex gap-4 items-center mb-4">
                         <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden relative group cursor-pointer">
                             <img src={user.avatar} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <Camera size={20} className="text-white" />
                             </div>
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                             <p className="text-xs text-zinc-500">Recommended 400x400px</p>
                         </div>
                         <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10">Upload</button>
                    </div>

                    <div className="space-y-4">
                        <InputGroup label="Display Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                        <InputGroup label="Handle" value={formData.handle} onChange={v => setFormData({...formData, handle: v})} />
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bio</label>
                            <textarea 
                                value={formData.bio}
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 outline-none h-24 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <InputGroup label="Location" value={formData.location} onChange={v => setFormData({...formData, location: v})} />
                             <InputGroup label="Website" value={formData.website} onChange={v => setFormData({...formData, website: v})} />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5">Cancel</button>
                    <button 
                        onClick={() => onSave(formData)}
                        className="px-6 py-2 rounded-lg bg-gradient-brand text-black font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserListModal = ({ title, onClose }: { title: string, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white font-display">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {FOLLOWERS_LIST.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                                <div>
                                    <h4 className="text-sm font-bold text-white">{u.name}</h4>
                                    <p className="text-xs text-zinc-500">{u.handle}</p>
                                </div>
                            </div>
                            <button className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200">
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InputGroup = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
        <input 
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500/50 outline-none"
        />
    </div>
);