import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, User, Users, LogOut, Sparkles, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const navItems = [
  { path: '/', label: '测评', icon: Home },
  { path: '/profile', label: '档案', icon: User, requireAuth: true },
  { path: '/wall', label: '好友墙', icon: Users },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout, unreadCount, fetchUnreadCount } = useAuthStore();

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchUnreadCount();
    const timer = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(timer);
  }, [isLoggedIn, fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                人设实验室
              </span>
              <span className="text-[10px] text-slate-400 -mt-0.5">发现真实的自己</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && user ? (
              <>
                <button
                  onClick={() => navigate('/messages')}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-all active:scale-[0.95]"
                  title="消息"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm border border-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2 pr-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 p-[2px] shadow-md">
                  <img
                    src={user.avatar}
                    alt={user.nickname}
                    className="w-full h-full rounded-full bg-white object-cover"
                  />
                </div>
                  <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user.nickname}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-[0.95]"
                  title="退出登录"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-200 transition-all font-bold active:scale-[0.97]"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-40">
        <div className="max-w-3xl mx-auto px-3 h-20 flex items-center justify-around pb-[6px]">
          {navItems.map((item) => {
            if (item.requireAuth && !isLoggedIn) return null;
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-violet-200" />
                )}
                <div className={`relative z-10 flex flex-col items-center gap-0.5 transition-transform ${active ? 'scale-105' : ''}`}>
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                  <span className="text-xs font-bold">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
