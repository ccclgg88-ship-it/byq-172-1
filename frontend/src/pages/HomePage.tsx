import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, RefreshCw, Eye, EyeOff, Globe, Users, Lock,
  User, ChevronRight, Wand2, ShieldCheck,
} from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store/auth';
import type { Assessment } from '@/types';

const VISIBILITY_OPTIONS = [
  { key: 'public', label: '公开', icon: Globe, desc: '所有人可见', color: 'sky' },
  { key: 'friends', label: '仅好友', icon: Users, desc: '好友可见', color: 'violet' },
  { key: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见', color: 'slate' },
] as const;

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  sky: { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const [result, setResult] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [showVisibility, setShowVisibility] = useState(false);

  const handleAssess = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await api.assessments.create({ visibility });
      setResult(res);
    } catch (err: any) {
      alert(err.message || '测评失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRetest = () => {
    setResult(null);
    setTimeout(() => handleAssess(), 50);
  };

  const currentVisibility = VISIBILITY_OPTIONS.find((v) => v.key === visibility)!;
  const VisIcon = currentVisibility.icon;
  const visColor = colorMap[currentVisibility.color];

  return (
    <div className="space-y-5">
      {!result ? (
        <div className="animate-fade-in">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-xl">
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="absolute top-20 left-1/2 w-40 h-40 rounded-full bg-indigo-300/20 blur-2xl" />

            <div className="relative px-6 py-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">测测你的今日人设</h2>
                  <p className="text-white/70 text-sm mt-0.5">AI 解读你的专属人格标签</p>
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-sm">
                无需复杂问卷，AI 将基于你的气场生成专属人设标签与称号，看看你今天是什么属性。
              </p>

              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setShowVisibility(!showVisibility)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ring-1 backdrop-blur-sm transition-all ${visColor.bg} ${visColor.text} ${visColor.ring}`}
                >
                  <VisIcon className="w-3.5 h-3.5" />
                  {currentVisibility.label}
                  {showVisibility ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <span className="text-xs text-white/60">{currentVisibility.desc}</span>
              </div>

              {showVisibility && (
                <div className="space-y-2 mb-6 animate-slide-in">
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = visibility === opt.key;
                    const c = colorMap[opt.color];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setVisibility(opt.key as any);
                          setShowVisibility(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                          active
                            ? `${c.bg} ${c.text} ring-2 ${c.ring}`
                            : 'bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{opt.label}</div>
                          <div className={`text-xs mt-0.5 ${active ? c.text : 'text-white/60'}`}>
                            {opt.desc}
                          </div>
                        </div>
                        {active && <ShieldCheck className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleAssess}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-white text-indigo-700 font-bold shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    AI 分析中...
                  </>
                ) : !isLoggedIn ? (
                  <>
                    <User className="w-5 h-5" />
                    登录后开始测评
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    开始测评
                  </>
                )}
              </button>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 text-sm">游客模式</p>
                <p className="text-xs text-amber-700/80 mt-0.5">
                  登录后可保存人设档案、关注好友、参与互动。
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  去登录
                </button>
              </div>
            </div>
          )}

          {isLoggedIn && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <User className="w-5.5 h-5.5 text-indigo-600" />
                </div>
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  我的档案
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-xs text-slate-400 mt-0.5">查看历史人设变迁</div>
              </button>
              <button
                onClick={() => navigate('/wall')}
                className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/50 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-5.5 h-5.5 text-pink-600" />
                </div>
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  好友人设墙
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-xs text-slate-400 mt-0.5">看看朋友们的人设</div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="relative px-6 py-10 text-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-fuchsia-400/20 blur-2xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium text-white/90 mb-4">
                  <Sparkles className="w-3 h-3" />
                  YOUR PERSONA
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
                  {result.title}
                </h2>
                <div className="text-xs text-white/70 font-medium">
                  {new Date(result.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                代表标签
              </div>
              <div className="flex flex-wrap gap-2">
                {result.tags.map((tag, i) => (
                  <span
                    key={tag}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                      i === 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : i === 1
                        ? 'bg-violet-50 text-violet-700 border-violet-100'
                        : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${visColor.bg} flex items-center justify-center`}>
                <VisIcon className={`w-3.5 h-3.5 ${visColor.text}`} />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {currentVisibility.desc}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={handleRetest}
              disabled={loading}
              className="py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              再测一次
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.98]"
            >
              查看档案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
