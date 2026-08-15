export type ConversationType = 'staff' | 'system' | 'ai' | 'ticket';

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatarUrl?: string | null;
  linkedTicketId?: string | null;
  lastMessage?: string;
  lastUpdated?: string;
  unreadCount?: number;
}

export type MessageType = 'text' | 'image' | 'attachment' | 'timeline';

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string | null;
  senderName?: string | null;
  type: MessageType;
  content?: string | null;
  attachments?: Array<{ id: string; url: string; name?: string; mime?: string }>;
  createdAt: string;
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read';
}

export type SenderType = 'ServiceUser' | 'SystemStaff' | 'InteractionManager' | 'SystemAdmin' | 'System';

export interface ChatMessage {
  id: string;
  feedbackId?: string;
  senderName?: string | null;
  senderType?: SenderType | string;
  messageText?: string | null;
  createdAt: string;
}

export interface AiConversationItem {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

export interface AiConversationListItem {
  id: string;
}

export interface AiMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
  role: 'user' | 'assistant' | 'staff' | 'system';
}

export interface SupportThread {
  feedbackId: string;
  title: string;
  code: string;
  status: string;
  imageUris: string[];
  unreadCount: number;
  lastMessage: string;
  updatedAt: string;
}
