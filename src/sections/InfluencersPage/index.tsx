import { useState, useRef, useCallback, useEffect } from "react";
import { InfluencersSidebar } from "./components/InfluencersSidebar";
import { 
  Plus, X, Upload, Sparkles, ChevronRight, Check, Instagram, 
  Twitter, User, Image, Palette, Link2, Eye, Wand2, 
  ArrowRight, ArrowLeft, Trash2, Camera, Crown, Hash,
  Mic, Globe, Save, Loader2, Star, Zap, Heart
} from "lucide-react";
import { useNotifications } from "@/components/Notification";

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL PLATFORM ICONS (Custom SVGs)
// ═══════════════════════════════════════════════════════════════════════════════
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const ThreadsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 1.986-.013 3.758-.4 5.267-1.15l.75 1.893c-1.75.864-3.824 1.34-6.018 1.376z"/>
    <path d="M17.735 9.2c-.733-.8-1.79-1.272-2.974-1.327-2.417-.117-3.93 1.091-4.387 3.413-.224 1.13-.122 2.33.29 3.39.626 1.61 1.868 2.55 3.49 2.643 1.385.078 2.482-.417 3.188-1.437.514-.745.783-1.663.783-2.73 0-.1-.004-.2-.012-.296l.025-4.138h2.063l-.026 4.176c-.001 1.468-.407 2.744-1.206 3.792-1.016 1.34-2.558 2.077-4.457 2.149-2.335.113-4.16-.978-5.1-3.03-.54-1.303-.673-2.874-.38-4.416.47-2.393 1.883-3.97 4.227-4.48.514-.105 1.06-.16 1.623-.16 1.916 0 3.488.67 4.583 1.86l-1.735 1.592z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.327.327 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
interface SocialLink {
  platform: string;
  url: string;
}

interface PersonalityTrait {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface VoiceStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
}

interface ModelForm {
  name: string;
  handle: string;
  bio: string;
  images: string[];
  lora: string;
  socials: SocialLink[];
  traits: string[];
  voiceStyle: string;
  samplePrompts: string[];
}

type WizardStep = "welcome" | "identity" | "photos" | "personality" | "socials" | "preview";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: <Instagram size={18} />, placeholder: "@username", color: "#E4405F" },
  { id: "tiktok", name: "TikTok", icon: <TikTokIcon />, placeholder: "@username", color: "#000000" },
  { id: "twitter", name: "X / Twitter", icon: <XIcon />, placeholder: "@username", color: "#1DA1F2" },
  { id: "youtube", name: "YouTube", icon: <YouTubeIcon />, placeholder: "channel URL", color: "#FF0000" },
  { id: "threads", name: "Threads", icon: <ThreadsIcon />, placeholder: "@username", color: "#000000" },
  { id: "telegram", name: "Telegram", icon: <TelegramIcon />, placeholder: "@username or URL", color: "#26A5E4" },
  { id: "reddit", name: "Reddit", icon: <RedditIcon />, placeholder: "u/username", color: "#FF4500" },
];

const PERSONALITY_TRAITS: PersonalityTrait[] = [
  { id: "friendly", name: "Friendly", icon: "🤗", description: "Warm and approachable" },
  { id: "witty", name: "Witty", icon: "😏", description: "Clever and humorous" },
  { id: "professional", name: "Professional", icon: "💼", description: "Polished and formal" },
  { id: "playful", name: "Playful", icon: "🎮", description: "Fun and energetic" },
  { id: "mysterious", name: "Mysterious", icon: "🌙", description: "Intriguing and enigmatic" },
  { id: "confident", name: "Confident", icon: "💪", description: "Bold and self-assured" },
  { id: "creative", name: "Creative", icon: "🎨", description: "Artistic and imaginative" },
  { id: "intellectual", name: "Intellectual", icon: "📚", description: "Thoughtful and knowledgeable" },
];

const VOICE_STYLES: VoiceStyle[] = [
  { id: "casual", name: "Casual", description: "Relaxed, everyday conversation", preview: "Hey! What's up?" },
  { id: "formal", name: "Formal", description: "Professional and polished", preview: "Greetings. How may I assist you today?" },
  { id: "genz", name: "Gen Z", description: "Trendy internet slang", preview: "no cap, that's literally fire 🔥" },
  { id: "poetic", name: "Poetic", description: "Artistic and flowing", preview: "In whispers of dawn, dreams take flight..." },
  { id: "sassy", name: "Sassy", description: "Bold with attitude", preview: "Oh honey, please. I said what I said." },
];

const SAMPLE_PROMPTS = [
  "A portrait in golden hour lighting",
  "Casual streetwear fashion photo",
  "Elegant evening gown at a gala",
  "Fitness workout session at the gym",
  "Cozy coffee shop aesthetic",
  "Tropical beach vacation vibes",
  "Urban cityscape at night",
  "Artistic black and white portrait",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const InfluencersPage = () => {
  const { NotificationContainer, showNotification } = useNotifications();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ModelForm>({
    name: "",
    handle: "",
    bio: "",
    images: [],
    lora: "",
    socials: [],
    traits: [],
    voiceStyle: "casual",
    samplePrompts: [],
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Handlers ──
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (form.images.length >= 8) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setForm(prev => ({ 
            ...prev, 
            images: [...prev.images, event.target!.result as string] 
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  }, [form.images.length]);

  const removeImage = useCallback((index: number) => {
    setForm(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== index) 
    }));
  }, []);

  const updateSocial = useCallback((platform: string, url: string) => {
    setForm(prev => ({
      ...prev,
      socials: prev.socials.some(s => s.platform === platform)
        ? prev.socials.map(s => s.platform === platform ? { ...s, url } : s)
        : [...prev.socials, { platform, url }]
    }));
  }, []);

  const getSocialValue = useCallback((platform: string) => {
    return form.socials.find(s => s.platform === platform)?.url || "";
  }, [form.socials]);

  const toggleTrait = useCallback((traitId: string) => {
    setForm(prev => ({
      ...prev,
      traits: prev.traits.includes(traitId)
        ? prev.traits.filter(t => t !== traitId)
        : [...prev.traits, traitId].slice(0, 4)
    }));
  }, []);

  const toggleSamplePrompt = useCallback((prompt: string) => {
    setForm(prev => ({
      ...prev,
      samplePrompts: prev.samplePrompts.includes(prompt)
        ? prev.samplePrompts.filter(p => p !== prompt)
        : [...prev.samplePrompts, prompt].slice(0, 4)
    }));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    showNotification("AI Model created successfully!", "success", "Success");
    setIsSubmitting(false);
    setCurrentStep("welcome");
    setForm({
      name: "",
      handle: "",
      bio: "",
      images: [],
      lora: "",
      socials: [],
      traits: [],
      voiceStyle: "casual",
      samplePrompts: [],
    });
  };

  // ── Navigation ──
  const steps: WizardStep[] = ["welcome", "identity", "photos", "personality", "socials", "preview"];
  const currentIndex = steps.indexOf(currentStep);
  
  const canProceed = () => {
    switch (currentStep) {
      case "identity":
        return form.name.trim().length >= 2 && form.handle.trim().length >= 2;
      case "photos":
        return form.images.length >= 3;
      case "personality":
        return form.traits.length > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: WELCOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderWelcome = () => (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-[11px] text-white/60 uppercase tracking-wider">New Feature</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Create Your{" "}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">
                AI Influencer
              </span>
            </h1>
            <p className="text-[15px] text-white/40 leading-relaxed max-w-md">
              Design a unique digital personality that can generate content, engage with followers, 
              and build an audience autonomously.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: <User size={18} />, text: "Custom personality & voice" },
              { icon: <Image size={18} />, text: "Generate unlimited photos" },
              { icon: <Globe size={18} />, text: "Auto-post to social platforms" },
              { icon: <Zap size={18} />, text: "Train with your own images" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/50">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40">
                  {item.icon}
                </div>
                <span className="text-[14px]">{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep("identity")}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-semibold text-[15px] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Creating</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right: Visual */}
        <div className="relative hidden lg:block">
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Decorative rings */}
            <div className="absolute inset-0 rounded-full border border-white/[0.03] animate-pulse" />
            <div className="absolute inset-8 rounded-full border border-white/[0.05]" />
            <div className="absolute inset-16 rounded-full border border-white/[0.08]" />
            
            {/* Central card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-80 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 via-purple-400/20 to-pink-400/20 border border-white/[0.1] flex items-center justify-center mb-4">
                  <Crown size={40} className="text-white/40" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Your AI Model</h3>
                <p className="text-[12px] text-white/40">Ready to customize</p>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center rotate-12">
                  <Heart size={24} className="text-pink-400/60" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center -rotate-12">
                  <Star size={20} className="text-amber-400/60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: IDENTITY STEP
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderIdentity = () => (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Who is your AI?</h2>
        <p className="text-[14px] text-white/40">Define the basic identity of your digital influencer.</p>
      </div>

      <div className="space-y-6">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-white/60 uppercase tracking-wider">
            Model Name *
          </label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Luna, Alex, Nova..."
              className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 text-white placeholder:text-white/20 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
            />
          </div>
        </div>

        {/* Handle Input */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-white/60 uppercase tracking-wider">
            Handle / Username *
          </label>
          <div className="relative">
            <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={form.handle}
              onChange={(e) => setForm(prev => ({ ...prev, handle: e.target.value.replace(/\s/g, "") }))}
              placeholder="@yourmodel"
              className="w-full h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 text-white placeholder:text-white/20 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
            />
          </div>
        </div>

        {/* Bio Input */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-white/60 uppercase tracking-wider">
            Bio / Description
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Describe your AI's personality, interests, and background..."
            rows={4}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-white placeholder:text-white/20 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05] resize-none"
          />
          <div className="flex justify-end">
            <span className="text-[11px] text-white/30">{form.bio.length}/280</span>
          </div>
        </div>

        {/* LoRA Input */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Wand2 size={14} />
            LoRA Model (Optional)
          </label>
          <input
            type="text"
            value={form.lora}
            onChange={(e) => setForm(prev => ({ ...prev, lora: e.target.value }))}
            placeholder="Paste LoRA URL or model ID..."
            className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-white placeholder:text-white/20 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05] text-[14px]"
          />
          <p className="text-[11px] text-white/30">
            Add a trained LoRA for more consistent character generation
          </p>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: PHOTOS STEP
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderPhotos = () => (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Reference Photos</h2>
        <p className="text-[14px] text-white/40">
          Upload 3-8 clear images showing different angles and expressions. 
          The more variety, the better the results.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
          ${isDragging 
            ? "border-white/30 bg-white/[0.05]" 
            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
          }
          ${form.images.length === 0 ? "h-64" : "h-auto p-6"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload(e.target.files)}
          className="hidden"
        />

        {form.images.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
              <Camera size={28} className="text-white/40" />
            </div>
            <p className="text-[15px] text-white/60 font-medium mb-2">
              Drop photos here or click to upload
            </p>
            <p className="text-[12px] text-white/30">
              Supports JPG, PNG, WebP (max 10MB each)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {form.images.map((img, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden group">
                <img src={img} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {i === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <span className="text-[10px] text-amber-400 font-medium">Main</span>
                  </div>
                )}
              </div>
            ))}
            
            {form.images.length < 8 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-white/[0.2] flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Plus size={24} className="text-white/30" />
                <span className="text-[12px] text-white/30">Add More</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${Math.min((form.images.length / 5) * 100, 100)}%` }}
          />
        </div>
        <span className={`text-[13px] font-medium ${form.images.length >= 3 ? "text-emerald-400" : "text-white/40"}`}>
          {form.images.length}/8 photos
        </span>
      </div>

      <p className="mt-3 text-[12px] text-white/30">
        {form.images.length < 3 
          ? "⚠️ Upload at least 3 photos to continue" 
          : form.images.length < 5 
            ? "💡 Tip: Add 2 more photos for better consistency" 
            : "✅ Great selection! You can add up to 8 photos"}
      </p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: PERSONALITY STEP
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderPersonality = () => (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Define Personality</h2>
        <p className="text-[14px] text-white/40">
          Choose up to 4 personality traits and a voice style for your AI.
        </p>
      </div>

      {/* Traits Grid */}
      <div className="mb-10">
        <h3 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
          Personality Traits ({form.traits.length}/4)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERSONALITY_TRAITS.map((trait) => {
            const isSelected = form.traits.includes(trait.id);
            return (
              <button
                key={trait.id}
                onClick={() => toggleTrait(trait.id)}
                className={`
                  relative p-4 rounded-2xl border transition-all text-left
                  ${isSelected 
                    ? "bg-white/[0.08] border-white/[0.15]" 
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]"
                  }
                `}
              >
                <div className="text-2xl mb-2">{trait.icon}</div>
                <div className="text-[14px] font-medium text-white mb-1">{trait.name}</div>
                <div className="text-[11px] text-white/40">{trait.description}</div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Check size={12} className="text-emerald-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Style */}
      <div className="mb-10">
        <h3 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
          Voice Style
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {VOICE_STYLES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setForm(prev => ({ ...prev, voiceStyle: voice.id }))}
              className={`
                relative p-4 rounded-2xl border transition-all text-left
                ${form.voiceStyle === voice.id 
                  ? "bg-white/[0.08] border-white/[0.15]" 
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]"
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <Mic size={14} className="text-white/40" />
                <span className="text-[13px] font-medium text-white">{voice.name}</span>
              </div>
              <p className="text-[11px] text-white/40 mb-2">{voice.description}</p>
              <p className="text-[11px] text-white/20 italic">"{voice.preview}"</p>
              {form.voiceStyle === voice.id && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Check size={12} className="text-amber-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sample Prompts */}
      <div>
        <h3 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
          Sample Content Ideas ({form.samplePrompts.length}/4)
        </h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((prompt) => {
            const isSelected = form.samplePrompts.includes(prompt);
            return (
              <button
                key={prompt}
                onClick={() => toggleSamplePrompt(prompt)}
                className={`
                  px-4 py-2 rounded-full text-[13px] transition-all border
                  ${isSelected 
                    ? "bg-white text-black border-white font-medium" 
                    : "bg-white/[0.03] text-white/60 border-white/[0.08] hover:border-white/[0.15]"
                  }
                `}
              >
                {prompt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: SOCIALS STEP
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderSocials = () => (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Social Accounts</h2>
        <p className="text-[14px] text-white/40">
          Link your AI's social media presence for seamless content distribution.
        </p>
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const value = getSocialValue(platform.id);
          const isConnected = !!value;
          
          return (
            <div
              key={platform.id}
              className={`
                relative rounded-2xl border transition-all overflow-hidden
                ${isConnected 
                  ? "bg-white/[0.04] border-white/[0.12]" 
                  : "bg-white/[0.02] border-white/[0.05]"
                }
              `}
            >
              <div className="flex items-center gap-4 p-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${platform.color}15` }}
                >
                  <div style={{ color: platform.color }}>{platform.icon}</div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-medium text-white">{platform.name}</span>
                    {isConnected && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                        Connected
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateSocial(platform.id, e.target.value)}
                    placeholder={platform.placeholder}
                    className="w-full bg-transparent text-[14px] text-white/70 placeholder:text-white/20 outline-none"
                  />
                </div>

                {isConnected ? (
                  <button
                    onClick={() => updateSocial(platform.id, "")}
                    className="w-8 h-8 rounded-lg hover:bg-white/[0.05] flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <Link2 size={18} className="text-white/20" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
        <p className="text-[13px] text-amber-200/70">
          <Sparkles size={14} className="inline mr-2" />
          Your AI will be able to post content to connected platforms automatically.
        </p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: PREVIEW STEP
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderPreview = () => (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Review Your AI</h2>
        <p className="text-[14px] text-white/40">
          Preview how your AI influencer will appear to others.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Card Preview */}
        <div className="relative">
          <div className="rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
            {/* Cover */}
            <div className="h-32 bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-pink-500/20" />
            
            {/* Avatar */}
            <div className="px-6 -mt-16 mb-4">
              <div className="w-32 h-32 rounded-3xl bg-black border-4 border-black overflow-hidden">
                {form.images[0] ? (
                  <img src={form.images[0]} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                    <User size={40} className="text-white/20" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="px-6 pb-6">
              <h3 className="text-xl font-bold text-white mb-1">
                {form.name || "Your Model Name"}
              </h3>
              <p className="text-[14px] text-white/40 mb-4">
                @{form.handle || "handle"}
              </p>
              
              <p className="text-[14px] text-white/60 leading-relaxed mb-4">
                {form.bio || "No bio provided yet."}
              </p>

              {/* Traits */}
              {form.traits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {form.traits.map(traitId => {
                    const trait = PERSONALITY_TRAITS.find(t => t.id === traitId);
                    return trait ? (
                      <span key={traitId} className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/60">
                        {trait.icon} {trait.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 pt-4 border-t border-white/[0.05]">
                <div>
                  <span className="text-[18px] font-bold text-white">0</span>
                  <span className="text-[12px] text-white/40 ml-1">posts</span>
                </div>
                <div>
                  <span className="text-[18px] font-bold text-white">0</span>
                  <span className="text-[12px] text-white/40 ml-1">followers</span>
                </div>
                <div>
                  <span className="text-[18px] font-bold text-white">0</span>
                  <span className="text-[12px] text-white/40 ml-1">following</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6">
            <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
              Configuration Summary
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-white/40">Photos</span>
                <span className="text-white">{form.images.length} uploaded</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-white/40">Personality Traits</span>
                <span className="text-white">{form.traits.length} selected</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-white/40">Voice Style</span>
                <span className="text-white capitalize">{form.voiceStyle}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-white/40">Social Accounts</span>
                <span className="text-white">{form.socials.filter(s => s.url).length} connected</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-white/40">LoRA Model</span>
                <span className="text-white">{form.lora ? "Custom" : "Default"}</span>
              </div>
            </div>
          </div>

          {/* Sample Content Preview */}
          {form.samplePrompts.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6">
              <h4 className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
                Sample Content Ideas
              </h4>
              <div className="space-y-2">
                {form.samplePrompts.slice(0, 3).map((prompt, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px] text-white/50">
                    <span className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderStepContent = () => {
    switch (currentStep) {
      case "welcome": return renderWelcome();
      case "identity": return renderIdentity();
      case "photos": return renderPhotos();
      case "personality": return renderPersonality();
      case "socials": return renderSocials();
      case "preview": return renderPreview();
      default: return renderWelcome();
    }
  };

  const stepLabels: Record<WizardStep, string> = {
    welcome: "Start",
    identity: "Identity",
    photos: "Photos",
    personality: "Personality",
    socials: "Socials",
    preview: "Review",
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <NotificationContainer />
      <InfluencersSidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Header with Progress */}
        {currentStep !== "welcome" && (
          <header className="relative z-10 h-20 border-b border-white/[0.05] bg-black/50 backdrop-blur-xl">
            <div className="h-full max-w-6xl mx-auto px-8 flex items-center justify-between">
              {/* Back Button */}
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-[14px]">Back</span>
              </button>

              {/* Progress Steps */}
              <div className="flex items-center gap-2">
                {steps.slice(1, -1).map((step, i) => {
                  const stepIndex = steps.indexOf(step);
                  const isActive = stepIndex === currentIndex;
                  const isCompleted = stepIndex < currentIndex;
                  
                  return (
                    <div key={step} className="flex items-center">
                      <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all
                        ${isActive 
                          ? "bg-white/[0.08] text-white" 
                          : isCompleted 
                            ? "text-emerald-400" 
                            : "text-white/20"
                        }
                      `}>
                        <div className={`
                          w-5 h-5 rounded-full flex items-center justify-center text-[10px]
                          ${isActive 
                            ? "bg-white text-black" 
                            : isCompleted 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "bg-white/[0.05]"
                          }
                        `}>
                          {isCompleted ? <Check size={12} /> : i + 1}
                        </div>
                        <span className="text-[12px] font-medium hidden sm:block">{stepLabels[step]}</span>
                      </div>
                      {i < steps.slice(1, -1).length - 1 && (
                        <div className={`
                          w-8 h-[2px] mx-2 transition-colors
                          ${isCompleted ? "bg-emerald-500/30" : "bg-white/[0.05]"}
                        `} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next/Create Button */}
              {currentStep === "preview" ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-[14px] hover:bg-white/90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Create AI</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-[14px] hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide">
          {renderStepContent()}
        </div>
      </main>
    </div>
  );
};
