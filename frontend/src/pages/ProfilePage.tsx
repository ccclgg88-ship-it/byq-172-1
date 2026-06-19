import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Trash2, RefreshCw, Check, X,
  Plus, Minus, Loader2, Calendar, Clock, ChevronDown,
  Sparkles, ArrowRight,
} from 'lucide-react';
import { api } from '@/api';
import type { Assessment, CompareResult } from '@/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Assessment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadList = useCallback(async (p = 1, append = false) => {
    const isFirst = !append;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.assessments.list(p);
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
  }, []);

  useEffect(() => {
    loadList(1);
  }, [loadList]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setCompareResult(null);
  };

  const clearSelection = () => {
    setSelected([]);
    setCompareResult(null);
  };

  const handleCompare = async () => {
    if (selected.length !== 2) return;
    setCompareLoading(true);
    try {
      const res = await api.assessments.compare(selected[0], selected[1]);
      setCompareResult(res);
    } catch (err: any) {
      alert(err.message || '对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.assessments.delete(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      setSelected((prev) => prev.filter((x) => x !== deleteId));
    } catch (err: any) {
      alert(err.message || '删除失败');
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleRetest = () => navigate('/');

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

  const selectedAssessments = items.filter((x) => selected.includes(x.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">人设档案</h1>
            <p className="text-xs text-slate-400 mt-0.5">记录你的人设变迁史 · 共 {items.length} 条</p>
          </div>
        </div>
        <button
          onClick={handleRetest}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.97]"
        >
          <RefreshCw className="w-4 h-4" />
          再测一次
        </button>
      </div>

      {selected.length > 0 && (
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-2xl p-4 shadow-lg shadow-indigo-100/50 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold shadow-sm">
                已选 {selected.length}/2
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                {selectedAssessments.map((a) => (
                  <span
                    key={a.id}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={clearSelection}
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCompare}
                disabled={selected.length !== 2 || compareLoading}
                className="px-4 py-1.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 active:scale-[0.97]"
              >
                {compareLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                对比查看
              </button>
            </div>
          </div>
        </div>
      )}

      {compareResult && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-fade-in-up">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-800">对比结果</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDate(compareResult.first.createdAt)} → {formatDate(compareResult.second.createdAt)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompareResult(null)}
              className="p-2 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 border-b border-slate-50">
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                第一次
              </div>
              <div className="text-xs text-slate-400 mb-1">{formatDateTime(compareResult.first.createdAt)}</div>
              <div className="font-bold text-slate-800 text-lg">{compareResult.first.title}</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                第二次
              </div>
              <div className="text-xs text-indigo-400 mb-1">{formatDateTime(compareResult.second.createdAt)}</div>
              <div className="font-bold text-indigo-800 text-lg">{compareResult.second.title}</div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {compareResult.diff.kept.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">保持不变</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {compareResult.diff.kept.map((t) => (
                    <span
                      key={t}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {compareResult.diff.added.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">新增标签</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {compareResult.diff.added.map((t) => (
                    <span
                      key={t}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm"
                    >
                      + #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {compareResult.diff.removed.length > 0 && (
              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                    <Minus className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">消失标签</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {compareResult.diff.removed.map((t) => (
                    <span
                      key={t}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-rose-500 text-xs font-bold border border-rose-200 shadow-sm line-through"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-14 text-center shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto mb-5">
            <History className="w-10 h-10 text-slate-300" />
          </div>
          <div className="text-slate-800 font-bold text-lg mb-1">还没有测评记录</div>
          <p className="text-sm text-slate-400 mb-6">完成第一次测评，开启你的人设档案</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.97]"
          >
            去测评
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isSelected = selected.includes(item.id);
            const selectedOrder = selected.indexOf(item.id);
            return (
              <div
                key={item.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
              >
                <div
                  className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-300 shadow-lg shadow-indigo-100/50 ring-2 ring-indigo-100'
                      : 'border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-slate-100'
                  }`}
                  onClick={() => toggleSelect(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={`flex-shrink-0 w-7 h-7 mt-0.5 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-500 border-transparent text-white shadow-md shadow-indigo-200'
                          : 'bg-white border-slate-200 text-transparent hover:border-indigo-400'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-xs font-bold">{selectedOrder + 1}</span>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="font-bold text-slate-800 text-base truncate">
                            {item.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                              item.visibility === 'public'
                                ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                : item.visibility === 'friends'
                                ? 'bg-violet-50 text-violet-700 border border-violet-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.visibility === 'public' ? '公开' : item.visibility === 'friends' ? '好友' : '私密'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                          }}
                          className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                          title="删除此测评"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.tags.map((t, i) => (
                          <span
                            key={t}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
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

                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => loadList(page + 1, true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              加载更多记录
            </button>
          )}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">删除此测评？</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              删除后无法恢复，好友墙上的相关动态也会同步移除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:shadow-lg disabled:opacity-60 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
