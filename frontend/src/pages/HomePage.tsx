import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Eye, EyeOff, Globe, Users, Lock, User } from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store/auth';
import type { Assessment } from '@/types';

const VISIBILITY_OPTIONS = [
  { key: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { key: 'friends', label: '仅好友', icon: Users, desc: '好友可见' },
  { key: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见' },
] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
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
    handleAssess();
  };

  const currentVisibility = VISIBILITY_OPTIONS.find((v) => v.key === visibility)!;
  const VisIcon = currentVisibility.icon;

  return (
    <div className="space-y-6">
      {!result ? (
        <div className="animate-fade-in">
          <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -left-5 -bottom-5 w-32 h-32 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold mb-2">测测你的今日人设</h2>
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                无需复杂问卷，AI 将基于你的气场生成专属人设标签与称号。
              </p>

              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setShowVisibility(!showVisibility)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-sm"
                >
                  <VisIcon className="w-4 h-4" />
                  <span>{currentVisibility.label}</span>
                  {showVisibility ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <span className="text-xs text-white/60">{currentVisibility.desc}</span>
              </div>

              {showVisibility && (
                <div className="space-y-2 mb-6 animate-slide-in">
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = visibility === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setVisibility(opt.key);
                          setShowVisibility(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                          active ? 'bg-white text-brand-700' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium text-sm">{opt.label}</div>
                          <div className={`text-xs ${active ? 'text-brand-600/70' : 'text-white/60'}`}>
                            {opt.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleAssess}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-white text-brand-700 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    分析中...
                  </>
                ) : !isLoggedIn ? (
                  '登录后开始测评'
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
            <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
              <User className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">游客模式</p>
                <p className="text-amber-600/80">
                  登录后可保存人设档案、关注好友、参与互动。
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
                >
                  去登录
                </button>
              </div>
            </div>
          )}

          {isLoggedIn && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-brand-200 hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <User className="w-5 h-5 text-brand-600" />
                </div>
                <div className="font-semibold text-slate-800 text-sm">我的档案</div>
                <div className="text-xs text-slate-400 mt-0.5">查看历史人设变迁</div>
              </button>
              <button
                onClick={() => navigate('/wall')}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-brand-200 hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-pink-600" />
                </div>
                <div className="font-semibold text-slate-800 text-sm">好友人设墙</div>
                <div className="text-xs text-slate-400 mt-0.5">看看朋友们的人设</div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-10 text-center text-white">
              <div className="text-xs text-white/70 uppercase tracking-wider mb-2">Your Persona</div>
              <h2 className="text-3xl font-bold mb-1">{result.title}</h2>
              <div className="text-xs text-white/60 mt-3">
                {new Date(result.createdAt).toLocaleString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="text-sm font-medium text-slate-500 mb-3">代表标签</div>
              <div className="flex flex-wrap gap-2">
                {result.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 rounded-xl bg-brand-50 text-brand-700 text-sm font-medium border border-brand-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 flex items-center gap-2">
              <VisIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">
                {currentVisibility.desc}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={handleRetest}
              disabled={loading}
              className="py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-medium hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              再测一次
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="py-3 rounded-2xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-all shadow-sm"
            >
              查看档案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
