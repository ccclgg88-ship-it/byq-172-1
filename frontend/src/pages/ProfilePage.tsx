import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Trash2, RefreshCw, Check, X, ArrowLeft,
  Plus, Minus, Loader2, Calendar, Clock, ChevronDown,
} from 'lucide-react';
import { api } from '@/api';
import type { Assessment, CompareResult } from '@/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
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
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
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
    try {
      await api.assessments.delete(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      setSelected((prev) => prev.filter((x) => x !== deleteId));
    } catch (err: any) {
      alert(err.message || '删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  const handleRetest = async () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const selectedAssessments = items.filter((x) => selected.includes(x.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            人设档案
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">记录你的人设变迁史</p>
        </div>
        <button
          onClick={handleRetest}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          再测一次
        </button>
      </div>

      {selected.length > 0 && (
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-brand-100 rounded-2xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                已选 {selected.length}/2
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                {selectedAssessments.map((a) => (
                  <span
                    key={a.id}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600"
                  >
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCompare}
                disabled={selected.length !== 2 || compareLoading}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {compareLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                对比查看
              </button>
            </div>
          </div>
        </div>
      )}

      {compareResult && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-50 to-purple-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">对比结果</div>
                <div className="text-xs text-slate-400">
                  {formatDate(compareResult.first.createdAt)} → {formatDate(compareResult.second.createdAt)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompareResult(null)}
              className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-5">
            <div className="space-y-2">
              <div className="text-xs text-slate-400">{formatDateTime(compareResult.first.createdAt)}</div>
              <div className="font-bold text-slate-800 text-lg">{compareResult.first.title}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">{formatDateTime(compareResult.second.createdAt)}</div>
              <div className="font-bold text-slate-800 text-lg">{compareResult.second.title}</div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-3">
            {compareResult.diff.kept.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-xs font-medium text-slate-500">保持不变</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {compareResult.diff.kept.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-lg bg-white text-slate-600 text-xs font-medium border border-slate-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {compareResult.diff.added.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Plus className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">新增标签</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {compareResult.diff.added.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-lg bg-white text-emerald-700 text-xs font-medium border border-emerald-200"
                    >
                      + #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {compareResult.diff.removed.length > 0 && (
              <div className="bg-rose-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Minus className="w-3 h-3 text-rose-500" />
                  <span className="text-xs font-medium text-rose-600">消失标签</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {compareResult.diff.removed.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-lg bg-white text-rose-700 text-xs font-medium border border-rose-200 line-through"
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
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-slate-700 font-medium mb-1">还没有测评记录</div>
          <p className="text-xs text-slate-400 mb-5">完成第一次测评，开启你的人设档案</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            去测评
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-200 via-slate-200 to-slate-200" />
          <div className="space-y-3">
            {items.map((item, idx) => {
              const isSelected = selected.includes(item.id);
              const selectedOrder = selected.indexOf(item.id);
              return (
                <div
                  key={item.id}
                  className={`relative pl-14 animate-fade-in-up`}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <div
                    className={`absolute left-3 top-5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-slate-300 text-transparent hover:border-brand-400'
                    }`}
                  >
                    {isSelected ? (
                      <span className="text-xs font-bold">{selectedOrder + 1}</span>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>

                  <div
                    onClick={() => toggleSelect(item.id)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-400 shadow-md ring-2 ring-brand-100'
                        : 'border-slate-100 hover:border-brand-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 text-sm truncate">
                          {item.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                            item.visibility === 'public'
                              ? 'bg-blue-50 text-blue-600'
                              : item.visibility === 'friends'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.visibility === 'public' ? '公开' : item.visibility === 'friends' ? '好友' : '私密'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="pl-14 pt-2">
              <button
                onClick={() => loadList(page + 1, true)}
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
            </div>
          )}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">删除此测评？</h3>
            <p className="text-sm text-slate-500 mb-6">删除后无法恢复，好友墙上的动态也会同步移除。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
