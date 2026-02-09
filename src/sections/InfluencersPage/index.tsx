import { useState, useRef } from "react";
import { InfluencersSidebar } from "./components/InfluencersSidebar";
import { Plus, X, Upload, Sparkles, ChevronRight, Check, Instagram, Twitter } from "lucide-react";

// Social Platform Icons (Custom SVGs)
const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const ThreadsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 1.986-.013 3.758-.4 5.267-1.15l.75 1.893c-1.75.864-3.824 1.34-6.018 1.376z"/>
    <path d="M17.735 9.2c-.733-.8-1.79-1.272-2.974-1.327-2.417-.117-3.93 1.091-4.387 3.413-.224 1.13-.122 2.33.29 3.39.626 1.61 1.868 2.55 3.49 2.643 1.385.078 2.482-.417 3.188-1.437.514-.745.783-1.663.783-2.73 0-.1-.004-.2-.012-.296l.025-4.138h2.063l-.026 4.176c-.001 1.468-.407 2.744-1.206 3.792-1.016 1.34-2.558 2.077-4.457 2.149-2.335.113-4.16-.978-5.1-3.03-.54-1.303-.673-2.874-.38-4.416.47-2.393 1.883-3.97 4.227-4.48.514-.105 1.06-.16 1.623-.16 1.916 0 3.488.67 4.583 1.86l-1.735 1.592z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.327.327 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface SocialLink {
  platform: string;
  url: string;
}

interface ModelForm {
  name: string;
  lora: string;
  images: string[];
  socials: SocialLink[];
}

const EXAMPLE_IMAGES = [
  { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=250&fit=crop", style: { top: "5%", left: "10%", transform: "rotate(-8deg)" } },
  { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&h=220&fit=crop", style: { top: "2%", right: "15%", transform: "rotate(6deg)" } },
  { src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=190&h=240&fit=crop", style: { top: "15%", left: "25%", transform: "rotate(3deg)" } },
  { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=170&h=210&fit=crop", style: { top: "8%", right: "28%", transform: "rotate(-5deg)" } },
  { src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=260&fit=crop", style: { top: "20%", left: "50%", transform: "translateX(-50%) rotate(-2deg)" } },
];

const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: <Instagram size={20} />, placeholder: "@username" },
  { id: "tiktok", name: "TikTok", icon: <TikTokIcon />, placeholder: "@username" },
  { id: "twitter", name: "X / Twitter", icon: <XIcon />, placeholder: "@username" },
  { id: "youtube", name: "YouTube", icon: <YouTubeIcon />, placeholder: "channel URL" },
  { id: "threads", name: "Threads", icon: <ThreadsIcon />, placeholder: "@username" },
  { id: "telegram", name: "Telegram", icon: <TelegramIcon />, placeholder: "@username or URL" },
  { id: "reddit", name: "Reddit", icon: <RedditIcon />, placeholder: "u/username" },
];

export const InfluencersPage = () => {
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [form, setForm] = useState<ModelForm>({
    name: "",
    lora: "",
    images: [],
    socials: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && form.images.length < 5) {
          setForm(prev => ({ ...prev, images: [...prev.images, event.target!.result as string] }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const updateSocial = (platform: string, url: string) => {
    setForm(prev => ({
      ...prev,
      socials: prev.socials.some(s => s.platform === platform)
        ? prev.socials.map(s => s.platform === platform ? { ...s, url } : s)
        : [...prev.socials, { platform, url }]
    }));
  };

  const getSocialValue = (platform: string) => {
    return form.socials.find(s => s.platform === platform)?.url || "";
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <InfluencersSidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-full relative overflow-hidden">
        {step === "intro" ? (
          /* Intro View */
          <div className="h-full flex flex-col items-center justify-center relative">
            {/* Floating Example Images */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {EXAMPLE_IMAGES.map((img, i) => (
                <div
                  key={i}
                  className="absolute rounded-xl overflow-hidden shadow-2xl border border-white/10 animate-float"
                  style={{
                    ...img.style,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${6 + i}s`,
                  }}
                >
                  <img
                    src={img.src}
                    alt={`Example ${i + 1}`}
                    className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ))}
            </div>

            {/* Center Container */}
            <div className="relative z-10 max-w-md w-full mx-4">
              {/* Glass Card */}
              <div className="relative rounded-3xl overflow-hidden">
                {/* Background layers */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-white/[0.02]" />
                <div className="absolute inset-0 backdrop-blur-2xl" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />

                {/* Content */}
                <div className="relative p-8 text-center">
                  {/* Sparkle Icon */}
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                    <Sparkles size={28} className="text-white/70" />
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-semibold text-white/90 mb-3">
                    Create Your AI Model
                  </h1>

                  {/* Description */}
                  <p className="text-[14px] text-white/50 leading-relaxed mb-2">
                    Upload your character and unlock the power of personalized AI generation.
                  </p>
                  <p className="text-[13px] text-white/40 leading-relaxed mb-8">
                    Add reference images, social links, and details so our AI assistant knows exactly how to generate your model autonomously.
                  </p>

                  {/* Start Button */}
                  <button
                    onClick={() => setStep("form")}
                    className="group relative w-full h-12 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {/* Button gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white to-white/90" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-black font-semibold text-[15px]">Start Creating</span>
                      <ChevronRight size={18} className="text-black/70 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Subtext */}
                  <p className="text-[11px] text-white/30 mt-4">
                    Free to use • 5 images required
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Form View */
          <div className="h-full overflow-y-auto scrollbar-hide">
            <div className="max-w-2xl mx-auto px-6 py-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-semibold text-white/90">Register AI Model</h2>
                  <p className="text-[13px] text-white/40 mt-1">Fill in the details for your character</p>
                </div>
                <button
                  onClick={() => setStep("intro")}
                  className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Model Name */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
                  <div className="relative p-5">
                    <label className="text-[11px] font-medium text-white/50 uppercase tracking-[0.12em] mb-3 block">
                      Model Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your model's name..."
                      className="w-full h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-white/80 placeholder:text-white/25 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
                    />
                  </div>
                </div>

                {/* Reference Images */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
                  <div className="relative p-5">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[11px] font-medium text-white/50 uppercase tracking-[0.12em]">
                        Reference Images *
                      </label>
                      <span className={`text-[11px] font-medium ${form.images.length === 5 ? 'text-emerald-400/70' : 'text-white/30'}`}>
                        {form.images.length}/5 uploaded
                      </span>
                    </div>

                    {/* Image Grid */}
                    <div className="grid grid-cols-5 gap-3">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index}>
                          {form.images[index] ? (
                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.1] group">
                              <img
                                src={form.images[index]}
                                alt={`Reference ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90"
                              >
                                <X size={12} />
                              </button>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center gap-2 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus size={16} className="text-white/40" />
                              </div>
                              <span className="text-[10px] text-white/30">Add</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <p className="text-[11px] text-white/30 mt-3">
                      Upload 5 clear images showing different angles of your model
                    </p>
                  </div>
                </div>

                {/* LoRA (Optional) */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
                  <div className="relative p-5">
                    <label className="text-[11px] font-medium text-white/50 uppercase tracking-[0.12em] mb-3 block">
                      LoRA Model <span className="text-white/25 normal-case">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.lora}
                      onChange={(e) => setForm(prev => ({ ...prev, lora: e.target.value }))}
                      placeholder="Paste LoRA link or identifier..."
                      className="w-full h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-white/80 placeholder:text-white/25 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
                    />
                    <p className="text-[11px] text-white/30 mt-2">
                      If you have a trained LoRA for this model, add it here for better results
                    </p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
                  <div className="relative p-5">
                    <label className="text-[11px] font-medium text-white/50 uppercase tracking-[0.12em] mb-4 block">
                      Social Links
                    </label>

                    <div className="space-y-3">
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <div key={platform.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 flex-shrink-0">
                            {platform.icon}
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={getSocialValue(platform.id)}
                              onChange={(e) => updateSocial(platform.id, e.target.value)}
                              placeholder={platform.placeholder}
                              className="w-full h-10 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white/70 placeholder:text-white/20 outline-none transition-all focus:border-white/[0.12] focus:bg-white/[0.05]"
                            />
                          </div>
                          {getSocialValue(platform.id) && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                              <Check size={12} className="text-emerald-400/80" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  disabled={!form.name || form.images.length < 5}
                  className="w-full h-14 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  <span>Create AI Model</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(var(--rotation, 0deg));
          }
          50% {
            transform: translateY(-15px) rotate(var(--rotation, 0deg));
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
