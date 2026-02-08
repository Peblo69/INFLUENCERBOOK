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
      className="transition-all duration-700 ease-in-out inline-block bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent drop-shadow-sm"
      style={{
        opacity: phase === "out" ? 0 : phase === "in" ? 0 : 1,
        transform: phase === "out" ? "translateY(-10px) scale(0.95)" : phase === "in" ? "translateY(10px) scale(0.95)" : "translateY(0) scale(1)",
        filter: phase === "visible" ? "blur(0px)" : "blur(4px)",
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Configuration</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custom Instructions</label>
            <textarea
              className="w-full h-32 bg-black border border-white/10 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-white/20 resize-none placeholder:text-zinc-700"
              placeholder="How should the AI behave? (e.g. 'Be concise', 'Act as a senior engineer')"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Model</label>
              <div className="w-full h-10 bg-black border border-white/10 rounded-lg flex items-center px-3 text-sm text-zinc-400 justify-between cursor-pointer hover:border-white/20">
                <span>Grok-Beta</span>
                <ChevronDown size={14} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Creativity</label>
              <div className="w-full h-10 bg-black border border-white/10 rounded-lg flex items-center px-3 relative">
                <div className="absolute left-1 right-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-[70%] h-full bg-white/20"></div>
                </div>
                <div className="w-3 h-3 bg-white rounded-full absolute left-[70%] shadow-lg cursor-pointer hover:scale-110 transition-transform"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
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
  // Writes streamed content directly into the messages array.
  // No separate "streamingText" state — content always lives in msg.content.
  // This eliminates the race condition where clearing streamingText happens
  // before the parent's messages prop updates.
  const startRenderLoop = useCallback(() => {
    if (renderIntervalRef.current) return;

    let lastRendered = "";
    let lastTime = 0;
    const INTERVAL = 80; // ~12fps

    const tick = (now: number) => {
      renderIntervalRef.current = requestAnimationFrame(tick);
      if (now - lastTime < INTERVAL) return;

      const current = streamingContentRef.current;
      if (current === lastRendered) return;

      lastTime = now;
      lastRendered = current;

      const streamId = currentStreamIdRef.current;
      if (!streamId) return;

      // Update the message content directly in the messages array
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
          stopRenderLoop();
          const finalContent = fullText || streamingContentRef.current || "";
          console.log(`[complete] raw=${finalContent.length} chars, first200: "${finalContent.substring(0, 200)}"`);

          const finalAiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: finalContent,
          };

          // Save to DB first
          try {
            await onSaveMessage(activeConversationId, finalAiMsg);
            refreshConversations();
          } catch (error) {
            console.error("Failed to save AI message:", error);
          }

          // Final update — content goes into messages array (same place it
          // was during streaming). No state transition, no race condition.
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: finalContent }
                : msg
            )
          );
          setIsLoading(false);
          setStreamingMessageId(null);
          currentStreamIdRef.current = null;
          sendLockRef.current = false;
          isStreamingRef.current = false;
          setJustFinishedId(aiMsgId);
          setTimeout(() => setJustFinishedId(null), 2500);
          setTimeout(() => textareaRef.current?.focus(), 100);
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
    <div className="flex-1 flex flex-col h-full bg-black relative font-sans overflow-hidden selection:bg-white/20 selection:text-white">

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 relative z-0 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center select-none">
            <div className="flex flex-col items-center gap-4 pb-32">
              <div className="w-32 h-32 flex items-center justify-center">
                <span className="text-7xl text-white/20 animate-pulse select-none" style={{ fontFamily: 'serif' }}>&#8734;</span>
              </div>
              <div className="text-white font-bold text-2xl md:text-4xl tracking-tight text-center h-12 flex items-center justify-center drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
                <RotatingPhrase />
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
        <div className="max-w-3xl mx-auto px-6">
          <form onSubmit={handleSubmit} className="relative group">
            {attachments.length > 0 && (
              <div className="absolute bottom-full left-0 mb-6 flex gap-3 px-1 overflow-x-auto w-full pb-2 scrollbar-none">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group/att w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer">
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover opacity-80 group-hover/att:opacity-100 transition-opacity" />
                    <button type="button" onClick={() => removeAttachment(att.id)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity backdrop-blur-sm">
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-black rounded-[32px] p-2 pl-4 pr-2 border border-white/10 shadow-[0_0_20px_-5px_rgba(255,255,255,0.05)] transition-all duration-300 focus-within:border-white/20 focus-within:shadow-[0_0_25px_-5px_rgba(255,255,255,0.1)] hover:border-white/15">
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." rows={1} className="w-full bg-transparent text-gray-200 text-[15px] px-2 py-3 outline-none placeholder:text-[#444] placeholder:text-xs placeholder:font-medium placeholder:tracking-wider font-light resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden leading-relaxed" style={{ minHeight: "48px", maxHeight: "200px" }} autoFocus />
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />

              <div className="flex items-center justify-between pt-2 pb-1 px-1 border-t border-white/5 mt-1">
                <div className="flex items-center gap-1">
                  {([
                    { id: "plus", icon: Plus, action: () => setActiveTool(activeTool === "plus" ? null : "plus") },
                    { id: "attach", icon: Paperclip, action: () => { fileInputRef.current?.click(); } },
                    { id: "mic", icon: Mic, action: () => setActiveTool(activeTool === "mic" ? null : "mic") },
                    { id: "web", icon: Globe, action: () => setActiveTool(activeTool === "web" ? null : "web") },
                  ] as const).map(({ id, icon: Icon, action }) => {
                    const isOn = activeTool === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={action}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isOn ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowConfig(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200 group/cfg">
                    <Settings size={16} className="transition-transform duration-500 ease-in-out group-hover/cfg:rotate-180" />
                  </button>
                  <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${input.trim() || attachments.length > 0 ? "bg-white text-black hover:bg-gray-200 hover:scale-105" : "bg-[#222] text-[#444] cursor-not-allowed"}`}>
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <ArrowUpRight size={18} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[9px] text-[#333] font-sans tracking-[0.2em] font-medium uppercase opacity-50 hover:opacity-100 transition-opacity cursor-default">Powered by Kiara Intelligence</p>
            </div>
          </form>
        </div>
      </div>

      <ConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
};
