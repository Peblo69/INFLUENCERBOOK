import { supabase } from "@/lib/supabase";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  summary: string | null;
  tags: string[];
  total_messages: number;
  total_tokens: number;
  is_archived: boolean;
  is_deleted: boolean;
  last_message_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageAttachment {
  id: string;
  name?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  storagePath?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string | null;
  tool_calls: any;
  tool_results: any;
  images: any;
  attachments: ChatMessageAttachment[];
  tokens: number;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CreateConversationInput {
  title?: string;
  model?: string;
  tags?: string[];
  metadata?: Record<string, any> | null;
}

export interface ListConversationsOptions {
  limit?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

export interface ListMessagesOptions {
  limit?: number;
  before?: string;
  after?: string;
  ascending?: boolean;
}

const DEFAULT_MODEL = "grok-4";

const requireUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user.id;
};

const sanitizeAttachments = (
  attachments: ChatMessageAttachment[] | undefined
): ChatMessageAttachment[] => {
  if (!attachments || attachments.length === 0) return [];
  return attachments.map((att) => ({
    id: att.id,
    name: att.name,
    mimeType: att.mimeType,
    size: att.size,
    url: att.url,
    storagePath: att.storagePath,
  }));
};

export const createConversation = async (
  input: CreateConversationInput = {}
): Promise<ChatConversation> => {
  const userId = await requireUserId();

  const payload = {
    user_id: userId,
    title: (input.title || "New Chat").trim() || "New Chat",
    model: input.model || DEFAULT_MODEL,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    is_archived: false,
    is_deleted: false,
  };

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ChatConversation;
};

export const listConversations = async (
  options: ListConversationsOptions = {}
): Promise<ChatConversation[]> => {
  const userId = await requireUserId();

  let query = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId);

  if (!options.includeArchived) {
    query = query.eq("is_archived", false);
  }

  if (!options.includeDeleted) {
    query = query.eq("is_deleted", false);
  }

  query = query
    .order("last_message_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ChatConversation[];
};

export const getConversation = async (id: string): Promise<ChatConversation | null> => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ChatConversation | null;
};

export const renameConversation = async (id: string, title: string): Promise<ChatConversation> => {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title cannot be empty");
  }

  const { data, error } = await supabase
    .from("conversations")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ChatConversation;
};

export const archiveConversation = async (id: string, archived = true): Promise<ChatConversation> => {
  const { data, error } = await supabase
    .from("conversations")
    .update({
      is_archived: archived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ChatConversation;
};

export const deleteConversation = async (
  id: string,
  options: { hard?: boolean } = {}
): Promise<boolean> => {
  if (options.hard) {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return true;
  }

  const { error } = await supabase
    .from("conversations")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
};

export const restoreConversation = async (id: string): Promise<ChatConversation> => {
  const { data, error } = await supabase
    .from("conversations")
    .update({
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ChatConversation;
};

export const listMessages = async (
  conversationId: string,
  options: ListMessagesOptions = {}
): Promise<ChatMessage[]> => {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  if (options.after) {
    query = query.gt("created_at", options.after);
  }

  query = query.order("created_at", { ascending: options.ascending ?? true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ChatMessage[];
};

export const addMessage = async (
  conversationId: string,
  message: {
    role: ChatRole;
    content?: string | null;
    tool_calls?: any;
    tool_results?: any;
    images?: any;
    attachments?: ChatMessageAttachment[];
    tokens?: number;
    metadata?: Record<string, any> | null;
  }
): Promise<ChatMessage> => {
  const payload = {
    conversation_id: conversationId,
    role: message.role,
    content: message.content ?? null,
    tool_calls: message.tool_calls ?? null,
    tool_results: message.tool_results ?? null,
    images: message.images ?? null,
    attachments: sanitizeAttachments(message.attachments),
    tokens: message.tokens ?? 0,
    metadata: message.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ChatMessage;
};

export const deleteMessage = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
};
