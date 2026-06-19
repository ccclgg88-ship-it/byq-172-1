export interface User {
  id: string;
  nickname: string;
  avatar: string;
  inviteCode: string;
}

export interface Assessment {
  id: string;
  title: string;
  tags: string[];
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
}

export interface AssessmentListItem extends Assessment {
  userId?: string;
  nickname?: string;
  avatar?: string;
  compatibility?: number;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isGuest?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface CompareResult {
  first: Assessment;
  second: Assessment;
  diff: {
    added: string[];
    removed: string[];
    kept: string[];
  };
}

export interface Comment {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  content: string;
  createdAt: string;
}

export interface FriendItem {
  id: string;
  nickname: string;
  avatar: string;
}

export interface FriendList {
  following: FriendItem[];
  followers: FriendItem[];
}

export type MessageType = 'like' | 'comment' | 'follow' | 'mutual_follow';

export interface Message {
  id: string;
  type: MessageType;
  senderId?: string;
  senderNickname?: string;
  senderAvatar?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  commentId?: string;
  content?: string;
  read: boolean;
  createdAt: string;
}
