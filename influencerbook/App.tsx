
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/Interface';
import { Landing } from './components/Landing';
import { SettingsModal, UpgradeModal } from './components/Modals';
import { ChatSession, Message, ActiveModal, Attachment } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'interface'>('landing');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');

  const handleNewChat = () => {
    setCurrentSessionId(null);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const handleSendMessage = (userContent: string, attachments: Attachment[], aiResponse: string) => {
    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        content: userContent,
        attachments: attachments
    };
    const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: aiResponse 
    };

    if (currentSessionId) {
      // Update existing session
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMsg, aiMsg],
            updatedAt: Date.now()
          };
        }
        return session;
      }));
    } else {
      // Create new session
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title: userContent ? userContent.slice(0, 30) : (attachments.length ? "Image Analysis" : "New Chat"),
        messages: [userMsg, aiMsg],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
    }
  };

  // Get current messages
  const currentMessages = currentSessionId 
    ? sessions.find(s => s.id === currentSessionId)?.messages || []
    : [];

  if (view === 'landing') {
    return <Landing onEnter={() => setView('interface')} />;
  }

  return (
    <div className="flex h-screen w-full bg-black text-text font-sans overflow-hidden animate-[fadeIn_0.5s_ease-out]">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <Sidebar 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenUpgrade={() => setActiveModal('upgrade')}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <ChatArea 
          messages={currentMessages} 
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={activeModal === 'settings'} 
        onClose={() => setActiveModal('none')} 
      />
      <UpgradeModal 
        isOpen={activeModal === 'upgrade'} 
        onClose={() => setActiveModal('none')} 
      />
    </div>
  );
};

export default App;
