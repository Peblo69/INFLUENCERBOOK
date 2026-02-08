
export type ViewMode = 'landing' | 'interface' | 'login';
export type ActiveModal = 'none' | 'settings' | 'upgrade';

export interface Attachment {
  id: string;
  data: string; // Base64 string
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
