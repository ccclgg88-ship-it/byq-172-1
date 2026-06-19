import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Users, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const navItems = [
  { path: '/', label: '测评', icon: Home },
  { path: '/profile', label: '档案', icon: User, requireAuth: true },
  { path: '/wall', label: '好友墙', icon: Users },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">人设实验室</span>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && user ? (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src={user.avatar}
                    alt={user.nickname}
                    className="w-7 h-7 rounded-full bg-slate-100"
                  />
                  <span className="text-sm text-slate-600 hidden sm:block">{user.nickname}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-1.5 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-around">
          {navItems.map((item) => {
            if (item.requireAuth && !isLoggedIn) return null;
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${
                  active ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
