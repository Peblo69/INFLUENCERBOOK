import { useRef, useEffect, useState, useCallback, memo } from "react";
import { streamMessageToGrok, type GrokAttachment } from "@/services/grokService";
import type { Message } from "../index";
import {
  Plus, Paperclip, Mic, Globe, ArrowUpRight, Settings,
  X, Infinity, ChevronDown, ThumbsUp, ThumbsDown, Copy, Check
} from "lucide-react";
import Lottie from "lottie-react";
import infinityAnimation from "@/assets/animations/infinity-loop.json";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSnapScroll } from "@/hooks/useSnapScroll";

// 3D ASCII Infinity Logo Component
const ASCIILogo = ({ className = "" }: { className?: string }) => (
  <pre 
    className={`font-mono text-[10px] md:text-xs leading-[0.9] tracking-tighter whitespace-pre select-none ${className}`}
    style={{ 
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    }}
  >
{`         ▄▄▄▄▄▄▄▄▄▄▄         
      ▄▄▀▀▀       ▀▀▄▄▄      
    ▄▀▀    ▄▄▄▄▄▄     ▀▄▄    
   ▄▀    ▄▀▀    ▀▀▄▄    ▀▄   
  ▐▌    ▐▌          ▀▄   ▐▌  
  ▐▌    ▐▌   ▄▄▄▄    ▐▌   ▐▌ 
  ▐▌    ▐▌  ▐▌   ▀▄▄▄▀   ▄▀  
  ▐▌    ▐▌  ▐▌          ▄▀   
   ▀▄   ▐▌   ▀▄▄▄▄▄▄▄▄▄▀▀    
    ▀▄▄  ▀▄▄       ▄▄▄▀▀     
      ▀▀▄▄ ▀▀▀▀▀▀▀▀          
         ▀▀▀▀▀▀▀▀▀▀▀         `}
  </pre>
);

const HERO_PHRASES = [
  "How can I help you?",
  "Ready to master AI?",
  "Build your empire.",
  "What will you create today?",
  "The future is synthetic.",
  "Let's make something incredible.",
  "Your vision, amplified.",
];

const RotatingPhrase = () => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");

  const advance = useCallback(() => {
    setPhase("out");
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % HERO_PHRASES.length);
      setPhase("in");
      setTimeout(() => setPhase("visible"), 50);
    }, 800);
  }, []);

  useEffect(() => {
    setPhase("visible");
    const interval = setInterval(advance, 3500);
    return () => clearInterval(interval);
  }, [advance]);

  return (
    <span
      className="transition-all duration-700 ease-out inline-block"
      style={{
        opacity: phase === "out" ? 0 : phase === "in" ? 0 : 1,
        transform: phase === "out" ? "translateY(-12px) scale(0.95)" : phase === "in" ? "translateY(12px) scale(0.95)" : "translateY(0) scale(1)",
        filter: phase === "visible" ? "blur(0px)" : "blur(6px)",
        textShadow: "0 0 30px rgba(255,255,255,0.2), 0 0 60px rgba(255,255,255,0.1)",
      }}
    >
      {HERO_PHRASES[index]}
    </span>
  );
};

interface ChatAreaProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string | null;
  ensureConversation: (firstMessage: string) => Promise<string>;
  onSaveMessage: (conversationId: string, message: Message) => Promise<void>;
  refreshConversations: () => Promise<void>;
  isStreamingRef: React.MutableRefObject<boolean>;
}

const ConfigModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<"general" | "model" | "memory" | "tools">("general");
  const [settings, setSettings] = useState({
    model: "grok-4-fast",
    temperature: 0.7,
    maxTokens: 4096,
    webSearch: true,
    memoryEnabled: true,
    autoSave: true,
    streamResponse: true,
    codeHighlight: true,
    imageGeneration: true,
    knowledgeBase: true,
    reasoningMode: false,
  });

  if (!isOpen) return null;

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "model", label: "Model", icon: Infinity },
    { id: "memory", label: "Memory", icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
    { id: "tools", label: "Tools", icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a7 7 0 10-14.8 0"/></svg> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Glass Background */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02]" />
        <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl" />
        <div className="absolute inset-0 rounded-3xl bg-black/50" />
        <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]" />
        
        {/* Content */}
        <div className="relative flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
            <div>
              <h2 className="text-lg font-semibold text-white/90">Assistant Settings</h2>
              <p className="text-xs text-white/40 mt-0.5">Configure your AI experience</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.04] overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive 
                      ? "bg-white/[0.08] text-white border border-white/[0.08]" 
                      : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Custom Instructions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">Custom Instructions</label>
                    <span className="text-xs text-white/30">Optional</span>
                  </div>
                  <textarea
                    className="w-full h-28 bg-black/30 border border-white/[0.06] rounded-xl p-4 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-black/40 resize-none transition-all duration-200"
                    placeholder="How should Kiara behave? For example: 'Be concise and direct', 'Always provide code examples', or 'Act as a creative director'..."
                  />
                  <p className="text-xs text-white/30">These instructions will be applied to every conversation</p>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ToggleSetting
                    label="Stream Responses"
                    description="Show AI responses in real-time"
                    checked={settings.streamResponse}
                    onChange={() => setSettings(s => ({ ...s, streamResponse: !s.streamResponse }))}
                  />
                  <ToggleSetting
                    label="Auto-Save Chats"
                    description="Automatically save conversations"
                    checked={settings.autoSave}
                    onChange={() => setSettings(s => ({ ...s, autoSave: !s.autoSave }))}
                  />
                  <ToggleSetting
                    label="Code Highlighting"
                    description="Syntax highlight code blocks"
                    checked={settings.codeHighlight}
                    onChange={() => setSettings(s => ({ ...s, codeHighlight: !s.codeHighlight }))}
                  />
                  <ToggleSetting
                    label="Knowledge Base"
                    description="Access internal knowledge"
                    checked={settings.knowledgeBase}
                    onChange={() => setSettings(s => ({ ...s, knowledgeBase: !s.knowledgeBase }))}
                  />
                </div>
              </div>
            )}

            {/* Model Tab */}
            {activeTab === "model" && (
              <div className="space-y-6">
                {/* Model Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white/80">AI Model</label>
                  <div className="space-y-2">
                    {[
                      { id: "grok-4-fast", name: "Grok 4 Fast", desc: "Fast responses, great for most tasks", tag: "Default" },
                      { id: "grok-4", name: "Grok 4", desc: "Best quality, slower responses", tag: "Pro" },
                      { id: "grok-reasoning", name: "Grok Reasoning", desc: "Step-by-step thinking for complex problems", tag: "Beta" },
                    ].map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSettings(s => ({ ...s, model: model.id }))}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                          settings.model === model.id
                            ? "bg-white/[0.06] border-white/20"
                            : "bg-transparent border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          settings.model === model.id ? "border-white" : "border-white/20"
                        }`}>
                          {settings.model === model.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white/90">{model.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-white/[0.06] text-white/50 rounded">{model.tag}</span>
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">{model.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-5">
                  <SliderSetting
                    label="Temperature"
                    value={settings.temperature}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={(v) => setSettings(s => ({ ...s, temperature: v }))}
                    description="Lower = more focused, Higher = more creative"
                  />
                  <SliderSetting
                    label="Max Tokens"
                    value={settings.maxTokens}
                    min={512}
                    max={8192}
                    step={512}
                    onChange={(v) => setSettings(s => ({ ...s, maxTokens: v }))}
                    description="Maximum response length"
                  />
                </div>

                {/* Reasoning Mode */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80">Reasoning Mode</span>
                        <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-300/70 rounded">Beta</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">Show step-by-step thinking process</p>
                    </div>
                    <Switch 
                      checked={settings.reasoningMode}
                      onChange={() => setSettings(s => ({ ...s, reasoningMode: !s.reasoningMode }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Memory Tab */}
            {activeTab === "memory" && (
              <div className="space-y-6">
                <ToggleSetting
                  label="Enable Memory"
                  description="Kiara remembers facts about you across conversations"
                  checked={settings.memoryEnabled}
                  onChange={() => setSettings(s => ({ ...s, memoryEnabled: !s.memoryEnabled }))}
                  large
                />

                {settings.memoryEnabled && (
                  <>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <h4 className="text-sm font-medium text-white/80 mb-2">What Kiara knows about you</h4>
                      <div className="space-y-2">
                        {[
                          "Prefers concise responses",
                          "Works with React/TypeScript",
                          "Interested in AI image generation",
                        ].map((fact, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-white/50">
                            <div className="w-1 h-1 rounded-full bg-white/30" />
                            <span>{fact}</span>
                          </div>
                        ))}
                      </div>
                      <button className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors">
                        Manage memories →
                      </button>
                    </div>

                    <button className="w-full py-3 rounded-xl border border-white/[0.06] text-sm text-white/50 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all duration-200">
                      Clear All Memories
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === "tools" && (
              <div className="space-y-4">
                <ToggleSetting
                  label="Web Search"
                  description="Allow Kiara to search the internet for current information"
                  checked={settings.webSearch}
                  onChange={() => setSettings(s => ({ ...s, webSearch: !s.webSearch }))}
                  large
                />
                <ToggleSetting
                  label="Image Generation"
                  description="Enable AI image creation with Kiara Vision"
                  checked={settings.imageGeneration}
                  onChange={() => setSettings(s => ({ ...s, imageGeneration: !s.imageGeneration }))}
                  large
                />
                <ToggleSetting
                  label="Code Interpreter"
                  description="Run and analyze code in conversations"
                  checked={true}
                  onChange={() => {}}
                  large
                  disabled
                />
                <ToggleSetting
                  label="File Analysis"
                  description="Upload and analyze documents, images, and files"
                  checked={true}
                  onChange={() => {}}
                  large
                  disabled
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04] bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white/90 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02]"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toggle Component
const ToggleSetting = ({ 
  label, 
  description, 
  checked, 
  onChange,
  large = false,
  disabled = false
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: () => void;
  large?: boolean;
  disabled?: boolean;
}) => (
  <div className={`flex items-start gap-4 ${large ? "p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]" : ""}`}>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className={`font-medium text-white/80 ${large ? "text-sm" : "text-sm"}`}>{label}</span>
        {disabled && <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-white/[0.06] text-white/40 rounded">Always On</span>}
      </div>
      <p className={`text-white/40 mt-0.5 ${large ? "text-xs" : "text-xs"}`}>{description}</p>
    </div>
    <Switch checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

// Switch Component
const Switch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
      checked ? "bg-white/20" : "bg-white/[0.06]"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-200 ${
      checked ? "left-6" : "left-1"
    }`} />
  </button>
);

// Slider Component
const SliderSetting = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange,
  description
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (value: number) => void;
  description: string;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/80">{label}</label>
        <span className="text-sm text-white/50 font-mono">{value}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-white/[0.06] rounded-full" />
        <div 
          className="absolute h-1.5 bg-white/20 rounded-full transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div 
          className="absolute w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-100 pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <p className="text-xs text-white/30">{description}</p>
    </div>
  );
};

const MessageActions = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnBase = "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200";
  const btnIdle = "text-zinc-600 hover:text-white hover:bg-white/10";
  const btnActive = "text-white bg-white/10";

  return (
    <div className="flex items-center gap-1 mt-1 pt-1 opacity-0 group-hover/msg:opacity-100 hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() => setLiked(liked === true ? null : true)}
        className={`${btnBase} ${liked === true ? btnActive : btnIdle}`}
      >
        <ThumbsUp size={13} />
      </button>
      <button
        onClick={() => setLiked(liked === false ? null : false)}
        className={`${btnBase} ${liked === false ? btnActive : btnIdle}`}
      >
        <ThumbsDown size={13} />
      </button>
      <button
        onClick={handleCopy}
        className={`${btnBase} ${copied ? btnActive : btnIdle}`}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
};

// ============================================================================
// Memoized assistant message — only re-renders when its own content changes
// ============================================================================
interface AssistantMessageProps {
  msg: Message;
  isStreaming: boolean;
  justFinished: boolean;
}

const AssistantMessageInner = ({ msg, isStreaming, justFinished }: AssistantMessageProps) => (
  <div className="flex flex-col items-start w-full min-w-0 group/msg">
    <div className="flex justify-center w-full mb-2">
      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
        <Infinity size={14} className="text-white/40" />
      </div>
    </div>
    <div className="w-full">
      <MarkdownRenderer content={msg.content || ""} isStreaming={isStreaming} />

      {/* Show loading dots only when starting and no content yet */}
      {isStreaming && !msg.content && (
        <div className="flex items-center gap-1.5 py-1">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:300ms]" />
        </div>
      )}

      {msg.images && msg.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-[520px] mt-2">
          {msg.images.map((url, idx) => (
            <div key={`${url}-${idx}`} className="aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/10">
              <img src={url} alt="Generated" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
    {msg.content && !isStreaming && (
      <MessageActions content={msg.content} />
    )}
    {justFinished && (
      <div className="flex justify-center w-full mt-2 animate-fade-in">
        <div className="w-8 h-8 opacity-60">
          <Lottie
            animationData={infinityAnimation}
            loop={false}
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    )}
  </div>
);

const AssistantMessage = memo(AssistantMessageInner, (prev, next) => {
  return (
    prev.msg.content === next.msg.content &&
    prev.isStreaming === next.isStreaming &&
    prev.justFinished === next.justFinished
  );
});
AssistantMessage.displayName = "AssistantMessage";

// ============================================================================

export const ChatArea = ({
  messages,
  setMessages,
  conversationId,
  ensureConversation,
  onSaveMessage,
  refreshConversations,
  isStreamingRef,
}: ChatAreaProps) => {
  const [showConfig, setShowConfig] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const [attachments, setAttachments] = useState<GrokAttachment[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [justFinishedId, setJustFinishedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // ResizeObserver-based auto-scroll
  const { scrollRef: setScrollNode, contentRef: setContentNode, snapToBottom } = useSnapScroll();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingContentRef = useRef<string>("");
  const currentStreamIdRef = useRef<string | null>(null);
  const renderIntervalRef = useRef<number | null>(null);
  const sendLockRef = useRef(false);

  // ── Render loop ──
  // Writes streamed content into the messages array at ~12fps.
  // Content always lives in msg.content — no separate state to sync.
  const startRenderLoop = useCallback(() => {
    if (renderIntervalRef.current) return;

    let lastRendered = "";
    let lastTime = 0;
    const INTERVAL = 60; // ~16fps — slightly faster for smoother feel

    const tick = (now: number) => {
      renderIntervalRef.current = requestAnimationFrame(tick);
      if (now - lastTime < INTERVAL) return;

      const current = streamingContentRef.current;
      if (current === lastRendered) return;

      lastTime = now;
      lastRendered = current;

      const streamId = currentStreamIdRef.current;
      if (!streamId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamId ? { ...msg, content: current } : msg
        )
      );
    };

    renderIntervalRef.current = requestAnimationFrame(tick);
  }, [setMessages]);

  const stopRenderLoop = useCallback(() => {
    if (renderIntervalRef.current) {
      cancelAnimationFrame(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
  }, []);

  // ── Flush: synchronously push whatever is in streamingContentRef into state ──
  // Called right before stopping the render loop on completion, so no content
  // is left in the ref but not yet rendered.
  const flushRenderLoop = useCallback(
    (streamId: string, finalContent: string) => {
      stopRenderLoop();
      // Synchronously write the FINAL content into messages.
      // This eliminates the gap where stale partial content was visible
      // while awaiting the DB save.
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamId ? { ...msg, content: finalContent } : msg
        )
      );
    },
    [setMessages, stopRenderLoop]
  );

  // Merge callback-ref from useSnapScroll with our local ref
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    setScrollNode(node);
  }, [setScrollNode]);

  // Scroll-to-bottom button (skip during streaming to avoid extra re-renders)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (currentStreamIdRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollButton(scrollHeight - clientHeight - scrollTop > 150);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Cleanup render loop on unmount
  useEffect(() => stopRenderLoop, [stopRenderLoop]);

  // Textarea auto-resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    if (sendLockRef.current) return;
    sendLockRef.current = true;

    const userContent = input;
    const userAttachments = [...attachments];

    setInput("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let activeConversationId: string;
    try {
      activeConversationId = await ensureConversation(userContent);
    } catch (error) {
      console.error("[ChatArea] Failed to create conversation:", error);
      sendLockRef.current = false;
      return;
    }

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: userContent,
      attachments: userAttachments,
    };

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setIsLoading(true);
    setStreamingMessageId(aiMsgId);
    isStreamingRef.current = true;
    snapToBottom();

    onSaveMessage(activeConversationId, userMsg).catch(console.error);

    streamingContentRef.current = "";
    currentStreamIdRef.current = aiMsgId;
    startRenderLoop();

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
    }));

    const finalPrompt = isReasoning ? `[REASONING MODE] ${userContent}` : userContent;

    await streamMessageToGrok(
      historyForApi,
      finalPrompt,
      userAttachments,
      {
        onToken: (token) => {
          if (currentStreamIdRef.current !== aiMsgId) return;
          streamingContentRef.current += token;
        },
        onComplete: async (fullText) => {
          if (currentStreamIdRef.current !== aiMsgId) return;

          const finalContent = fullText || streamingContentRef.current || "";

          // ─── CRITICAL FIX ───
          // 1. Flush final content into state IMMEDIATELY (synchronous).
          //    This replaces whatever partial content the render loop last wrote.
          //    Previously, stopRenderLoop() + await DB save created a visible gap
          //    where stale/partial content was displayed.
          flushRenderLoop(aiMsgId, finalContent);

          // 2. Clear streaming state in the SAME tick as the content update.
          //    React batches these setState calls, so the UI transitions from
          //    "streaming with partial content" → "done with full content"
          //    in a single render. No flash frame.
          setStreamingMessageId(null);
          setIsLoading(false);
          currentStreamIdRef.current = null;
          sendLockRef.current = false;
          isStreamingRef.current = false;

          // 3. Show completion animation
          setJustFinishedId(aiMsgId);
          setTimeout(() => setJustFinishedId(null), 2500);
          setTimeout(() => textareaRef.current?.focus(), 100);

          // 4. DB save happens AFTER UI is already correct — fire and forget.
          //    The user sees the complete response immediately regardless of
          //    network latency to Supabase.
          const finalAiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: finalContent,
          };

          onSaveMessage(activeConversationId, finalAiMsg)
            .then(() => refreshConversations())
            .catch((error) => {
              console.error("Failed to save AI message:", error);
            });
        },
        onError: (error) => {
          if (currentStreamIdRef.current !== aiMsgId) return;
          stopRenderLoop();
          console.error("Stream error:", error);
          const partialContent = streamingContentRef.current;
          const errorMessage = partialContent
            ? `${partialContent}\n\nError: ${error.message}`
            : `Error: ${error.message}. Please try again.`;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: errorMessage }
                : msg
            )
          );
          setIsLoading(false);
          setStreamingMessageId(null);
          currentStreamIdRef.current = null;
          sendLockRef.current = false;
          isStreamingRef.current = false;
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = (e.target?.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, data: base64String, mimeType: file.type, file }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  return (
    <div data-no-translate="true" className="flex-1 flex flex-col h-full bg-black relative font-sans overflow-hidden selection:bg-white/20 selection:text-white">

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 relative z-0 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center select-none">
            <div className="flex flex-col items-center gap-8 pb-20">
              {/* 3D ASCII Infinity Logo */}
              <div className="relative">
                {/* Glow layers */}
                <div className="absolute inset-0 blur-3xl opacity-30">
                  <ASCIILogo className="text-white/40" />
                </div>
                <div className="absolute inset-0 blur-xl opacity-50">
                  <ASCIILogo className="text-white/60" />
                </div>
                {/* Main logo with 3D shadow effect */}
                <div 
                  className="relative"
                  style={{
                    textShadow: `
                      0 0 20px rgba(255,255,255,0.3),
                      0 0 40px rgba(255,255,255,0.2),
                      0 0 60px rgba(255,255,255,0.1),
                      0 4px 8px rgba(0,0,0,0.5),
                      0 8px 16px rgba(0,0,0,0.4),
                      0 16px 32px rgba(0,0,0,0.3)
                    `,
                  }}
                >
                  <ASCIILogo className="text-white/90" />
                </div>
              </div>
              
              {/* Brand Name with 3D styling */}
              <div className="text-center space-y-3">
                <h1 
                  className="text-3xl md:text-5xl font-bold tracking-tight"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 20px rgba(255,255,255,0.1)',
                  }}
                >
                  AI Influencerbook
                </h1>
                
                {/* Rotating phrase */}
                <div 
                  className="text-lg md:text-xl text-white/60 font-light tracking-wide"
                  style={{
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  <RotatingPhrase />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={setContentNode} className="max-w-3xl mx-auto space-y-6 pb-52 pt-10 px-6">
            {messages.map((msg) => {
              const isActiveStream = streamingMessageId === msg.id;

              return (
              <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <AssistantMessage
                    msg={msg}
                    isStreaming={isActiveStream}
                    justFinished={justFinishedId === msg.id}
                  />
                )}
                {msg.role === "user" && (
                  <div className="max-w-[85%] flex flex-col items-end gap-2">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end mb-1">
                        {msg.attachments.map((att) => (
                          <div key={att.id} className="w-48 h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg relative group">
                            <img src={`data:${att.mimeType};base64,${att.data}`} alt="Upload" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-[#2f2f2f] text-white px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-3">
        {showScrollButton && messages.length > 0 && (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => { snapToBottom(); setShowScrollButton(false); }}
              className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-full p-1.5 transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Scroll to bottom"
            >
              <ChevronDown size={14} className="text-white/60 hover:text-white transition-colors" />
            </button>
          </div>
        )}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="relative group">
            {/* Attachment Previews - Glass Cards */}
            {attachments.length > 0 && (
              <div className="absolute bottom-full left-0 mb-4 flex gap-3 px-1 overflow-x-auto w-full pb-2 scrollbar-hide">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group/att flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer ring-1 ring-white/10 backdrop-blur-md bg-black/40">
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover opacity-90 group-hover/att:opacity-100 transition-all duration-300 scale-105 group-hover/att:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-all duration-200 hover:bg-red-500/80 hover:border-red-400/50 hover:scale-110">
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Main Glass Input Container */}
            <div className="relative">
              {/* Animated gradient border glow */}
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
              
              {/* Glass container */}
              <div className="relative rounded-3xl overflow-hidden">
                {/* Background layers */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-white/[0.02]" />
                <div className="absolute inset-0 backdrop-blur-xl" />
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Border */}
                <div className="absolute inset-0 rounded-3xl border border-white/[0.08] group-focus-within:border-white/[0.15] transition-colors duration-300" />
                
                {/* Inner shadow for depth */}
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                
                {/* Content */}
                <div className="relative p-1">
                  {/* Textarea */}
                  <textarea 
                    ref={textareaRef} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Ask Kiara anything..." 
                    rows={1} 
                    className="w-full bg-transparent text-white/90 text-[15px] px-4 py-4 outline-none placeholder:text-white/30 placeholder:font-light resize-none overflow-y-auto scrollbar-hide leading-relaxed"
                    style={{ minHeight: "56px", maxHeight: "200px" }} 
                    autoFocus 
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-2 pb-2">
                    {/* Left Tools */}
                    <div className="flex items-center gap-1">
                      {([
                        { id: "plus", icon: Plus, label: "Tools", color: "from-purple-400 to-pink-400", action: () => setActiveTool(activeTool === "plus" ? null : "plus") },
                        { id: "attach", icon: Paperclip, label: "Attach", color: "from-blue-400 to-cyan-400", action: () => { fileInputRef.current?.click(); } },
                        { id: "mic", icon: Mic, label: "Voice", color: "from-emerald-400 to-teal-400", action: () => setActiveTool(activeTool === "mic" ? null : "mic") },
                        { id: "web", icon: Globe, label: "Web", color: "from-orange-400 to-amber-400", action: () => setActiveTool(activeTool === "web" ? null : "web") },
                      ] as const).map(({ id, icon: Icon, label, color, action }) => {
                        const isOn = activeTool === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={action}
                            className="group/btn relative"
                          >
                            {/* Subtle indicator when active */}
                            {isOn && (
                              <div className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/20" />
                            )}
                            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isOn ? "text-white/90" : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"}`}>
                              <Icon size={17} strokeWidth={1.5} />
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                              {label}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                      {/* Settings */}
                      <button 
                        type="button" 
                        onClick={() => setShowConfig(true)} 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 group/cfg"
                      >
                        <Settings size={17} strokeWidth={1.5} className="transition-transform duration-700 ease-out group-hover/cfg:rotate-90" />
                      </button>
                      
                      {/* Send Button - Soft Elegant Style */}
                      <button 
                        type="submit" 
                        disabled={(!input.trim() && attachments.length === 0) || isLoading}
                        className="group/send relative disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {/* Soft glow effect - only when has content */}
                        <div className={`absolute inset-0 rounded-xl bg-white/20 blur-md transition-opacity duration-300 ${input.trim() || attachments.length > 0 ? "opacity-0 group-hover/send:opacity-100" : "opacity-0"}`} />
                        
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${input.trim() || attachments.length > 0 ? "bg-white/[0.08] border-white/20 text-white/90 group-hover/send:bg-white/[0.15] group-hover/send:border-white/30 group-hover/send:text-white group-hover/send:scale-105" : "bg-transparent border-white/[0.06] text-white/20"}`}>
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                          ) : (
                            <ArrowUpRight size={18} strokeWidth={2} className="transition-transform duration-300 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer Text */}
            <div className="text-center mt-3">
              <p className="text-[10px] text-white/20 font-light tracking-[0.3em] uppercase hover:text-white/40 transition-colors duration-300 cursor-default">
                Kiara Intelligence
              </p>
            </div>
          </form>
        </div>
      </div>

      <ConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
};
