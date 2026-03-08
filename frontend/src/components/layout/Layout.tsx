import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function Layout() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const isChat = pathname === '/dashboard/chat';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isLight ? 'bg-cream-100' : 'bg-[#0a0a0a]'}`}>

      {/* ── Plan / Chat sub-tabs ─────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b px-4 sm:px-6 py-2 flex gap-1 ${
        isLight ? 'bg-cream-100/90 border-stone-200' : 'bg-[#0a0a0a]/90 border-white/8'
      }`}>
        <Link
          to="/dashboard"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard'
              ? isLight
                ? 'bg-stone-900 text-stone-50'
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard/chat'
              ? isLight
                ? 'bg-stone-900 text-stone-50'
                : 'bg-slate-800 text-white'
              : isLight
                ? 'text-stone-500 hover:text-stone-900 hover:bg-cream-200'
                : 'text-slate-500 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageCircle size={14} />
          Chat
        </Link>
      </div>

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <main className={`flex-1 min-h-0 overflow-y-auto ${isChat ? '' : 'py-6 sm:py-8'}`}>
        <div className={`mx-auto max-w-4xl px-4 sm:px-6 ${isChat ? 'h-full flex flex-col' : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
