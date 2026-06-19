import type {
  User,
  Assessment,
  AssessmentListItem,
  PaginatedResult,
  CompareResult,
  Comment,
  FriendList,
  Message,
} from '@/types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, { ...options, headers: { ...headers(), ...(options?.headers as Record<string, string> || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  auth: {
    register(nickname: string, password: string) {
      return request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nickname, password }),
      });
    },
    login(nickname: string, password: string) {
      return request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ nickname, password }),
      });
    },
    me() {
      return request<User>('/auth/me');
    },
  },

  assessments: {
    create(data: { title?: string; tags?: string[]; visibility?: string }) {
      return request<Assessment>('/assessments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list(page = 1) {
      return request<PaginatedResult<Assessment>>(`/assessments?page=${page}`);
    },
    compare(id1: string, id2: string) {
      return request<CompareResult>(`/assessments/compare?id1=${id1}&id2=${id2}`);
    },
    delete(id: string) {
      return request<{ success: boolean }>(`/assessments/${id}`, { method: 'DELETE' });
    },
    updateVisibility(id: string, visibility: string) {
      return request<{ success: boolean }>(`/assessments/${id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
      });
    },
  },

  social: {
    getInviteCode() {
      return request<{ inviteCode: string }>('/social/invite-code');
    },
    follow(inviteCode: string) {
      return request<{ success: boolean; target: { id: string; nickname: string; avatar: string }; mutual: boolean }>('/social/follow', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      });
    },
    unfollow(userId: string) {
      return request<{ success: boolean }>(`/social/follow/${userId}`, { method: 'DELETE' });
    },
    block(targetId: string) {
      return request<{ success: boolean }>('/social/block', {
        method: 'POST',
        body: JSON.stringify({ targetId }),
      });
    },
    unblock(userId: string) {
      return request<{ success: boolean }>(`/social/block/${userId}`, { method: 'DELETE' });
    },
    listFriends() {
      return request<FriendList>('/social/list');
    },
  },

  wall: {
    list(sort: 'latest' | 'compatibility' = 'latest', page = 1) {
      return request<PaginatedResult<AssessmentListItem>>(`/wall?sort=${sort}&page=${page}`);
    },
    like(assessmentId: string) {
      return request<{ liked: boolean }>(`/wall/${assessmentId}/like`, { method: 'POST' });
    },
    getComments(assessmentId: string) {
      return request<{ items: Comment[] }>(`/wall/${assessmentId}/comments`);
    },
    addComment(assessmentId: string, content: string) {
      return request<Comment>(`/wall/${assessmentId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    deleteComment(commentId: string) {
      return request<{ success: boolean }>(`/wall/comments/${commentId}`, { method: 'DELETE' });
    },
  },

  messages: {
    getUnreadCount() {
      return request<{ count: number }>('/messages/unread-count');
    },
    list(type: 'all' | 'like' | 'comment' | 'follow' = 'all', page = 1) {
      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      params.append('page', String(page));
      return request<PaginatedResult<Message>>(`/messages?${params.toString()}`);
    },
    markRead(id: string) {
      return request<{ success: boolean }>(`/messages/${id}/read`, { method: 'POST' });
    },
    markAllRead() {
      return request<{ success: boolean }>('/messages/read-all', { method: 'POST' });
    },
  },
};
