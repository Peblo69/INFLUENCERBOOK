import { useState } from "react";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";
import { NeonEditor } from "./NeonEditor"; 
import { 
  Settings, ChevronDown, Image as ImageIcon, Music, Layers, Sparkles, Download, 
  ThumbsUp, ThumbsDown, MoreHorizontal, Star, History, Play, Share2, FolderOpen, 
  Mic, Video as VideoIcon, Check, Loader2, Zap, ArrowLeft, Plus
} from "lucide-react";

export const VideoEditorPage = () => {
  const [activeTab, setActiveTab] = useState("image-to-video");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5s");
  const [model, setModel] = useState("Kiara Motion 1.0");
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showEditor, setShowEditor] = useState(false); 
  
  const [likedItems, setLikedItems] = useState<number[]>([]);
  const [savedItems, setSavedItems] = useState<number[]>([]);

  const feedItems = [
    {
      id: 1,
      url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-looking-at-the-city-lights-from-a-balcony-42739-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop",
      prompt: "A young woman gazing at city lights from a balcony, cinematic lighting, 8k resolution, ultra realistic.",
      model: "Kiara Motion 1.0",
      mode: "Pro Mode",
      duration: "10s",
      user: "KiaraUser"
    },
    {
      id: 2,
      url: "https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1000&auto=format&fit=crop",
      prompt: "Cinematic drone shot of ocean waves crashing on a sandy beach during golden hour, highly detailed.",
      model: "Kiara Motion 1.0",
      mode: "Pro Mode",
      duration: "5s",
      user: "CreatorX"
    }
  ];

  const historyItems = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=200",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200",
  ];

  const toggleLike = (id: number) => {
    if (likedItems.includes(id)) setLikedItems(likedItems.filter(item => item !== id));
    else setLikedItems([...likedItems, id]);
  };

  const toggleSave = (id: number) => {
    if (savedItems.includes(id)) setSavedItems(savedItems.filter(item => item !== id));
    else setSavedItems([...savedItems, id]);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Files dropped:", e.dataTransfer.files);
  };

  if (showEditor) {
      return (
          <div className="relative h-full flex flex-col bg-[#0a0a0a] animate-in fade-in zoom-in-95 duration-300">
              <NeonEditor />
              <button 
                  onClick={() => setShowEditor(false)}
                  className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-zinc-200 text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 z-50"
              >
                  <ArrowLeft size={16} /> Back
              </button>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-white/20 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Left Navigation */}
      <ModelsSidebar /> 

      {/* Generator Panel */}
      <div className="w-[400px] flex flex-col border-r border-white/5 bg-[#0a0a0a] flex-shrink-0 z-20">
        
        {/* Panel Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-white" />
              Video Generator
            </h1>
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Ready</span>
            </div>
          </div>

          {/* Model Selector */}
          <div className="relative mb-6">
            <button 
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-white/10 rounded-xl hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Model</span>
                <span className="text-sm font-medium text-white">{model}</span>
              </div>
              <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showModelDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl border border-white/10 p-1 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                {["Kiara Motion 1.0", "Kiara Motion Turbo", "Kiara Realism 2.0"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setModel(m); setShowModelDropdown(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      model === m ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {m}
                    {model === m && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-[#111] rounded-full border border-white/5">
            {["Text to Video", "Image to Video", "Elements"].map((tab) => {
              const isActive = activeTab === tab.toLowerCase().replace(/ /g, "-");
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(/ /g, "-"))}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {activeTab === "image-to-video" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Keyframes</label>
                <button className="text-[10px] font-medium text-zinc-600 hover:text-white transition-colors">Reset</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Drop Zones */}
                <div 
                    className="aspect-video bg-[#111] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/30 hover:bg-[#151515] transition-all group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-white/10 transition-colors mb-2">
                    <ImageIcon size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400">Start Frame</span>
                </div>
                <div 
                    className="aspect-video bg-[#111] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/30 hover:bg-[#151515] transition-all group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-white/10 transition-colors mb-2">
                    <ImageIcon size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400">End Frame</span>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Prompt</label>
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white bg-white/5 px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors">
                <Zap size={10} className="fill-current" /> Enhance
              </button>
            </div>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your video in detail..."
                className="w-full h-40 p-4 bg-[#111] border border-white/10 rounded-2xl resize-none focus:outline-none focus:border-white/30 text-sm leading-relaxed placeholder:text-zinc-700 text-zinc-200 transition-all"
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-medium text-zinc-600">
                {prompt.length}/2000
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-4 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${soundEffects ? 'bg-white text-black' : 'bg-white/5 text-zinc-500'}`}>
                <Music size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Sound Effects</span>
                <span className="text-[10px] text-zinc-500">Auto-generate audio</span>
              </div>
            </div>
            <button 
              onClick={() => setSoundEffects(!soundEffects)}
              className={`w-12 h-7 rounded-full relative transition-all duration-300 border ${soundEffects ? 'bg-white border-white' : 'bg-black border-white/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${soundEffects ? 'left-6 bg-black' : 'left-1 bg-zinc-500'}`} />
            </button>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-3 gap-2">
              {[
                  { label: "Quality", value: "Pro" },
                  { label: "Duration", value: duration },
                  { label: "Aspect", value: "16:9" }
              ].map((opt, i) => (
                  <button key={i} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-[#111] border border-white/5 rounded-xl hover:border-white/20 hover:bg-[#151515] transition-all group">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase group-hover:text-zinc-400">{opt.label}</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-white">
                          {opt.value} <ChevronDown size={10} className="text-zinc-600" />
                      </div>
                  </button>
              ))}
          </div>
            
          <button 
            onClick={() => setIsGenerating(true)}
            disabled={isGenerating}
            className="w-full py-4 bg-white text-black rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="fill-black" />
                <span>Generate Video</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        {/* Top Bar */}
        <div className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-1">
            {["All", "Videos", "Images"].map((filter, i) => (
              <button
                key={filter}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                  i === 0
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {filter}
              </button>
            ))}
            <div className="h-4 w-px bg-white/10 mx-4" />
            <button className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-full flex items-center gap-2 transition-all">
              <Star size={14} /> Favorites
            </button>
          </div>
          <button 
            onClick={() => setShowEditor(true)} 
            className="px-5 py-2 bg-[#111] border border-white/10 rounded-full text-xs font-bold text-white hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2"
          >
            <VideoIcon size={14} /> Open Editor
          </button>
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {feedItems.map((item) => (
              <div key={item.id} className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500 group">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#111]/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-black bg-white px-2 py-1 rounded shadow-lg">
                      VIDEO
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/10 p-0.5 bg-black">
                        <img src={item.thumbnail} className="w-full h-full rounded-full object-cover" />
                      </div>
                      <span className="text-sm font-bold text-white tracking-tight">{item.user}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                      <Share2 size={14} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div className="px-6 py-5 bg-black">
                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">{item.prompt}</p>
                </div>

                {/* Video */}
                <div className="relative bg-black w-full aspect-video group/video cursor-pointer">
                  <video 
                    src={item.url} 
                    className="w-full h-full object-contain" 
                    loop 
                    muted
                    poster={item.thumbnail}
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                  <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold border border-white/10">
                    {item.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/video:opacity-100 transition-all duration-500 scale-90 group-hover/video:scale-100">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
                      <Play size={32} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 flex items-center justify-between bg-[#111]/30 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {["Multi-Elements", "Lip Sync", "AI Sound"].map((action, idx) => (
                        <button key={idx} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/5 transition-all">
                            {idx === 0 && <Layers size={12} />}
                            {idx === 1 && <Mic size={12} />}
                            {idx === 2 && <Music size={12} />}
                            {action}
                        </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                        className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all ${likedItems.includes(item.id) ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                        onClick={() => toggleLike(item.id)}
                      >
                        <ThumbsUp size={14} className={likedItems.includes(item.id) ? 'fill-current' : ''} />
                        {likedItems.includes(item.id) ? 'Liked' : 'Like'}
                    </button>
                    
                    <button 
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    
                    <button 
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${savedItems.includes(item.id) ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                      onClick={() => toggleSave(item.id)}
                      title="Save"
                    >
                      <Star size={14} className={savedItems.includes(item.id) ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar (History) */}
      <div className="w-[72px] border-l border-white/5 bg-[#0a0a0a] flex flex-col items-center py-6 flex-shrink-0 z-20">
        <button className="mb-6 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-all group" title="History">
          <History size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
        </button>
        
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar px-3 space-y-3">
          {historyItems.map((url, i) => (
            <div key={i} className="w-full aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer relative group opacity-60 hover:opacity-100 hover:border-white/30 transition-all">
              <img src={url} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        
        <button className="mt-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};