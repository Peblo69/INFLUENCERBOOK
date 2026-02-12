import { useRef, useEffect, useState, useCallback, memo } from "react";
import {
  streamMessageToGrok,
  sendMessageToGrok,
  type GrokAttachment,
  type GrokMemoryTelemetry,
} from "@/services/grokService";
import { supabase } from "@/lib/supabase";
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
  onStreamSettled: () => void;
}

type AssistantRuntimeSettings = {
  model: string;
  temperature: number;
  maxTokens: number;
  webSearchEnabled: boolean;
  knowledgeBaseEnabled: boolean;
  customInstructions: string;
  streamResponse: boolean;
  memoryEnabled: boolean;
  reasoningMode: boolean;
  memoryDebug: boolean;
};

const NON_THINKING_MODEL = "grok-4";

const normalizeAssistantModel = (value: unknown): string => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return NON_THINKING_MODEL;
  if (raw.includes("reason")) return NON_THINKING_MODEL;
  if (raw === "grok-4.1" || raw === "grok-4-1") return NON_THINKING_MODEL;
  if (raw === "grok-4-fast") return NON_THINKING_MODEL;
  return raw.startsWith("grok-4") ? NON_THINKING_MODEL : NON_THINKING_MODEL;
};

const DEFAULT_ASSISTANT_SETTINGS: AssistantRuntimeSettings = {
  model: NON_THINKING_MODEL,
  temperature: 0.7,
  maxTokens: 4096,
  webSearchEnabled: false,
  knowledgeBaseEnabled: true,
  customInstructions: "",
  streamResponse: true,
  memoryEnabled: true,
  reasoningMode: false,
  memoryDebug: true,
};

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantRuntimeSettings;
  onSave: (next: AssistantRuntimeSettings) => Promise<void>;
  saving: boolean;
}

const ConfigModal = ({ isOpen, onClose, settings, onSave, saving }: ConfigModalProps) => {
  const [activeTab, setActiveTab] = useState<"general" | "model" | "memory" | "tools">("general");
  const [draft, setDraft] = useState({
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    webSearch: settings.webSearchEnabled,
    memoryEnabled: settings.memoryEnabled,
    autoSave: true,
    streamResponse: settings.streamResponse,
    customInstructions: settings.customInstructions,
    codeHighlight: true,
    imageGeneration: true,
    knowledgeBase: settings.knowledgeBaseEnabled,
    reasoningMode: settings.reasoningMode,
    memoryDebug: settings.memoryDebug,
  });

  useEffect(() => {
    if (!isOpen) return;
    setDraft((prev) => ({
      ...prev,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      webSearch: settings.webSearchEnabled,
      streamResponse: settings.streamResponse,
      customInstructions: settings.customInstructions,
      knowledgeBase: settings.knowledgeBaseEnabled,
      memoryEnabled: settings.memoryEnabled,
      reasoningMode: settings.reasoningMode,
      memoryDebug: settings.memoryDebug,
    }));
  }, [isOpen, settings]);

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
                    value={draft.customInstructions}
                    onChange={(e) => setDraft((s) => ({ ...s, customInstructions: e.target.value }))}
                  />
                  <p className="text-xs text-white/30">These instructions will be applied to every conversation</p>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ToggleSetting
                    label="Stream Responses"
                    description="Show AI responses in real-time"
                    checked={draft.streamResponse}
                    onChange={() => setDraft(s => ({ ...s, streamResponse: !s.streamResponse }))}
                  />
                  <ToggleSetting
                    label="Auto-Save Chats"
                    description="Automatically save conversations"
                    checked={draft.autoSave}
                    onChange={() => setDraft(s => ({ ...s, autoSave: !s.autoSave }))}
                  />
                  <ToggleSetting
                    label="Code Highlighting"
                    description="Syntax highlight code blocks"
                    checked={draft.codeHighlight}
                    onChange={() => setDraft(s => ({ ...s, codeHighlight: !s.codeHighlight }))}
                  />
                  <ToggleSetting
                    label="Knowledge Base"
                    description="Access internal knowledge"
                    checked={draft.knowledgeBase}
                    onChange={() => setDraft(s => ({ ...s, knowledgeBase: !s.knowledgeBase }))}
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
                      { id: "grok-4", name: "Grok 4.1", desc: "Non-thinking mode for faster direct replies", tag: "Default" },
                    ].map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setDraft(s => ({ ...s, model: model.id }))}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                          draft.model === model.id
                            ? "bg-white/[0.06] border-white/20"
                            : "bg-transparent border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          draft.model === model.id ? "border-white" : "border-white/20"
                        }`}>
                          {draft.model === model.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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
                    value={draft.temperature}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={(v) => setDraft(s => ({ ...s, temperature: v }))}
                    description="Lower = more focused, Higher = more creative"
                  />
                  <SliderSetting
                    label="Max Tokens"
                    value={draft.maxTokens}
                    min={512}
                    max={8192}
                    step={512}
                    onChange={(v) => setDraft(s => ({ ...s, maxTokens: v }))}
                    description="Maximum response length"
                  />
                </div>

                {/* Reasoning Mode */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80">Reasoning Mode</span>
                        <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300/70 rounded">Disabled</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">Locked off to keep responses fast and non-thinking on Grok 4.1</p>
                    </div>
                    <Switch 
                      checked={false}
                      onChange={() => {}}
                      disabled
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
                  checked={draft.memoryEnabled}
                  onChange={() => setDraft(s => ({ ...s, memoryEnabled: !s.memoryEnabled }))}
                  large
                />

                {draft.memoryEnabled && (
                  <>
                    <ToggleSetting
                      label="Memory Debug Telemetry"
                      description="Show retrieval strategy, confidence, and reasons in chat"
                      checked={draft.memoryDebug}
                      onChange={() => setDraft(s => ({ ...s, memoryDebug: !s.memoryDebug }))}
                      large
                    />

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
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = "/memories";
                        }}
                        className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors"
                      >
                        Manage memories →
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = "/memories";
                      }}
                      className="w-full py-3 rounded-xl border border-white/[0.06] text-sm text-white/50 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all duration-200"
                    >
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
                  checked={draft.webSearch}
                  onChange={() => setDraft(s => ({ ...s, webSearch: !s.webSearch }))}
                  large
                />
                <ToggleSetting
                  label="Image Generation"
                  description="Enable AI image creation with Kiara Vision"
                  checked={draft.imageGeneration}
                  onChange={() => setDraft(s => ({ ...s, imageGeneration: !s.imageGeneration }))}
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
              onClick={async () => {
                try {
                  await onSave({
                    model: normalizeAssistantModel(draft.model),
                    temperature: draft.temperature,
                    maxTokens: draft.maxTokens,
                    webSearchEnabled: draft.webSearch,
                    knowledgeBaseEnabled: draft.knowledgeBase,
                    customInstructions: draft.customInstructions,
                    streamResponse: draft.streamResponse,
                    memoryEnabled: draft.memoryEnabled,
                    reasoningMode: false,
                    memoryDebug: draft.memoryDebug,
                  });
                  onClose();
                } catch (error) {
                  console.error("[ConfigModal] Failed to save settings:", error);
                }
              }}
              disabled={saving}
              className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white/90 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02]"
            >
              {saving ? "Saving..." : "Save Settings"}
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

      {/* Thinking indicator — shimmer text with mini infinity SVG */}
      {isStreaming && !msg.content && (
        <div className="flex items-center gap-2 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="18" height="18" style={{ display: "block", flexShrink: 0 }}>
            <g><path style={{ transform: "scale(0.8)", transformOrigin: "50px 50px" }} strokeLinecap="round" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" strokeDasharray="174.48 82.11" strokeWidth="7" stroke="rgba(255,255,255,0.5)" fill="none"><animate values="0;256.59" keyTimes="0;1" dur="1.1s" repeatCount="indefinite" attributeName="stroke-dashoffset" /></path></g>
          </svg>
          <span className="thinking-shimmer text-[13px] font-medium tracking-wide">
            Thinking...
          </span>
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
  onStreamSettled,
}: ChatAreaProps) => {
  const [showConfig, setShowConfig] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assistantSettings, setAssistantSettings] = useState<AssistantRuntimeSettings>(DEFAULT_ASSISTANT_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [attachments, setAttachments] = useState<GrokAttachment[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [justFinishedId, setJustFinishedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [memoryTelemetry, setMemoryTelemetry] = useState<GrokMemoryTelemetry | null>(null);
  const [showMemoryDebug, setShowMemoryDebug] = useState(false);

  // ResizeObserver-based auto-scroll
  const { scrollRef: setScrollNode, contentRef: setContentNode, snapToBottom } = useSnapScroll();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingContentRef = useRef<string>("");
  const currentStreamIdRef = useRef<string | null>(null);
  const renderIntervalRef = useRef<number | null>(null);
  const sendLockRef = useRef(false);

  useEffect(() => {
    const loadAssistantSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle();

        if (error || !data?.preferences) return;
        const prefs = data.preferences as Record<string, any>;
        const ai = (prefs.ai_settings ?? {}) as Record<string, any>;

        setAssistantSettings((prev) => ({
          model: normalizeAssistantModel(typeof ai.model === "string" ? ai.model : prev.model),
          temperature: typeof ai.temperature === "number" ? ai.temperature : prev.temperature,
          maxTokens: typeof ai.max_tokens === "number" ? ai.max_tokens : prev.maxTokens,
          webSearchEnabled: typeof ai.web_search_enabled === "boolean" ? ai.web_search_enabled : prev.webSearchEnabled,
          knowledgeBaseEnabled: typeof ai.knowledge_base_enabled === "boolean" ? ai.knowledge_base_enabled : prev.knowledgeBaseEnabled,
          customInstructions: typeof ai.custom_instructions === "string" ? ai.custom_instructions : prev.customInstructions,
          streamResponse: typeof ai.stream_response === "boolean" ? ai.stream_response : prev.streamResponse,
          reasoningMode: false,
          memoryDebug: typeof ai.memory_debug === "boolean" ? ai.memory_debug : prev.memoryDebug,
          memoryEnabled: typeof prefs.memory_enabled === "boolean" ? prefs.memory_enabled : prev.memoryEnabled,
        }));
      } catch (error) {
        console.warn("[ChatArea] Failed to load assistant settings:", error);
      }
    };

    loadAssistantSettings();
  }, []);

  const saveAssistantSettings = useCallback(async (next: AssistantRuntimeSettings) => {
    setSettingsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const currentPreferences = (profile?.preferences ?? {}) as Record<string, any>;
      const nextPreferences = {
        ...currentPreferences,
        memory_enabled: next.memoryEnabled,
        ai_settings: {
          ...(currentPreferences.ai_settings ?? {}),
          model: normalizeAssistantModel(next.model),
          temperature: next.temperature,
          max_tokens: next.maxTokens,
          web_search_enabled: next.webSearchEnabled,
          knowledge_base_enabled: next.knowledgeBaseEnabled,
          custom_instructions: next.customInstructions,
          stream_response: next.streamResponse,
          reasoning_mode: false,
          memory_debug: next.memoryDebug,
          updated_at: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ preferences: nextPreferences })
        .eq("id", user.id);

      if (updateError) throw updateError;
      setAssistantSettings({
        ...next,
        model: normalizeAssistantModel(next.model),
        reasoningMode: false,
      });
    } finally {
      setSettingsSaving(false);
    }
  }, []);

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
    const forceWebSearchThisTurn = activeTool === "web";
    if (forceWebSearchThisTurn) {
      // Treat web lookup as a one-shot action to avoid accidentally forcing slow
      // web-search mode on every subsequent message.
      setActiveTool(null);
    }

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
    setMemoryTelemetry(null);
    isStreamingRef.current = true;
    snapToBottom();

    onSaveMessage(activeConversationId, userMsg).catch(console.error);

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
    }));

    const finalPrompt = userContent;
    const shouldUseWebSearch =
      forceWebSearchThisTurn
        ? true
        : assistantSettings.webSearchEnabled
          ? undefined
          : false;
    const grokOptions = {
      conversationId: activeConversationId,
      model: normalizeAssistantModel(assistantSettings.model),
      temperature: assistantSettings.temperature,
      maxTokens: assistantSettings.maxTokens,
      memoryEnabled: assistantSettings.memoryEnabled,
      memoryDebug: assistantSettings.memoryDebug,
      webSearchEnabled: shouldUseWebSearch,
      knowledgeBaseEnabled: assistantSettings.knowledgeBaseEnabled,
      customInstructions: assistantSettings.customInstructions,
    };
    let streamFallbackAttempted = false;

    const finalizeStreamFailure = (message: string, partialContent: string) => {
      const errorMessage = partialContent
        ? `${partialContent}\n\nError: ${message}`
        : `Error: ${message}. Please try again.`;

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
      onStreamSettled();
    };

    const tryNonStreamingFallback = async (sourceError: Error) => {
      const partialContent = streamingContentRef.current;
      if (streamFallbackAttempted) {
        finalizeStreamFailure(sourceError.message, partialContent);
        return;
      }

      streamFallbackAttempted = true;
      setStreamingMessageId(null);
      currentStreamIdRef.current = null;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
              ...msg,
              content: partialContent
                ? `${partialContent}\n\nConnection issue detected. Retrying once...`
                : "Connection issue detected. Retrying once...",
            }
            : msg
        )
      );

      try {
        const fallbackResult = await sendMessageToGrok(
          historyForApi,
          finalPrompt,
          userAttachments,
          {
            ...grokOptions,
            webSearchEnabled: false,
          }
        );

        const finalContent = fallbackResult.text || "";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                ...msg,
                content: finalContent,
                images: fallbackResult.images && fallbackResult.images.length > 0 ? fallbackResult.images : undefined,
              }
              : msg
          )
        );

        const finalAiMsg: Message = {
          id: aiMsgId,
          role: "assistant",
          content: finalContent,
          images: fallbackResult.images && fallbackResult.images.length > 0 ? fallbackResult.images : undefined,
        };

        onSaveMessage(activeConversationId, finalAiMsg)
          .then(() => refreshConversations())
          .catch((saveError) => {
            console.error("Failed to save fallback AI message:", saveError);
          });
        setJustFinishedId(aiMsgId);
        setTimeout(() => setJustFinishedId(null), 2500);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        finalizeStreamFailure(fallbackMessage, partialContent);
        return;
      }

      setIsLoading(false);
      sendLockRef.current = false;
      isStreamingRef.current = false;
      onStreamSettled();
      setTimeout(() => textareaRef.current?.focus(), 100);
    };

    if (assistantSettings.streamResponse) {
      streamingContentRef.current = "";
      currentStreamIdRef.current = aiMsgId;
      startRenderLoop();

      try {
        await streamMessageToGrok(
          historyForApi,
          finalPrompt,
          userAttachments,
          {
            onToken: (token) => {
              if (currentStreamIdRef.current !== aiMsgId) return;
              streamingContentRef.current += token;
            },
            onMeta: (meta) => {
              if (meta.memory) {
                setMemoryTelemetry(meta.memory);
              }
            },
            onComplete: async (fullText, images) => {
              if (currentStreamIdRef.current !== aiMsgId) return;

              const finalContent = fullText || streamingContentRef.current || "";
              flushRenderLoop(aiMsgId, finalContent);
              setStreamingMessageId(null);
              setIsLoading(false);
              currentStreamIdRef.current = null;
              sendLockRef.current = false;
              isStreamingRef.current = false;
              setJustFinishedId(aiMsgId);
              setTimeout(() => setJustFinishedId(null), 2500);
              setTimeout(() => textareaRef.current?.focus(), 100);
              onStreamSettled();

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, content: finalContent, images: images && images.length > 0 ? images : msg.images }
                    : msg
                )
              );

              const finalAiMsg: Message = {
                id: aiMsgId,
                role: "assistant",
                content: finalContent,
                images: images && images.length > 0 ? images : undefined,
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
              void tryNonStreamingFallback(error);
            },
          },
          grokOptions
        );
      } catch (error) {
        stopRenderLoop();
        const streamError = error instanceof Error ? error : new Error(String(error));
        await tryNonStreamingFallback(streamError);
      }
      return;
    }

    stopRenderLoop();
    currentStreamIdRef.current = null;
    streamingContentRef.current = "";

    try {
      const result = await sendMessageToGrok(
        historyForApi,
        finalPrompt,
        userAttachments,
        grokOptions
      );

      const finalContent = result.text || "";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
              ...msg,
              content: finalContent,
              images: result.images && result.images.length > 0 ? result.images : undefined,
            }
            : msg
        )
      );

      const finalAiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: finalContent,
        images: result.images && result.images.length > 0 ? result.images : undefined,
      };

      onSaveMessage(activeConversationId, finalAiMsg)
        .then(() => refreshConversations())
        .catch((error) => {
          console.error("Failed to save AI message:", error);
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: `Error: ${message}. Please try again.` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      currentStreamIdRef.current = null;
      sendLockRef.current = false;
      isStreamingRef.current = false;
      onStreamSettled();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
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
            <div className="flex flex-col items-center gap-5 pb-32">
              {/* Animated Infinity SVG with Soft Gradient */}
              <div className="relative">
                {/* Soft glow layer */}
                <div className="absolute inset-0 blur-3xl opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="110" height="110" style={{ display: "block" }}>
                    <defs>
                      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#f9a8d4" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                    <g><path style={{ transform: "scale(0.8)", transformOrigin: "50px 50px" }} strokeLinecap="round" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" strokeDasharray="174.48 82.11" strokeWidth="10" stroke="url(#glowGrad)" fill="none"><animate values="0;256.59" keyTimes="0;1" dur="1.1s" repeatCount="indefinite" attributeName="stroke-dashoffset" /></path></g>
                  </svg>
                </div>
                {/* Main infinity with soft gradient */}
                <div className="relative" style={{ filter: "drop-shadow(0 0 30px rgba(147,197,253,0.25)) drop-shadow(0 0 50px rgba(249,168,212,0.2))" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="110" height="110" style={{ display: "block" }}>
                    <defs>
                      <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#93c5fd">
                          <animate attributeName="stop-color" values="#93c5fd;#c4b5fd;#f9a8d4;#67e8f9;#93c5fd" dur="4s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stopColor="#f9a8d4">
                          <animate attributeName="stop-color" values="#f9a8d4;#67e8f9;#93c5fd;#c4b5fd;#f9a8d4" dur="4s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#67e8f9">
                          <animate attributeName="stop-color" values="#67e8f9;#93c5fd;#c4b5fd;#f9a8d4;#67e8f9" dur="4s" repeatCount="indefinite" />
                        </stop>
                      </linearGradient>
                    </defs>
                    <g><path style={{ transform: "scale(0.8)", transformOrigin: "50px 50px" }} strokeLinecap="round" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" strokeDasharray="174.48 82.11" strokeWidth="9" stroke="url(#infinityGrad)" fill="none"><animate values="0;256.59" keyTimes="0;1" dur="1.1s" repeatCount="indefinite" attributeName="stroke-dashoffset" /></path></g>
                  </svg>
                </div>
              </div>

              {/* Brand Name with 3D styling */}
              <div className="text-center space-y-2.5">
                <h1
                  className="text-2xl md:text-4xl font-bold tracking-tight"
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
                  className="text-base md:text-lg text-white/60 font-light tracking-wide"
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
        {assistantSettings.memoryDebug && memoryTelemetry && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMemoryDebug((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="text-[11px] text-white/70 uppercase tracking-[0.16em]">
                  Memory Telemetry • {memoryTelemetry.strategy} • {memoryTelemetry.retrievedCount} retrieved
                </div>
                <ChevronDown
                  size={14}
                  className={`text-white/50 transition-transform duration-200 ${showMemoryDebug ? "rotate-180" : ""}`}
                />
              </button>
              {showMemoryDebug && (
                <div className="px-4 pb-3 space-y-2">
                  {memoryTelemetry.memories.length === 0 ? (
                    <p className="text-xs text-white/45">No memory entries selected for this response.</p>
                  ) : (
                    memoryTelemetry.memories.map((item, idx) => (
                      <div key={`${item.id || idx}-${idx}`} className="rounded-xl border border-white/10 bg-black/30 p-2.5">
                        <p className="text-[12px] text-white/80 leading-relaxed">{item.content || "(empty memory)"}</p>
                        <div className="mt-1 text-[10px] text-white/45 uppercase tracking-[0.12em]">
                          {(item.category || item.type || "general")} • conf {Number(item.confidence ?? item.importance ?? 0).toFixed(2)} • {item.reason || "selected"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
              {/* Glass Container */}
              <div 
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8.5px)',
                  WebkitBackdropFilter: 'blur(8.5px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                
                {/* Content */}
                <div className="relative">
                  {/* Textarea - extra bottom padding for buttons */}
                  <textarea 
                    ref={textareaRef} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Ask Kiara anything..." 
                    rows={1} 
                    className="w-full bg-transparent text-white/90 text-[15px] px-4 pt-4 pb-14 outline-none placeholder:text-white/30 placeholder:font-light resize-none overflow-y-auto scrollbar-hide leading-relaxed"
                    style={{ minHeight: "56px", maxHeight: "200px" }} 
                    autoFocus 
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />

                  {/* Buttons positioned at the bottom */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                    {/* Left Tools */}
                    <div className="flex items-center gap-0.5">
                      {([
                        { id: "plus", icon: Plus, label: "Tools", action: () => setActiveTool(activeTool === "plus" ? null : "plus") },
                        { id: "attach", icon: Paperclip, label: "Attach", action: () => { fileInputRef.current?.click(); } },
                        { id: "mic", icon: Mic, label: "Voice", action: () => setActiveTool(activeTool === "mic" ? null : "mic") },
                        { id: "web", icon: Globe, label: "Web", action: () => setActiveTool(activeTool === "web" ? null : "web") },
                      ] as const).map(({ id, icon: Icon, label, action }) => {
                        const isOn = activeTool === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={action}
                            className="group/btn relative"
                          >
                            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isOn ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}>
                              <Icon size={16} strokeWidth={1.5} />
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 backdrop-blur-md border border-white/10 rounded-md text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                              {label}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-0.5">
                      {/* Settings */}
                      <button 
                        type="button" 
                        onClick={() => setShowConfig(true)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200 group/cfg"
                      >
                        <Settings size={16} strokeWidth={1.5} className="transition-transform duration-700 ease-out group-hover/cfg:rotate-90" />
                      </button>
                      
                      {/* Send Button */}
                      <button 
                        type="submit" 
                        disabled={(!input.trim() && attachments.length === 0) || isLoading}
                        className="group/send relative disabled:opacity-30 disabled:cursor-not-allowed ml-1"
                      >
                        <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${input.trim() || attachments.length > 0 ? "bg-white text-black hover:scale-105" : "bg-white/[0.06] text-white/30"}`}>
                          {isLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/80 rounded-full animate-spin" />
                          ) : (
                            <ArrowUpRight size={16} strokeWidth={2.5} className="transition-transform duration-200 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5" />
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

      <ConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        settings={assistantSettings}
        onSave={saveAssistantSettings}
        saving={settingsSaving}
      />
    </div>
  );
};
