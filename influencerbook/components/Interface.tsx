
import React, { useRef, useEffect, useState } from 'react';
import { Message, Attachment } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, attachments: Attachment[], response: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
      });
    }
  }, [messages, isLoading, attachments]);

  // Auto-resize Textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height approx 5 rows
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userContent = input;
    const userAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Reset height immediately
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
      const historyForApi = messages.map(m => ({ 
          role: m.role, 
          content: m.content,
          attachments: m.attachments 
      }));
      
      const finalPrompt = isReasoning ? `[REASONING MODE] ${userContent}` : userContent;
      
      const response = await sendMessageToGemini(historyForApi, finalPrompt, userAttachments);
      onSendMessage(userContent, userAttachments, response);
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as any);
      }
  };

  // --- File Handling ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (files: File[]) => {
      files.forEach(file => {
          if (!file.type.startsWith('image/')) return;
          
          const reader = new FileReader();
          reader.onload = (e) => {
              const base64String = (e.target?.result as string).split(',')[1];
              const newAttachment: Attachment = {
                  id: Date.now().toString() + Math.random().toString(),
                  data: base64String,
                  mimeType: file.type
              };
              setAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(file);
      });
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // --- Drag and Drop ---
  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };
  
  const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(Array.from(e.dataTransfer.files));
      }
  };

  return (
    <div 
        className="flex-1 flex flex-col h-full bg-[#000000] relative font-sans overflow-hidden"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-50 bg-emerald-900/20 backdrop-blur-sm border-2 border-emerald-500 border-dashed flex items-center justify-center animate-[fadeIn_0.2s]">
              <div className="text-emerald-500 font-mono text-xl tracking-[0.2em] font-bold">
                  DROP VISUAL DATA HERE
              </div>
          </div>
      )}

      {/* Main Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 relative z-0 scrollbar-hide"
      >
        {messages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center select-none pointer-events-none opacity-50">
                <p className="text-white/20 font-mono text-xs tracking-widest">AWAITING INPUT...</p>
           </div>
        ) : (
            <div className="max-w-3xl mx-auto space-y-10 pb-40 pt-10">
                {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* Assistant Message */}
                    {msg.role === 'assistant' && (
                        <div className="max-w-[90%] text-gray-300 text-[15px] leading-7 tracking-wide whitespace-pre-wrap font-light">
                            {msg.content}
                        </div>
                    )}
                    
                    {/* User Message */}
                    {msg.role === 'user' && (
                        <div className="max-w-[85%] flex flex-col items-end gap-2">
                            {/* Attachments Display */}
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-end mb-1">
                                    {msg.attachments.map(att => (
                                        <div key={att.id} className="w-32 h-32 rounded-lg overflow-hidden border border-white/10 relative">
                                            <img src={`data:${att.mimeType};base64,${att.data}`} alt="User upload" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="bg-[#1e1e1e] text-gray-100 px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-md">
                                {msg.content}
                            </div>
                        </div>
                    )}
                </div>
                ))}
                
                {isLoading && (
                   <div className="flex justify-start w-full animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex items-center gap-1 ml-1 h-8">
                            <span className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-gray-600 rounded-full animate-pulse delay-75"></span>
                            <span className="w-2 h-2 bg-gray-600 rounded-full animate-pulse delay-150"></span>
                        </div>
                   </div>
                )}
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black to-transparent pt-10 pb-6">
        <div className="max-w-3xl mx-auto px-4">
            <form onSubmit={handleSubmit} className="relative">
                
                {/* Image Previews in Input Bar */}
                {attachments.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-4 flex gap-3 px-2 overflow-x-auto w-full">
                        {attachments.map(att => (
                            <div key={att.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/20 animate-[scaleIn_0.2s]">
                                <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover" />
                                <button 
                                    type="button"
                                    onClick={() => removeAttachment(att.id)}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Input Container */}
                <div className="bg-[#1e1e1e] rounded-[28px] p-3 shadow-2xl border border-white/5 transition-colors focus-within:bg-[#252525]">
                    
                    {/* Replaced Input with Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="ASK ANYTHING..."
                        rows={1}
                        className="w-full bg-transparent text-gray-100 text-sm px-3 py-2 mb-2 outline-none placeholder:text-gray-600 placeholder:text-[11px] placeholder:tracking-[0.2em] placeholder:font-medium font-light resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-none"
                        style={{
                            minHeight: '40px',
                            maxHeight: '120px',
                            scrollbarWidth: 'none', 
                            msOverflowStyle: 'none'
                        }}
                        autoFocus
                    />

                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                    />

                    {/* Toolbar Row */}
                    <div className="flex items-center justify-between px-1">
                         
                         {/* Left: Essentials */}
                         <div className="flex items-center gap-2">
                            {/* Plus Button - Triggers File */}
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>

                            {/* Attach Button - Triggers File */}
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            </button>
                            
                            {/* Reasoning Toggle */}
                            <button 
                                type="button" 
                                onClick={() => setIsReasoning(!isReasoning)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ml-1 border ${
                                    isReasoning 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                                }`}
                            >
                                {isReasoning && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>}
                                <span>REASONING</span>
                            </button>
                         </div>

                         {/* Right: Actions */}
                         <div className="flex items-center gap-3">
                            {/* Voice Mode Visualizer */}
                            <div className="flex items-center gap-3">
                                {isVoiceMode && (
                                    <div className="flex items-center gap-1 h-4">
                                        <div className="w-1 bg-green-500 rounded-full animate-[pulse_0.5s_infinite] h-2"></div>
                                        <div className="w-1 bg-green-500 rounded-full animate-[pulse_0.7s_infinite] h-4"></div>
                                        <div className="w-1 bg-green-500 rounded-full animate-[pulse_0.4s_infinite] h-3"></div>
                                        <div className="w-1 bg-green-500 rounded-full animate-[pulse_0.6s_infinite] h-2"></div>
                                    </div>
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => setIsVoiceMode(!isVoiceMode)}
                                    className={`p-2 rounded-full transition-all ${isVoiceMode ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                </button>
                            </div>

                            <button 
                                type="submit"
                                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    (input.trim() || attachments.length > 0)
                                    ? 'bg-white text-black hover:bg-gray-200' 
                                    : 'bg-[#333] text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {isLoading ? (
                                    <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                                )}
                            </button>
                         </div>
                    </div>
                </div>

                {/* Footer Status Text */}
                <div className="text-center mt-3">
                    <p className="text-[10px] text-[#444] font-mono tracking-widest uppercase opacity-70">AI InfluencerBook v2.0 // Check Outputs</p>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
