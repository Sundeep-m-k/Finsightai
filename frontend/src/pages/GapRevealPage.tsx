import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { useNavSlot } from '../context/NavSlotContext';
import type { GapItem, UserProfile } from 'shared/schemas/profile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cv = (isLight: boolean, light: string, dark: string) => (isLight ? light : dark);

// ─── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  rent:          { emoji: '🏠', label: 'Rent & Housing' },
  groceries:     { emoji: '🛒', label: 'Groceries' },
  transport:     { emoji: '🚗', label: 'Transport' },
  dining:        { emoji: '🍕', label: 'Food & Dining' },
  subscriptions: { emoji: '📱', label: 'Subscriptions' },
  entertainment: { emoji: '🎬', label: 'Entertainment' },
  education:     { emoji: '📚', label: 'Education' },
  health:        { emoji: '💊', label: 'Health' },
  savings:       { emoji: '🏦', label: 'Savings' },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GapRowData {
  category: string;
  emoji: string;
  stated: number;
  actual: number;
  status: 'red' | 'amber' | 'green';
}

interface Summary {
  actualRate: number;
  statedRate: number;
  gapPct: number;
  costPerMonth: number;
}

// ─── Mock fallback data ────────────────────────────────────────────────────────

const MOCK_GAP_DATA: GapRowData[] = [
  { category: 'Food & Dining',  emoji: '🍕', stated: 200, actual: 487, status: 'red'   },
  { category: 'Savings',        emoji: '🏦', stated: 150, actual: 43,  status: 'red'   },
  { category: 'Entertainment',  emoji: '🎬', stated: 80,  actual: 134, status: 'amber' },
  { category: 'Transport',      emoji: '🚗', stated: 120, actual: 108, status: 'green' },
  { category: 'Subscriptions',  emoji: '📱', stated: 30,  actual: 67,  status: 'amber' },
];

const MOCK_SUMMARY: Summary = { actualRate: 2.4, statedRate: 8.3, gapPct: 5.9, costPerMonth: 106 };

// ─── Data derivation ───────────────────────────────────────────────────────────

function deriveFromProfile(profile: UserProfile): { gapData: GapRowData[]; summary: Summary } | null {
  const gaps = profile.gap_analysis;
  if (!gaps || gaps.length === 0) return null;

  const actualRate = profile.behavioral.savings_rate_pct ?? 0;
  const income     = profile.questionnaire.income_monthly ?? 0;
  const expenses   = profile.questionnaire.expenses_monthly ?? 0;
  const statedRate = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0;
  const rawGap     = profile.behavioral.said_vs_actual_gap_pct ?? (statedRate - actualRate);
  const gapPct     = parseFloat(Math.abs(rawGap).toFixed(1));
  const costPerMonth = income > 0 ? Math.round(income * gapPct / 100) : 0;

  const rows: GapRowData[] = gaps
    .filter((g: GapItem) => g.category !== 'rent' && (g.stated > 0 || g.actual > 0))
    .slice(0, 5)
    .map((g: GapItem) => {
      const meta = CATEGORY_META[g.category] ?? { emoji: '💰', label: g.category };
      return {
        category: meta.label, emoji: meta.emoji,
        stated: Math.round(g.stated), actual: Math.round(g.actual),
        status: g.status as 'red' | 'amber' | 'green',
      };
    });

  if (rows.length === 0) return null;
  return { gapData: rows, summary: { actualRate: parseFloat(actualRate.toFixed(1)), statedRate: parseFloat(statedRate.toFixed(1)), gapPct, costPerMonth } };
}

// ─── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, delay: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const p = Math.min(elapsed / duration, 1);
        setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); };
  }, [target, duration, delay, active]);
  return value;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  red:   { bar: 'bg-red-500',     badge: 'bg-red-500/15 text-red-500 border-red-500/30',              label: 'Over budget',   icon: AlertTriangle },
  amber: { bar: 'bg-amber-400',   badge: 'bg-amber-400/15 text-amber-500 border-amber-400/30',        label: 'Slightly over', icon: TrendingUp    },
  green: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',  label: 'On track',      icon: CheckCircle2  },
};

// ─── Row component ─────────────────────────────────────────────────────────────

function GapRow({ row, visible, index, isLight }: { row: GapRowData; visible: boolean; index: number; isLight: boolean }) {
  const cfg = STATUS_CONFIG[row.status];
  const Icon = cfg.icon;
  const maxVal   = Math.max(row.stated, row.actual, 1);
  const statedPct = (row.stated / maxVal) * 100;
  const actualPct = (row.actual / maxVal) * 100;
  const delta     = Math.round(((row.actual - row.stated) / Math.max(row.stated, 1)) * 100);
  const isOver    = row.actual > row.stated;

  const statedCount = useCountUp(row.stated, 900, index * 400 + 200, visible);
  const actualCount = useCountUp(row.actual, 900, index * 400 + 200, visible);

  return (
    <div
      className={visible ? 'animate-fade-up' : 'invisible'}
      style={{ animationDelay: `${index * 0.35}s`, animationFillMode: 'both' }}
    >
      <div className={`rounded-xl border px-4 py-3 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{row.emoji}</span>
            <span className={`font-semibold text-sm ${cv(isLight, 'text-stone-900', 'text-white')}`}>{row.category}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.badge}`}>
            <Icon size={10} />
            {isOver ? `+${Math.abs(delta)}%` : `-${Math.abs(delta)}%`}
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-1.5">
          <div>
            <div className={`flex justify-between text-xs mb-1 ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>
              <span>You said</span>
              <span className={`font-mono font-medium ${cv(isLight, 'text-stone-600', 'text-slate-400')}`}>${statedCount}</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${cv(isLight, 'bg-stone-100', 'bg-white/8')}`}>
              <div className={`h-full rounded-full animate-bar-fill ${cv(isLight, 'bg-stone-300', 'bg-white/20')}`}
                style={{ width: `${statedPct}%`, animationDelay: `${index * 0.4 + 0.2}s` }} />
            </div>
          </div>
          <div>
            <div className={`flex justify-between text-xs mb-1 ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>
              <span>Reality</span>
              <span className={`font-mono font-bold ${row.status === 'green' ? 'text-emerald-500' : row.status === 'red' ? 'text-red-500' : 'text-amber-500'}`}>
                ${actualCount}
              </span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${cv(isLight, 'bg-stone-100', 'bg-white/8')}`}>
              <div className={`h-full ${cfg.bar} rounded-full animate-bar-fill`}
                style={{ width: `${actualPct}%`, animationDelay: `${index * 0.4 + 0.4}s` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function GapRevealPage() {
  const { profile } = useProfile();
  const { theme }   = useTheme();
  const { setSlot, clearSlot } = useNavSlot();
  const isLight     = theme === 'light';

  const derived   = deriveFromProfile(profile);
  const GAP_DATA  = derived?.gapData ?? MOCK_GAP_DATA;
  const SUMMARY   = derived?.summary ?? MOCK_SUMMARY;
  const isRealData = derived !== null;

  const [visibleCount, setVisibleCount] = useState(0);

  const totalRate  = useCountUp(SUMMARY.actualRate * 10, 800, 400, true);
  const statedRate = useCountUp(SUMMARY.statedRate * 10, 800, 600, true);

  // Inject "Gap analysis" badge into global nav
  useEffect(() => {
    setSlot(
      <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
        isLight
          ? 'border-red-200 bg-red-50 text-red-500'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }`}>
        <AlertTriangle size={11} />
        Gap analysis
      </div>
    );
    return () => clearSlot();
  }, [isLight, setSlot, clearSlot]);

  useEffect(() => {
    GAP_DATA.forEach((_, i) => {
      setTimeout(() => setVisibleCount(i + 1), i * 350 + 500);
    });
  }, [GAP_DATA.length]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${cv(isLight, 'bg-cream-100', 'bg-[#0a0a0a]')}`}>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 xl:px-8 py-4">

        {/* ── Compact heading row + stat cards ─────────────────────────────── */}
        <div className="mb-4 animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            <h1 className={`font-display font-black text-2xl leading-tight ${cv(isLight, 'text-stone-900', 'text-white')}`}>
              What you <span className="text-red-500">actually</span> spent
            </h1>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
              cv(isLight, 'bg-red-50 border-red-200 text-red-500', 'bg-red-500/10 border-red-500/20 text-red-400')
            }`}>
              <AlertTriangle size={10} />
              Gap detected
            </div>
          </div>

          {/* ── Compact stat row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`rounded-xl border px-4 py-3 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
              <p className={`text-xs font-medium mb-0.5 ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>You reported saving</p>
              <p className={`text-2xl font-display font-black ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                {(statedRate / 10).toFixed(1)}%
              </p>
              <p className={`text-xs ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>per month</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${cv(isLight, 'bg-red-50 border-red-200', 'bg-red-500/8 border-red-500/20')}`}>
              <p className={`text-xs font-medium mb-0.5 ${cv(isLight, 'text-red-400', 'text-red-500/70')}`}>Actually saving</p>
              <p className="text-2xl font-display font-black text-red-500">
                {(totalRate / 10).toFixed(1)}%
              </p>
              <p className={`text-xs ${cv(isLight, 'text-red-400', 'text-red-600')}`}>per month</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${cv(isLight, 'bg-amber-50 border-amber-200', 'bg-amber-500/8 border-amber-500/20')}`}>
              <p className={`text-xs font-medium mb-0.5 ${cv(isLight, 'text-amber-500', 'text-amber-500/70')}`}>Behaviour gap</p>
              <p className="text-2xl font-display font-black text-amber-500">{SUMMARY.gapPct}%</p>
              <p className={`text-xs ${cv(isLight, 'text-amber-400', 'text-amber-600')}`}>in savings</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
              <p className={`text-xs font-medium mb-0.5 ${cv(isLight, 'text-stone-400', 'text-slate-500')}`}>Cost per month</p>
              <p className={`text-2xl font-display font-black ${cv(isLight, 'text-stone-900', 'text-white')}`}>${SUMMARY.costPerMonth}</p>
              <p className={`text-xs ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>missed savings</p>
            </div>
          </div>
        </div>

        {/* ── Main layout: gap rows + summary ──────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

          {/* Gap rows */}
          <div className="space-y-2">
            <h2 className={`font-display font-black text-sm uppercase tracking-wider mb-2 ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>
              Category breakdown
            </h2>
            {GAP_DATA.map((row, i) => (
              <GapRow key={row.category} row={row} visible={visibleCount > i} index={i} isLight={isLight} />
            ))}
          </div>

          {/* Summary + CTA */}
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationDelay: '0.3s' }}>
            <h2 className={`font-display font-black text-sm uppercase tracking-wider ${cv(isLight, 'text-stone-400', 'text-slate-600')}`}>
              What this means
            </h2>

            {/* Callout */}
            <div className={`rounded-xl border p-4 ${
              cv(isLight, 'bg-red-50 border-red-200', 'bg-red-500/8 border-red-500/20')
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className={`font-semibold text-sm leading-relaxed ${cv(isLight, 'text-stone-900', 'text-white')}`}>
                    Actual savings rate:{' '}
                    <span className="text-red-500">{SUMMARY.actualRate}%</span>
                    <span className={`font-normal ${cv(isLight, 'text-stone-500', 'text-slate-400')}`}> (reported {SUMMARY.statedRate}%)</span>
                  </p>
                  <p className={`text-xs mt-1 leading-relaxed ${cv(isLight, 'text-stone-500', 'text-slate-400')}`}>
                    <span className="text-amber-500 font-semibold">{SUMMARY.gapPct}% gap</span>{' '}
                    costs you{' '}
                    <span className="text-amber-500 font-semibold">${SUMMARY.costPerMonth}/month</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Insight */}
            <div className={`rounded-xl border p-4 ${cv(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
              <p className={`text-xs leading-relaxed italic font-display font-semibold ${cv(isLight, 'text-stone-700', 'text-slate-300')}`}>
                "The gap between what you think you spend and what you actually spend — that's where wealth is lost."
              </p>
            </div>

            {/* CTA */}
            <Link
              to="/dashboard"
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                cv(isLight,
                  'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow-lg shadow-stone-900/20',
                  'bg-white text-stone-900 hover:bg-cream-100 shadow-lg shadow-white/10',
                )
              }`}
            >
              See Your Readiness Scores
              <ChevronRight size={16} />
            </Link>

            <p className={`text-center text-xs ${cv(isLight, 'text-stone-400', 'text-white/20')}`}>
              {isRealData
                ? 'Based on your uploaded transaction history.'
                : 'Based on sample data.'}
            </p>
          </div>
        </div>
      </div>{/* inner max-w wrapper */}
      </div>{/* overflow-y-auto */}
    </div>
  );
}
