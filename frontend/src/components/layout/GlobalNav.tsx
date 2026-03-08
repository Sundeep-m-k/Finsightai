import { Link, useLocation } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { useNavSlot } from '../../context/NavSlotContext';

export function GlobalNav() {
  const { theme } = useTheme();
  const { slot }  = useNavSlot();
  const { pathname } = useLocation();
  const isLight = theme === 'light';

  // Hide "Get started" once the user is inside the app
  const inApp = pathname !== '/';

  return (
    <nav className={`shrink-0 sticky top-0 z-50 backdrop-blur-md border-b flex items-center justify-between px-6 sm:px-8 py-4 ${
      isLight
        ? 'bg-cream-100/95 border-cream-300'
        : 'bg-[#0a0a0a]/95 border-white/5'
    }`}>

      {/* Left — logo */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm ${
          isLight ? 'bg-stone-900 text-gold-400' : 'bg-white text-stone-900'
        }`}>
          FS
        </div>
        <span className={`font-semibold tracking-tight text-sm sm:text-base ${
          isLight ? 'text-stone-900' : 'text-white'
        }`}>
          FinScope AI
        </span>
      </Link>

      {/* Centre — page-specific slot or HackBU badge on landing */}
      <div className="flex-1 flex justify-center px-4">
        {slot ?? (
          <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold ${
            isLight
              ? 'border-gold-600/40 bg-gold-400/10 text-gold-600'
              : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
          }`}>
            <Trophy size={13} />
            HackBU 2026 · Built in 24 hours
          </div>
        )}
      </div>

      {/* Right — dark-mode hint + toggle + CTA */}
      <div className="flex items-center gap-3 shrink-0">
        {isLight && (
          <span className="hidden md:block text-xs text-stone-400 tracking-wide whitespace-nowrap">
            ☾ Best in dark mode
          </span>
        )}
        <ThemeToggle />
        {!inApp && (
          <Link
            to="/onboard"
            className={`hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              isLight
                ? 'bg-stone-900 text-stone-50 hover:bg-stone-700'
                : 'bg-white text-stone-900 hover:bg-cream-100'
            }`}
          >
            Get started <ChevronRight size={14} />
          </Link>
        )}
        {inApp && (
          <Link
            to="/"
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${
              isLight
                ? 'border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-400'
                : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'
            }`}
          >
            ← Home
          </Link>
        )}
      </div>
    </nav>
  );
}
