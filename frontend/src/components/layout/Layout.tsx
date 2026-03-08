import { Outlet, Link } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/dashboard" className="text-lg font-semibold text-indigo-600">
            FinSight AI
          </Link>
          <div className="flex gap-4">
            <Link
              to="/dashboard"
              className="text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              to="/dashboard/chat"
              className="text-slate-600 hover:text-slate-900"
            >
              Chat
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
