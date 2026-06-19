import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Bell, Heart, MessageCircle, Users, CheckCheck, ChevronDown,
  Loader2, Sparkles, ArrowRight,
} from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store/auth';
import type { Message } from '@/types';

type FilterType = 'all' | 'like' | 'comment' | 'follow';

const filterTabs: { key: FilterType; label: string; icon: typeof Bell }[] = [
  { key: 'all', label: '全部', icon: Bell },
  { key: 'like', label: '点赞', icon: Heart },
  { key: 'comment', label: '留言', icon: MessageCircle },
  { key: 'follow', label: '关注', icon: Users },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function renderMessageContent(msg: Message) {
  const nickname = msg.senderNickname || '匿名用户';
  switch (msg.type) {
    case 'like':
      return (
        <span className="text-sm text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">{nickname}</span>
          <span className="mx-1">点赞了你的「</span>
          <span className="font-bold text-indigo-600">{msg.assessmentTitle || '测评'}</span>
          <span>」</span>
        </span>
      );
    case 'comment':
      return (
        <span className="text-sm text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">{nickname}</span>
          <span className="mx-1">在「</span>
          <span className="font-bold text-indigo-600">{msg.assessmentTitle || '测评'}</span>
          <span>」留言：</span>
          <span className="text-slate-700">{msg.content}</span>
        </span>
      );
    case 'follow':
      return (
        <span className="text-sm text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">{nickname}</span>
          <span className="mx-1">关注了你</span>
        </span>
      );
    case 'mutual_follow':
      return (
        <span className="text-sm text-slate-600 leading-relaxed">
          <span className="font-bold text-pink-600">🎉 你们已互相关注！</span>
        </span>
      );
    default:
      return null;
  }
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { isLoggedIn, fetchUnreadCount } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  const hasUnread = messages.some((m) => !m.read);

  const loadMessages = useCallback(async (p = 1, f = filter, append = false) => {
    const isFirst = !append;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.messages.list(f, p);
      if (append) {
        setMessages((prev) => [...prev, ...res.items]);
      } else {
        setMessages(res.items);
      }
      setHasMore(res.hasMore);
      setPage(p);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMessages(1, filter);
  }, [filter, loadMessages]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.messages.markRead(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: true } : m))
      );
      await fetchUnreadCount();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (markAllLoading) return;
    setMarkAllLoading(true);
    try {
      await api.messages.markAllRead();
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      await fetchUnreadCount();
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleMessageClick = async (msg: Message) => {
    if (!msg.read) {
      await handleMarkRead(msg.id);
    }
    if (msg.type === 'like' || msg.type === 'comment') {
      if (msg.assessmentId) {
        navigate(`/wall?focus=${msg.assessmentId}`);
      } else {
        alert('关联的测评不存在或已删除');
      }
    } else {
      navigate('/wall');
    }
  };

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-200">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">消息通知</h1>
            <p className="text-xs text-slate-400 mt-0.5">查看你的互动消息</p>
          </div>
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {markAllLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            全部已读
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-14 text-center shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-10 h-10 text-indigo-300" />
          </div>
          <div className="text-slate-800 font-bold text-lg mb-1">暂无互动消息</div>
          <p className="text-sm text-slate-400 mb-6">去和朋友们互动起来吧～</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.97]"
            >
              <Sparkles className="w-4 h-4" />
              去测评
            </button>
            <button
              onClick={() => navigate('/wall')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transition-all active:scale-[0.97]"
            >
              <Users className="w-4 h-4" />
              去好友墙
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const isFollowType = msg.type === 'follow' || msg.type === 'mutual_follow';
            return (
              <div
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className="relative bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:shadow-slate-100 transition-all cursor-pointer active:scale-[0.99] animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                {!msg.read && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500 shadow-sm" />
                )}
                <div className="flex items-start gap-3 pl-3">
                  <div className="flex-shrink-0">
                    {isFollowType ? (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-md">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 p-[2px] shadow-md">
                        <img
                          src={msg.senderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={msg.senderNickname || '用户'}
                          className="w-full h-full rounded-full bg-white object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {msg.type === 'like' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-500">
                            <Heart className="w-3 h-3 fill-current" />
                          </span>
                        )}
                        {msg.type === 'comment' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-500">
                            <MessageCircle className="w-3 h-3 fill-current" />
                          </span>
                        )}
                        {msg.type === 'follow' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 text-pink-500">
                            <Users className="w-3 h-3" />
                          </span>
                        )}
                        {msg.type === 'mutual_follow' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-fuchsia-100 text-fuchsia-500">
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="mb-2">
                      {renderMessageContent(msg)}
                    </div>
                    {!msg.read && (
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <span className="text-[10px] text-sky-500 font-bold">新消息</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => loadMessages(page + 1, filter, true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              加载更多
            </button>
          )}
        </div>
      )}
    </div>
  );
}
