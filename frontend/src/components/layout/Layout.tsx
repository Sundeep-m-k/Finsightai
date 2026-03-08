import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sparkles, LayoutDashboard, MessageCircle } from 'lucide-react';

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-6 py-3 sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">FinSight AI</span>
          </Link>
          <div className="flex gap-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-slate-800 text-white'
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
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageCircle size={14} />
              Chat
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
