import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, AlertTriangle, TrendingDown, TrendingUp,
  CreditCard, ShieldAlert, Activity, Landmark, ChevronDown, Globe2,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { useNavSlot } from '../context/NavSlotContext';
import { useLiveRate } from '../hooks/useLiveRate';
import type { BehavioralFlag } from 'shared/schemas/profile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cv = (isLight: boolean, light: string, dark: string) => (isLight ? light : dark);

function fmtAmt(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: code,
      maximumFractionDigits: 0,
      notation: amount >= 1_000_000 ? 'compact' : 'standard',
    }).format(Math.round(amount));
  } catch {
    return `${code} ${Math.round(amount).toLocaleString()}`;
  }
}


// ─── Currency data ─────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'CNY', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'KRW', flag: '🇰🇷', name: 'Korean Won' },
  { code: 'SGD', flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'HKD', flag: '🇭🇰', name: 'Hong Kong Dollar' },
  { code: 'TWD', flag: '🇹🇼', name: 'Taiwan Dollar' },
  { code: 'MYR', flag: '🇲🇾', name: 'Malaysian Ringgit' },
  { code: 'PHP', flag: '🇵🇭', name: 'Philippine Peso' },
  { code: 'THB', flag: '🇹🇭', name: 'Thai Baht' },
  { code: 'VND', flag: '🇻🇳', name: 'Vietnamese Dong' },
  { code: 'IDR', flag: '🇮🇩', name: 'Indonesian Rupiah' },
  { code: 'PKR', flag: '🇵🇰', name: 'Pakistani Rupee' },
  { code: 'BDT', flag: '🇧🇩', name: 'Bangladeshi Taka' },
  { code: 'LKR', flag: '🇱🇰', name: 'Sri Lankan Rupee' },
  { code: 'NPR', flag: '🇳🇵', name: 'Nepalese Rupee' },
  { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira' },
  { code: 'GHS', flag: '🇬🇭', name: 'Ghanaian Cedi' },
  { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling' },
  { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand' },
  { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound' },
  { code: 'MXN', flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'BRL', flag: '🇧🇷', name: 'Brazilian Real' },
  { code: 'COP', flag: '🇨🇴', name: 'Colombian Peso' },
  { code: 'PEN', flag: '🇵🇪', name: 'Peruvian Sol' },
  { code: 'CLP', flag: '🇨🇱', name: 'Chilean Peso' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'TRY', flag: '🇹🇷', name: 'Turkish Lira' },
  { code: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'SEK', flag: '🇸🇪', name: 'Swedish Krona' },
  { code: 'NOK', flag: '🇳🇴', name: 'Norwegian Krone' },
  { code: 'DKK', flag: '🇩🇰', name: 'Danish Krone' },
  { code: 'PLN', flag: '🇵🇱', name: 'Polish Zloty' },
  { code: 'NZD', flag: '🇳🇿', name: 'New Zealand Dollar' },
  { code: 'UAH', flag: '🇺🇦', name: 'Ukrainian Hryvnia' },
  { code: 'CZK', flag: '🇨🇿', name: 'Czech Koruna' },
];

// ─── Category / flag metadata ─────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  food: '🍕', dining: '🍕', 'food & dining': '🍕',
  rent: '🏠', housing: '🏠', 'rent & housing': '🏠',
  transport: '🚗', transportation: '🚗',
  subscriptions: '📱', entertainment: '🎬',
  education: '📚', health: '💊', healthcare: '💊',
  savings: '🏦', groceries: '🛒', utilities: '💡', other: '💰',
};
function catEmoji(name: string) { return CAT_EMOJI[name.toLowerCase()] ?? '💰'; }

const FLAG_META: Record<BehavioralFlag, { label: string; icon: typeof AlertTriangle; color: string }> = {
  spending_gap:            { label: 'Spending gap detected',        icon: TrendingDown,  color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  lifestyle_creep:         { label: 'Lifestyle creep risk',         icon: TrendingUp,    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  no_emergency_fund:       { label: 'No emergency fund',            icon: ShieldAlert,   color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  high_credit_utilization: { label: 'High credit card utilisation', icon: CreditCard,    color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  high_debt_burden:        { label: 'High debt burden',             icon: Landmark,      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  irregular_income:        { label: 'Irregular income detected',    icon: Activity,      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
};

const BAR_COLORS = ['bg-gold-500', 'bg-amber-400', 'bg-stone-400', 'bg-stone-300', 'bg-stone-200'];

// ─── Count-up ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800, delay = 0): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    setVal(0);
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf.current); };
  }, [target, duration, delay]);
  return val;
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

function AnimatedBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="h-1.5 rounded-full overflow-hidden w-full bg-stone-200 dark:bg-white/8">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, usdAmount, accent, sub, isLight, homeCurrency, rate }: {
  label: string; usdAmount: number; accent: string; sub?: string;
  isLight: boolean; homeCurrency: string | null; rate: number | null;
}) {
  const displayed = useCountUp(usdAmount, 800, 350);
  const homeAmt = (rate !== null && homeCurrency && rate > 0) ? displayed * rate : null;

  return (
    <div className={`rounded-2xl border p-5 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>{label}</p>
      <p className={`font-display font-black text-3xl leading-none ${accent}`}>
        {fmtAmt(displayed, 'USD')}
      </p>
      {homeAmt !== null && homeCurrency && (
        <p className={`text-xs mt-1 font-medium ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>
          ≈ {fmtAmt(homeAmt, homeCurrency)}
        </p>
      )}
      {sub && <p className={`text-xs mt-1 ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>{sub}</p>}
    </div>
  );
}

// ─── Savings rate card ────────────────────────────────────────────────────────

function SavingsRateCard({ pct, isLight }: { pct: number; isLight: boolean }) {
  const [d, setD] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    setD(0);
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 800, 1);
        setD(parseFloat(((1 - Math.pow(1 - p, 3)) * pct).toFixed(1)));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, 350);
    return () => { clearTimeout(t); cancelAnimationFrame(raf.current); };
  }, [pct]);

  const accent = pct >= 10 ? 'text-emerald-500' : pct >= 5 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className={`rounded-2xl border p-5 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>Savings rate</p>
      <p className={`font-display font-black text-3xl leading-none ${accent}`}>{d.toFixed(1)}%</p>
      <p className={`text-xs mt-1 ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>of income saved</p>
    </div>
  );
}

// ─── Period toggle ────────────────────────────────────────────────────────────

function PeriodToggle({ period, onChange, isLight }: { period: 'monthly' | 'annual'; onChange: (p: 'monthly' | 'annual') => void; isLight: boolean }) {
  return (
    <div className={`inline-flex rounded-xl border p-0.5 ${cv(isLight, 'bg-stone-100 border-stone-200', 'bg-white/5 border-white/8')}`}>
      {(['monthly', 'annual'] as const).map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
          period === p
            ? cv(isLight, 'bg-stone-900 text-stone-50 shadow-sm', 'bg-white text-stone-900 shadow-sm')
            : cv(isLight, 'text-stone-500 hover:text-stone-700', 'text-slate-500 hover:text-white')
        }`}>
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Quick-pick currencies (top international student origins) ────────────────

const QUICK_CURRENCIES = [
  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'CNY', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'KRW', flag: '🇰🇷', name: 'Korean Won' },
  { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira' },
  { code: 'BRL', flag: '🇧🇷', name: 'Brazilian Real' },
  { code: 'MXN', flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'PKR', flag: '🇵🇰', name: 'Pakistani Rupee' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
];

// ─── More-currencies dropdown ─────────────────────────────────────────────────

function MoreCurrencyDropdown({ value, onChange, isLight }: {
  value: string | null; onChange: (v: string | null) => void; isLight: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = search
    ? CURRENCIES.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
    : CURRENCIES;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
          cv(isLight, 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-400 hover:text-stone-700', 'border-white/8 bg-white/3 text-slate-500 hover:border-white/20 hover:text-white')
        }`}
      >
        More
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1.5 z-50 w-64 rounded-xl border shadow-2xl overflow-hidden ${
          cv(isLight, 'bg-white border-stone-200', 'bg-[#141414] border-white/10')
        }`}>
          <div className={`p-2 border-b ${cv(isLight, 'border-stone-100', 'border-white/8')}`}>
            <input
              autoFocus
              type="text"
              placeholder="Search currency…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                cv(isLight, 'bg-stone-50 text-stone-900 placeholder:text-stone-400', 'bg-white/5 text-white placeholder:text-white/30')
              }`}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map(c => (
              <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  value === c.code
                    ? cv(isLight, 'bg-gold-400/15 text-stone-900', 'bg-gold-500/15 text-white')
                    : cv(isLight, 'hover:bg-stone-50 text-stone-800', 'hover:bg-white/5 text-slate-200')
                }`}>
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="font-semibold">{c.code}</span>
                <span className={`text-xs ml-auto truncate max-w-[100px] ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Celebration particles ────────────────────────────────────────────────────

const PARTICLES = [
  { x:   0, y: -135, c: '#d4a849', s: 11, d:   0 },
  { x: -70, y: -115, c: '#4ade80', s:  7, d:  80 },
  { x:  70, y: -115, c: '#f59e0b', s:  7, d: 120 },
  { x:-145, y:  -15, c: '#d4a849', s:  9, d:  40 },
  { x: 145, y:  -15, c: '#4ade80', s:  9, d: 160 },
  { x:-110, y:  -75, c: '#f59e0b', s:  6, d: 200 },
  { x: 110, y:  -75, c: '#d4a849', s:  6, d:  60 },
  { x: -80, y:  115, c: '#4ade80', s:  8, d: 100 },
  { x:  80, y:  115, c: '#d4a849', s:  8, d: 140 },
  { x:   0, y:  145, c: '#f59e0b', s: 11, d: 180 },
  { x:-125, y:   85, c: '#d4a849', s:  6, d: 220 },
  { x: 125, y:   85, c: '#4ade80', s:  6, d:  20 },
  { x: -40, y: -155, c: '#f59e0b', s:  5, d: 260 },
  { x:  40, y: -155, c: '#d4a849', s:  5, d: 300 },
];

function getMotivation(months: number) {
  if (months >= 24) return { line: 'Two years of clarity.', sub: 'You\'re building a real financial story. Keep going.' };
  if (months >= 12) return { line: 'A full year of data.', sub: 'You\'re already ahead of 95% of people your age.' };
  if (months >= 6)  return { line: 'Six months consistent.', sub: 'Half a year of tracking is rare. That\'s real discipline.' };
  if (months >= 3)  return { line: 'A solid quarter.', sub: 'Three months of data gives us real patterns to work with.' };
  if (months >= 1)  return { line: 'Strong first step.', sub: 'Every financial journey starts with a single month.' };
  return { line: 'You\'re starting fresh.', sub: 'Upload more history anytime to improve your analysis.' };
}

function CelebrationModal({ months, onDismiss }: { months: number; onDismiss: () => void }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  const { line, sub } = getMotivation(months);

  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * months));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [months]);

  useEffect(() => {
    const t = setTimeout(onDismiss, 4800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-md cursor-pointer"
      onClick={onDismiss}
    >
      <div
        className="relative text-center px-8 select-none animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Burst particles */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none" style={{ transform: 'translate(-50%,-50%)' }}>
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-burst"
              style={{
                width: p.s, height: p.s,
                backgroundColor: p.c,
                top: '50%', left: '50%',
                marginTop: -p.s / 2, marginLeft: -p.s / 2,
                ['--bx' as string]: `${p.x}px`,
                ['--by' as string]: `${p.y}px`,
                animationDelay: `${p.d}ms`,
              }}
            />
          ))}
        </div>

        {/* Trophy */}
        <div className="text-7xl mb-4 inline-block" style={{ animation: 'bounce 1s ease-in-out infinite' }}>🏆</div>

        {/* Big number */}
        <div
          className="font-display font-black leading-none text-gold-400"
          style={{ fontSize: 'clamp(6rem, 20vw, 10rem)' }}
        >
          {count}
        </div>
        <p className="font-display font-semibold text-white mt-2" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
          months of data
        </p>

        {/* Motivational message */}
        <div className="mt-6 max-w-xs mx-auto">
          <p className="text-white font-semibold text-lg">{line}</p>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">{sub}</p>
        </div>

        {/* Progress bar */}
        <div className="mt-8 w-48 mx-auto h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gold-400 rounded-full animate-shrink-w" style={{ animationDuration: '4.8s' }} />
        </div>
        <p className="text-white/25 text-xs mt-3">tap anywhere to continue</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ExpenseSummaryPage() {
  const { profile } = useProfile();
  const { theme } = useTheme();
  const { setSlot, clearSlot } = useNavSlot();
  const navigate = useNavigate();
  const isLight = theme === 'light';

  const [celebrated, setCelebrated] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [homeCurrency, setHomeCurrency] = useState<string | null>(() =>
    localStorage.getItem('finscope_home_currency') ?? null,
  );

  const { rate } = useLiveRate('USD', homeCurrency);

  const mult = period === 'annual' ? 12 : 1;
  const bh = profile.behavioral;
  const q  = profile.questionnaire;

  const income   = q.income_monthly ?? 0;
  const spending = bh.avg_monthly_spending ?? q.expenses_monthly ?? 0;
  const saved    = Math.max(0, income - spending);
  const savingsRatePct = income > 0 ? parseFloat(((saved / income) * 100).toFixed(1)) : 0;
  const months   = profile.analysis_period_months ?? 1;
  const breakdown = bh.expense_breakdown ?? [];
  const flags     = bh.flags ?? [];

  const handleSetHome = useCallback((v: string | null) => {
    setHomeCurrency(v);
    if (v) localStorage.setItem('finscope_home_currency', v);
    else localStorage.removeItem('finscope_home_currency');
  }, []);

  const dismiss = useCallback(() => setCelebrated(true), []);

  // Inject months badge into global nav
  useEffect(() => {
    setSlot(
      <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
        isLight
          ? 'border-gold-500/40 bg-gold-400/10 text-gold-600'
          : 'border-gold-500/30 bg-gold-500/10 text-gold-400'
      }`}>
        <span>🏆</span>
        {months} month{months !== 1 ? 's' : ''} of data
      </div>
    );
    return () => clearSlot();
  }, [months, isLight, setSlot, clearSlot]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${cv(isLight, 'bg-cream-100', 'bg-[#0a0a0a]')}`}>

      {/* ── Celebration modal ─────────────────────────────────────────────────── */}
      {!celebrated && <CelebrationModal months={months} onDismiss={dismiss} />}

      {/* ── Content ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 xl:px-8 py-4">

        {/* ── Compact header row: title + period toggle ─────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-4 animate-fade-up">
          <div>
            <h1 className={`font-display font-black text-2xl leading-tight ${cv(isLight, 'text-stone-900', 'text-white')}`}>
              Your spending,{' '}
              <span className="text-gold-500">by the numbers.</span>
            </h1>
            <p className={`text-xs mt-0.5 ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>
              Every transaction categorised · compare against what you reported
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PeriodToggle period={period} onChange={setPeriod} isLight={isLight} />
          </div>
        </div>

        {/* ── Currency bar (compact) ────────────────────────────────────────── */}
        <div className={`flex flex-wrap items-center gap-2 mb-4 px-3 py-2 rounded-xl border animate-fade-up ${
          cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')
        }`} style={{ animationDelay: '0.10s' }}>
          <Globe2 size={13} className="text-gold-500 shrink-0" />
          <span className={`text-xs font-medium shrink-0 ${cv(isLight, 'text-stone-500', 'text-slate-500')}`}>Home currency:</span>

          {QUICK_CURRENCIES.map(qc => {
            const selected = homeCurrency === qc.code;
            return (
              <button key={qc.code} onClick={() => handleSetHome(selected ? null : qc.code)} title={qc.name}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  selected
                    ? 'border-gold-500 shadow-sm'
                    : cv(isLight, 'border-stone-200 text-stone-600 hover:border-stone-400', 'border-white/8 text-slate-400 hover:border-white/25')
                }`}
                style={selected ? { background: 'rgba(212,168,73,0.18)', borderColor: '#d4a849' } : {}}
              >
                <span className="text-sm leading-none">{qc.flag}</span>
                <span>{qc.code}</span>
              </button>
            );
          })}

          {homeCurrency && !QUICK_CURRENCIES.find(q => q.code === homeCurrency) && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold"
              style={{ background: 'rgba(212,168,73,0.18)', borderColor: '#d4a849' }}>
              <span className="text-sm">{CURRENCIES.find(c => c.code === homeCurrency)?.flag ?? '🌐'}</span>
              <span>{homeCurrency}</span>
            </span>
          )}

          <MoreCurrencyDropdown value={homeCurrency} onChange={handleSetHome} isLight={isLight} />

          {homeCurrency && rate && (
            <span className={`ml-auto text-xs font-medium ${cv(isLight, 'text-emerald-600', 'text-emerald-400')}`}>
              1 USD = {rate >= 1000 ? Math.round(rate).toLocaleString() : rate >= 10 ? rate.toFixed(1) : rate.toFixed(3)} {homeCurrency}
            </span>
          )}
          {homeCurrency && (
            <button onClick={() => handleSetHome(null)} className={`text-xs ${cv(isLight, 'text-stone-400 hover:text-red-500', 'text-slate-600 hover:text-red-400')}`}>✕</button>
          )}
        </div>

        {/* ── Main 2-col grid ───────────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] animate-fade-up" style={{ animationDelay: '0.12s' }}>

          {/* Left: stat cards */}
          <div className="space-y-3">
            <h2 className={`font-display font-black text-base ${cv(isLight, 'text-stone-900', 'text-white')}`}>
              {period === 'monthly' ? 'Monthly overview' : 'Annual overview'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label={period === 'monthly' ? 'Monthly income' : 'Annual income'}
                usdAmount={income * mult}
                accent={cv(isLight, 'text-stone-900', 'text-white')}
                sub={period === 'annual' ? `${fmtAmt(income, 'USD')}/mo` : 'From questionnaire'}
                homeCurrency={homeCurrency}
                rate={rate}
                isLight={isLight}
              />
              <StatCard
                label={period === 'monthly' ? 'Actual spending' : 'Total spending'}
                usdAmount={spending * mult}
                accent="text-red-500"
                sub={period === 'annual' ? `${fmtAmt(spending, 'USD')}/mo avg` : 'Per month avg'}
                homeCurrency={homeCurrency}
                rate={rate}
                isLight={isLight}
              />
              <StatCard
                label={period === 'monthly' ? 'Saved per month' : 'Total saved'}
                usdAmount={saved * mult}
                accent="text-emerald-500"
                sub={period === 'annual' ? `${fmtAmt(saved, 'USD')}/mo` : 'Income minus spending'}
                homeCurrency={homeCurrency}
                rate={rate}
                isLight={isLight}
              />
              <SavingsRateCard pct={savingsRatePct} isLight={isLight} />
            </div>

            {/* Flags */}
            {flags.length > 0 && (
              <div className="mt-1">
                <h2 className={`font-display font-black text-base mb-2 ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                  Issues we spotted
                </h2>
                <div className="space-y-1.5">
                  {flags.map((flag) => {
                    const meta = FLAG_META[flag];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={flag} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium ${meta.color}`}>
                        <Icon size={15} className="shrink-0" />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: breakdown */}
          {breakdown.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`font-display font-black text-base ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                  Spending breakdown
                </h2>
                <span className={`text-xs ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>
                  {period === 'monthly' ? 'per month' : 'per year'}
                </span>
              </div>
              <div className={`rounded-2xl border divide-y ${
                cv(isLight, 'bg-white border-stone-200 divide-stone-100', 'bg-white/[0.03] border-white/8 divide-white/5')
              }`}>
                {breakdown.map((cat, i) => {
                  const pct = cat.percentage ?? 0;
                  const monthlyAmt = cat.amount;
                  const displayAmt = Math.round(monthlyAmt * mult);
                  const homeAmt = (rate && homeCurrency && rate > 0) ? displayAmt * rate : null;
                  const barColor = BAR_COLORS[i] ?? 'bg-stone-200';
                  return (
                    <div key={cat.category} className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{catEmoji(cat.category)}</span>
                          <div>
                            <p className={`text-xs font-semibold capitalize ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                              {cat.category}
                            </p>
                            <p className={`text-xs ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>{pct}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-display font-bold text-sm tabular-nums ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                            {fmtAmt(displayAmt, 'USD')}
                          </p>
                          {homeAmt !== null && homeCurrency && (
                            <p className={`text-xs ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>
                              ≈ {fmtAmt(homeAmt, homeCurrency)}
                            </p>
                          )}
                        </div>
                      </div>
                      <AnimatedBar pct={pct} color={barColor} delay={200 + i * 100} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────────── */}
        <div className="mt-4 animate-fade-up pb-4" style={{ animationDelay: '0.2s' }}>
          <div className="flex gap-3">
            <Link
              to="/gap"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                cv(isLight,
                  'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow-lg shadow-stone-900/20',
                  'bg-white text-stone-900 hover:bg-cream-100 shadow-lg shadow-white/10',
                )
              }`}
            >
              Show me the gaps
              <ChevronRight size={18} />
            </Link>
            <button
              onClick={() => navigate('/upload')}
              className={`px-4 py-3 rounded-2xl font-semibold text-sm border transition-all ${
                cv(isLight,
                  'border-stone-200 text-stone-600 hover:bg-stone-50',
                  'border-white/10 text-slate-400 hover:bg-white/5',
                )
              }`}
            >
              Re-upload
            </button>
          </div>
        </div>
      </div>{/* inner max-w wrapper */}
      </div>{/* overflow-y-auto */}
    </div>
  );
}
