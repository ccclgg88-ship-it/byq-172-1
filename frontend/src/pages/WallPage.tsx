import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Heart, MessageCircle, Copy, Check, Clock, TrendingUp,
  Loader2, Send, Ban, ChevronDown, LogIn, UserPlus, X, Trash2,
} from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store/auth';
import type { AssessmentListItem, Comment, FriendList } from '@/types';

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

export default function WallPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
  const [items, setItems] = useState<AssessmentListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<'latest' | 'compatibility'>('latest');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [followCode, setFollowCode] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [followMsg, setFollowMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [friends, setFriends] = useState<FriendList | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<string | null>(null);
  const [showFollowList, setShowFollowList] = useState(false);
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});

  const loadWall = useCallback(async (p = 1, s = sort, append = false) => {
    const isFirst = !append;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.wall.list(s, p);
      if (append) {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
      setHasMore(res.hasMore);
      setPage(p);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort]);

  useEffect(() => {
    loadWall(1, sort);
  }, [sort, loadWall]);

  useEffect(() => {
    if (isLoggedIn) {
      api.social.getInviteCode().then((r) => setInviteCode(r.inviteCode)).catch(() => {});
      api.social.listFriends().then((r) => setFriends(r)).catch(() => {});
    }
  }, [isLoggedIn]);

  const handleSortChange = (s: 'latest' | 'compatibility') => {
    if (s === sort) return;
    setSort(s);
  };

  const handleLike = async (id: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (likeLoading[id]) return;
    setLikeLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.wall.like(id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                isLiked: res.liked,
                likeCount: Math.max(0, (it.likeCount || 0) + (res.liked ? 1 : -1)),
              }
            : it
        )
      );
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setLikeLoading((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const toggleComments = async (id: string) => {
    if (expandedComments[id]) {
      setExpandedComments((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.wall.getComments(id);
      setExpandedComments((prev) => ({ ...prev, [id]: res.items }));
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (assessmentId: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    const content = (commentInputs[assessmentId] || '').trim();
    if (!content) return;
    setSubmittingComments((prev) => ({ ...prev, [assessmentId]: true }));
    try {
      const res = await api.wall.addComment(assessmentId, content);
      setExpandedComments((prev) => ({
        ...prev,
        [assessmentId]: [...(prev[assessmentId] || []), res],
      }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === assessmentId ? { ...it, commentCount: (it.commentCount || 0) + 1 } : it
        )
      );
      setCommentInputs((prev) => ({ ...prev, [assessmentId]: '' }));
    } catch (err: any) {
      alert(err.message || '留言失败');
    } finally {
      setSubmittingComments((prev) => {
        const { [assessmentId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleDeleteComment = async (commentId: string, assessmentId: string) => {
    try {
      await api.wall.deleteComment(commentId);
      setExpandedComments((prev) => ({
        ...prev,
        [assessmentId]: (prev[assessmentId] || []).filter((c) => c.id !== commentId),
      }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === assessmentId ? { ...it, commentCount: Math.max(0, (it.commentCount || 0) - 1) } : it
        )
      );
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollow = async () => {
    if (!followCode.trim()) return;
    setFollowLoading(true);
    setFollowMsg(null);
    try {
      const res = await api.social.follow(followCode.trim().toUpperCase());
      setFollowMsg({ type: 'success', text: `已关注 ${res.target.nickname}${res.mutual ? '（互相关注）' : ''}` });
      setFollowCode('');
      api.social.listFriends().then((r) => setFriends(r)).catch(() => {});
      loadWall(1, sort);
    } catch (err: any) {
      setFollowMsg({ type: 'error', text: err.message || '关注失败' });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async (targetId: string, nickname: string) => {
    try {
      await api.social.block(targetId);
      setItems((prev) => prev.filter((it) => it.userId !== targetId));
      setBlockConfirm(null);
      api.social.listFriends().then((r) => setFriends(r)).catch(() => {});
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md shadow-pink-200">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">好友人设墙</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isLoggedIn ? '看看朋友们都是什么人设' : '浏览公开示例，登录后可关注互动'}
            </p>
          </div>
        </div>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFollowList(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              关注 {friends?.following.length || 0}
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transition-all active:scale-[0.97]"
            >
              <UserPlus className="w-4 h-4" />
              添加好友
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => handleSortChange('latest')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            sort === 'latest'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          最新
        </button>
        {isLoggedIn && (
          <button
            onClick={() => handleSortChange('compatibility')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              sort === 'compatibility'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            合拍度
          </button>
        )}
      </div>

      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">以游客身份浏览</p>
              <p className="text-xs text-amber-700/80 mt-0.5">登录后可关注好友、点赞留言、查看合拍度</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm flex-shrink-0"
          >
            登录
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-14 text-center shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center mx-auto mb-5">
            <Users className="w-10 h-10 text-pink-300" />
          </div>
          <div className="text-slate-800 font-bold text-lg mb-1">
            {isLoggedIn ? '还没有好友动态' : '暂无公开内容'}
          </div>
          <p className="text-sm text-slate-400 mb-6">
            {isLoggedIn ? '关注好友或等待好友发布测评' : '登录后发现更多精彩人设'}
          </p>
          {isLoggedIn ? (
            <button
              onClick={() => setShowInvite(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transition-all active:scale-[0.97]"
            >
              添加好友
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.97]"
            >
              去登录
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:shadow-slate-100 transition-shadow animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.avatar}
                      alt={item.nickname}
                      className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0 ring-2 ring-white shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">
                        {item.nickname}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium">
                        {formatTime(item.createdAt)}
                        {item.visibility === 'public' && isLoggedIn && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[10px] font-bold border border-sky-100">
                            公开
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.compatibility !== undefined && isLoggedIn && (
                      <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 shadow-sm">
                        <span className="text-xs font-extrabold text-pink-600">
                          ♡ {item.compatibility}%
                        </span>
                      </div>
                    )}
                    {isLoggedIn && item.userId !== user?.id && (
                      <button
                        onClick={() => setBlockConfirm(item.userId!)}
                        className="p-2 rounded-xl text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="拉黑此用户"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">
                    {item.title}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((t, i) => (
                      <span
                        key={t}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
                          i === 0
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : i === 1
                            ? 'bg-violet-50 text-violet-700 border-violet-100'
                            : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100'
                        }`}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => handleLike(item.id)}
                    disabled={likeLoading[item.id]}
                    className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-all active:scale-[0.95] ${
                      item.isLiked
                        ? 'bg-rose-50 text-rose-500 border border-rose-100'
                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent'
                    } disabled:opacity-60`}
                  >
                    <Heart className={`w-4.5 h-4.5 ${item.isLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs font-bold">{item.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(item.id)}
                    className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-all border border-transparent ${
                      expandedComments[item.id]
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
                    }`}
                  >
                    <MessageCircle className={`w-4.5 h-4.5 ${expandedComments[item.id] ? 'fill-current' : ''}`} />
                    <span className="text-xs font-bold">{item.commentCount || 0}</span>
                  </button>
                </div>
              </div>

              {expandedComments[item.id] && (
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-3">
                  {expandedComments[item.id].length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 font-medium">
                      还没有留言，来留一句吧～
                    </div>
                  ) : (
                    expandedComments[item.id].map((c) => (
                      <div key={c.id} className="flex gap-3 animate-slide-in">
                        <img
                          src={c.avatar}
                          alt={c.nickname}
                          className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-slate-700">{c.nickname}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatTime(c.createdAt)}
                              </span>
                            </div>
                            {(c.userId === user?.id || item.userId === user?.id) && (
                              <button
                                onClick={() => handleDeleteComment(c.id, item.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0 p-0.5 rounded-md hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1 break-words leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                  {isLoggedIn && (
                    <div className="flex gap-2.5 pt-3 border-t border-slate-200/70">
                      <input
                        type="text"
                        value={commentInputs[item.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment(item.id);
                          }
                        }}
                        placeholder="留一句（最多100字）..."
                        maxLength={100}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all font-medium"
                      />
                      <button
                        onClick={() => handleSubmitComment(item.id)}
                        disabled={submittingComments[item.id] || !commentInputs[item.id]?.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center justify-center"
                      >
                        {submittingComments[item.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => loadWall(page + 1, sort, true)}
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

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-gradient-to-r from-pink-50 to-rose-50">
              <h3 className="font-bold text-slate-800 text-lg">添加好友</h3>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setFollowMsg(null);
                  setFollowCode('');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  我的邀请码
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 border border-indigo-100 font-mono text-xl font-extrabold text-indigo-700 tracking-[0.2em] text-center select-all">
                    {inviteCode || '— — —'}
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="复制邀请码"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2.5 font-medium">
                  把邀请码发给朋友，对方输入后你们就能互相关注
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-bold text-slate-400">或者</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  输入朋友的邀请码
                </div>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={followCode}
                    onChange={(e) => setFollowCode(e.target.value.toUpperCase())}
                    placeholder="8 位邀请码"
                    maxLength={8}
                    className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none font-mono text-center text-lg font-extrabold tracking-[0.15em] uppercase transition-all"
                  />
                  <button
                    onClick={handleFollow}
                    disabled={followLoading || followCode.length < 4}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center gap-1.5"
                  >
                    {followLoading ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-4.5 h-4.5" />
                    )}
                    关注
                  </button>
                </div>
                {followMsg && (
                  <div
                    className={`text-xs mt-2.5 font-bold ${
                      followMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {followMsg.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFollowList && friends && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl animate-fade-in-up overflow-hidden max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-gradient-to-r from-indigo-50 to-violet-50 flex-shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">我的好友</h3>
              <button
                onClick={() => setShowFollowList(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin flex-1 space-y-6">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  我关注的（{friends.following.length}/50）
                </div>
                {friends.following.length === 0 ? (
                  <div className="text-xs text-slate-400 py-5 text-center bg-slate-50 rounded-2xl font-medium">
                    还没有关注任何人
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {friends.following.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <img
                          src={f.avatar}
                          alt={f.nickname}
                          className="w-10 h-10 rounded-full bg-slate-100 shadow-sm ring-2 ring-white"
                        />
                        <span className="text-sm font-bold text-slate-700 flex-1">{f.nickname}</span>
                        <button
                          onClick={() => {
                            api.social.unfollow(f.id).then(() => {
                              api.social.listFriends().then((r) => setFriends(r));
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                          取消关注
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  关注我的（{friends.followers.length}）
                </div>
                {friends.followers.length === 0 ? (
                  <div className="text-xs text-slate-400 py-5 text-center bg-slate-50 rounded-2xl font-medium">
                    还没人关注你
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {friends.followers.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <img
                          src={f.avatar}
                          alt={f.nickname}
                          className="w-10 h-10 rounded-full bg-slate-100 shadow-sm ring-2 ring-white"
                        />
                        <span className="text-sm font-bold text-slate-700 flex-1">{f.nickname}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {blockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-4">
              <Ban className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">确认拉黑？</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              拉黑后双方将不再出现在彼此的人设墙上，且会取消关注关系。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBlockConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const target = items.find((i) => i.userId === blockConfirm);
                  handleBlock(blockConfirm, target?.nickname || '该用户');
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md shadow-amber-200 hover:shadow-lg transition-all active:scale-[0.97]"
              >
                确认拉黑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
