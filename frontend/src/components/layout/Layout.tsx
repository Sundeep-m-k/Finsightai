import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export function Layout() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-cream-100' : 'bg-slate-950'}`}>
      <nav className={`border-b px-6 py-3 sticky top-0 z-10 backdrop-blur-sm ${
        isLight
          ? 'bg-cream-100/90 border-cream-300'
          : 'bg-slate-950/90 border-slate-800'
      }`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-xs ${
              isLight ? 'bg-stone-900 text-gold-400' : 'bg-white text-stone-900'
            }`}>
              FS
            </div>
            <span className={`font-semibold tracking-tight text-sm ${isLight ? 'text-stone-900' : 'text-white'}`}>
              FinSight AI
            </span>
          </Link>

          {/* Nav + toggle */}
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? isLight
                    ? 'bg-stone-900 text-white'
                    : 'bg-slate-800 text-white'
                  : isLight
                    ? 'text-stone-500 hover:text-stone-900 hover:bg-cream-200'
                    : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard size={14} />
              Plan
            </Link>
            <Link
              to="/dashboard/chat"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                pathname === '/dashboard/chat'
                  ? isLight
                    ? 'bg-stone-900 text-white'
                    : 'bg-slate-800 text-white'
                  : isLight
                    ? 'text-stone-500 hover:text-stone-900 hover:bg-cream-200'
                    : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageCircle size={14} />
              Chat
            </Link>
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
