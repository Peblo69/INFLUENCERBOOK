import { useState, useEffect, useCallback, useRef } from "react";
import { AssistantSidebar } from "./components/AssistantSidebar";
import { ChatArea } from "./components/ChatArea";
import { SettingsModal, UpgradeModal } from "./components/Modals";
import type { GrokAttachment } from "@/services/grokService";
import {
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  listMessages,
  addMessage,
  type ChatConversation,
  type ChatMessage,
} from "@/services/chatService";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: GrokAttachment[];
  images?: string[];
}

type ActiveModal = "none" | "settings" | "upgrade";

// Convert DB message to UI message
const dbMessageToUI = (msg: ChatMessage): Message => ({
  id: msg.id,
  role: msg.role as "user" | "assistant",
  content: msg.content || "",
  attachments: msg.attachments?.map((att) => ({
    id: att.id,
    data: "", // We don't store base64 in DB, would need to fetch from storage
    mimeType: att.mimeType || "image/png",
  })),
  images: msg.images || undefined,
});

export const AssistantPage = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>("none");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const skipNextLoadRef = useRef(false); // Skip loading when we just created a convo
  const isStreamingRef = useRef(false); // Prevents message-load from overwriting active stream

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convos = await listConversations({ limit: 50 });
        setConversations(convos);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversationId) {
      if (!isStreamingRef.current) {
        setMessages([]);
      }
      return;
    }

    // Skip loading if we just created this conversation (messages are already in state)
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    // NEVER overwrite messages while a stream is active — this was a critical race:
    // ensureConversation() sets currentConversationId, which re-fires this effect,
    // which loads messages from DB (empty for a new convo) and wipes the stream.
    if (isStreamingRef.current) {
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      try {
        const msgs = await listMessages(currentConversationId);
        if (!cancelled && !isStreamingRef.current) {
          setMessages(msgs.map(dbMessageToUI));
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };
    loadMessages();
    return () => { cancelled = true; };
  }, [currentConversationId]);

  // Create new chat
  const handleNewChat = useCallback(async () => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  // Select existing conversation
  const handleSelectConversation = useCallback(async (id: string) => {
    setCurrentConversationId(id);
  }, []);

  // Rename conversation
  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const updated = await renameConversation(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
    } catch (error) {
      console.error("Failed to rename conversation:", error);
    }
  }, []);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [currentConversationId]);

  // Save message to database
  const handleSaveMessage = useCallback(async (
    conversationId: string,
    message: Message
  ) => {
    try {
      await addMessage(conversationId, {
        role: message.role,
        content: message.content,
        images: message.images,
        attachments: message.attachments?.map((att) => ({
          id: att.id,
          mimeType: att.mimeType,
        })),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  }, []);

  // Create conversation if needed and return ID
  const ensureConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (currentConversationId) {
      return currentConversationId;
    }

    // Create new conversation with title from first message
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const newConvo = await createConversation({ title });

    setConversations((prev) => [newConvo, ...prev]);
    // Skip the next message load since we're about to add messages locally
    skipNextLoadRef.current = true;
    setCurrentConversationId(newConvo.id);

    return newConvo.id;
  }, [currentConversationId]);

  // Refresh conversations list
  const refreshConversations = useCallback(async () => {
    try {
      const convos = await listConversations({ limit: 50 });
      setConversations(convos);
    } catch (error) {
      console.error("Failed to refresh conversations:", error);
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <AssistantSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          isLoading={isLoadingConversations}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setActiveModal("settings")}
          onOpenUpgrade={() => setActiveModal("upgrade")}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          conversationId={currentConversationId}
          ensureConversation={ensureConversation}
          onSaveMessage={handleSaveMessage}
          refreshConversations={refreshConversations}
          isStreamingRef={isStreamingRef}
        />
      </div>

      {/* Modals */}
      <SettingsModal isOpen={activeModal === "settings"} onClose={() => setActiveModal("none")} />
      <UpgradeModal isOpen={activeModal === "upgrade"} onClose={() => setActiveModal("none")} />
    </div>
  );
};
