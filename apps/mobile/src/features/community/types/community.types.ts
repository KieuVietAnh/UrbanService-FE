export interface CommunityFeedParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categoryId?: string | number;
}

export interface CommunityFeedResponse {
  items: CommunityFeedItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CommunityFeedItem {
  feedbackId?: string;
  id?: string;
  authorName?: string;
  userName?: string;
  status?: string;
  categoryName?: string;
  attachments?: Array<{ fileUrl?: string } | null>;
  imageUrl?: string;
  title?: string;
  description?: string;
  locationText?: string;
  code?: string;
  feedbackCode?: string;
  supportCount?: number;
  commentCount?: number;
  isSupported?: boolean;
  createdAt?: string | null;
}

export interface CommunityFeedCardProps {
  item: CommunityFeedItem;
  onPress: () => void;
  onCommentPress: () => void;
}

export interface CommentItem {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export type RawComment = {
  commentId?: string | number;
  id?: string | number;
  authorName?: string;
  userName?: string;
  userFullName?: string;
  content?: string;
  text?: string;
  createdAt?: string;
};

export interface CommunityFeedbackDetail extends CommunityFeedItem {
  comments?: RawComment[];
  commentList?: RawComment[];
}

export type CommunityFeedCache = {
  items?: CommunityFeedItem[];
};
