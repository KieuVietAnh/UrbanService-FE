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
