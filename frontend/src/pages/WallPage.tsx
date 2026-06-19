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
    try {
      const res = await api.wall.like(id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                isLiked: res.liked,
                likeCount: (it.likeCount || 0) + (res.liked ? 1 : -1),
              }
            : it
        )
      );
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const toggleComments = async (id: string) => {
    if (expandedComments[id]) {
      const { [id]: _, ...rest } = expandedComments;
      setExpandedComments(rest);
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
      setSubmittingComments((prev) => ({ ...prev, [assessmentId]: false }));
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
      alert(`已拉黑 ${nickname}`);
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            好友人设墙
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoggedIn ? '看看朋友们都是什么人设' : '浏览公开示例，登录后可关注互动'}
          </p>
        </div>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFollowList(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              关注 {friends?.following.length || 0}
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              添加好友
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-100">
          <button
            onClick={() => handleSortChange('latest')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              sort === 'latest' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clock className="w-4 h-4" />
            最新
          </button>
          {isLoggedIn && (
            <button
              onClick={() => handleSortChange('compatibility')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === 'compatibility' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              合拍度
            </button>
          )}
        </div>

      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <LogIn className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm mb-0.5">以游客身份浏览</p>
              <p className="text-xs text-amber-600/80">登录后可关注好友、点赞留言、查看合拍度</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            登录
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-slate-700 font-medium mb-1">
            {isLoggedIn ? '还没有好友动态' : '暂无公开内容'}
          </div>
          <p className="text-xs text-slate-400 mb-5">
            {isLoggedIn ? '关注好友或等待好友发布测评' : '登录后发现更多精彩人设'}
          </p>
          {isLoggedIn ? (
            <button
              onClick={() => setShowInvite(true)}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              添加好友
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
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
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.avatar}
                      alt={item.nickname}
                      className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {item.nickname}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatTime(item.createdAt)}
                        {item.visibility === 'public' && <span className="ml-2">· 公开</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.compatibility !== undefined && !item.isGuest && (
                      <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100">
                        <span className="text-xs font-semibold text-pink-600">
                          ♡ {item.compatibility}%
                        </span>
                      </div>
                    )}
                    {isLoggedIn && item.userId !== user?.id && (
                      <button
                        onClick={() => setBlockConfirm(item.userId!)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="拉黑"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-lg font-bold text-slate-800 mb-2">{item.title}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => handleLike(item.id)}
                    disabled={!isLoggedIn}
                    className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                      item.isLiked
                        ? 'text-rose-500'
                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${item.isLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs font-medium">{item.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(item.id)}
                    className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">{item.commentCount || 0}</span>
                  </button>
                </div>
              </div>

              {expandedComments[item.id] && (
                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-3">
                  {expandedComments[item.id].length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400">暂无留言，来留一句吧～</div>
                  ) : (
                    expandedComments[item.id].map((c) => (
                      <div key={c.id} className="flex gap-2.5 animate-slide-in">
                        <img
                          src={c.avatar}
                          alt={c.nickname}
                          className="w-7 h-7 rounded-full bg-white flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-slate-700">{c.nickname}</span>
                              <span className="text-[10px] text-slate-400 ml-2">
                                {formatTime(c.createdAt)}
                              </span>
                            </div>
                            {(c.userId === user?.id || item.userId === user?.id) && (
                              <button
                                onClick={() => handleDeleteComment(c.id, item.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 break-words">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}

                  {isLoggedIn && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
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
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all"
                      />
                      <button
                        onClick={() => handleSubmitComment(item.id)}
                        disabled={submittingComments[item.id] || !commentInputs[item.id]?.trim()}
                        className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
              className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">添加好友</h3>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setFollowMsg(null);
                  setFollowCode('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">我的邀请码</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 font-mono text-lg font-bold text-brand-700 tracking-widest text-center select-all">
                    {inviteCode || '— — —'}
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="复制邀请码"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  把邀请码发给朋友，对方输入后你们就能互相关注
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">或</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">输入朋友的邀请码</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={followCode}
                    onChange={(e) => setFollowCode(e.target.value.toUpperCase())}
                    placeholder="8 位邀请码"
                    maxLength={8}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none font-mono text-center text-lg font-bold tracking-widest uppercase transition-all"
                  />
                  <button
                    onClick={handleFollow}
                    disabled={followLoading || followCode.length < 4}
                    className="px-5 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    关注
                  </button>
                </div>
                {followMsg && (
                  <div
                    className={`text-xs mt-2 ${
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-fade-in-up overflow-hidden max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-800">我的好友</h3>
              <button
                onClick={() => setShowFollowList(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto scrollbar-thin flex-1 space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2.5">
                  我关注的（{friends.following.length}/50）
                </div>
                {friends.following.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
                    还没有关注任何人
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {friends.following.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <img
                          src={f.avatar}
                          alt={f.nickname}
                          className="w-9 h-9 rounded-full bg-slate-100"
                        />
                        <span className="text-sm font-medium text-slate-700 flex-1">{f.nickname}</span>
                        <button
                          onClick={() => {
                            api.social.unfollow(f.id).then(() => {
                              api.social.listFriends().then((r) => setFriends(r));
                            });
                          }}
                          className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                          取消关注
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2.5">
                  关注我的（{friends.followers.length}）
                </div>
                {friends.followers.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
                    还没人关注你
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {friends.followers.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <img
                          src={f.avatar}
                          alt={f.nickname}
                          className="w-9 h-9 rounded-full bg-slate-100"
                        />
                        <span className="text-sm font-medium text-slate-700 flex-1">{f.nickname}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <Ban className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">确认拉黑？</h3>
            <p className="text-sm text-slate-500 mb-6">
              拉黑后双方将不再出现在彼此的人设墙上，且会取消关注关系。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBlockConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const target = items.find((i) => i.userId === blockConfirm);
                  handleBlock(blockConfirm, target?.nickname || '该用户');
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
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
