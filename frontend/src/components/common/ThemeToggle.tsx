import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center h-7 w-14 rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
        isDark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-amber-100 border-amber-300'
      }`}
    >
      {/* Track labels */}
      <Moon
        size={9}
        className={`absolute left-1.5 transition-opacity duration-200 ${
          isDark ? 'opacity-60 text-slate-300' : 'opacity-30 text-amber-400'
        }`}
      />
      <Sun
        size={9}
        className={`absolute right-1.5 transition-opacity duration-200 ${
          isDark ? 'opacity-30 text-slate-500' : 'opacity-60 text-amber-500'
        }`}
      />
      {/* Thumb */}
      <span
        className={`absolute w-5 h-5 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${
          isDark
            ? 'translate-x-1 bg-slate-500'
            : 'translate-x-[1.875rem] bg-amber-400'
        }`}
      />
    </button>
  );
}
