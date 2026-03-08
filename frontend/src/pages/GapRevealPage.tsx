import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import type { GapItem, UserProfile } from 'shared/schemas/profile';

// ─── Category display metadata ─────────────────────────────────────────────────

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

interface GapRow {
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

const MOCK_GAP_DATA: GapRow[] = [
  { category: 'Food & Dining',  emoji: '🍕', stated: 200, actual: 487, status: 'red'   },
  { category: 'Savings',        emoji: '🏦', stated: 150, actual: 43,  status: 'red'   },
  { category: 'Entertainment',  emoji: '🎬', stated: 80,  actual: 134, status: 'amber' },
  { category: 'Transport',      emoji: '🚗', stated: 120, actual: 108, status: 'green' },
  { category: 'Subscriptions',  emoji: '📱', stated: 30,  actual: 67,  status: 'amber' },
];

const MOCK_SUMMARY: Summary = {
  actualRate: 2.4,
  statedRate: 8.3,
  gapPct: 5.9,
  costPerMonth: 106,
};

// ─── Derive real gap data from profile ────────────────────────────────────────

function deriveFromProfile(profile: UserProfile): { gapData: GapRow[]; summary: Summary } | null {
  const gaps = profile.gap_analysis;
  if (!gaps || gaps.length === 0) return null;

  const actualRate = profile.behavioral.savings_rate_pct ?? 0;
  const income = profile.questionnaire.income_monthly ?? 0;
  const expenses = profile.questionnaire.expenses_monthly ?? 0;
  const statedRate = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0;
  const rawGap = profile.behavioral.said_vs_actual_gap_pct ?? (statedRate - actualRate);
  const gapPct = parseFloat(Math.abs(rawGap).toFixed(1));
  const costPerMonth = income > 0 ? Math.round(income * gapPct / 100) : 0;

  const rows: GapRow[] = gaps
    .filter((g: GapItem) => g.category !== 'rent' && (g.stated > 0 || g.actual > 0))
    .slice(0, 5)
    .map((g: GapItem) => {
      const meta = CATEGORY_META[g.category] ?? { emoji: '💰', label: g.category };
      return {
        category: meta.label,
        emoji: meta.emoji,
        stated: Math.round(g.stated),
        actual: Math.round(g.actual),
        status: g.status as 'red' | 'amber' | 'green',
      };
    });

  if (rows.length === 0) return null;

  return {
    gapData: rows,
    summary: {
      actualRate: parseFloat(actualRate.toFixed(1)),
      statedRate: parseFloat(statedRate.toFixed(1)),
      gapPct,
      costPerMonth,
    },
  };
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
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); };
  }, [target, duration, delay, active]);
  return value;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  red: {
    bar:    'bg-red-500',
    badge:  'bg-red-500/15 text-red-400 border-red-500/30',
    label:  'Over budget',
    icon:   AlertTriangle,
    glow:   'shadow-red-500/20',
  },
  amber: {
    bar:    'bg-amber-400',
    badge:  'bg-amber-400/15 text-amber-400 border-amber-400/30',
    label:  'Slightly over',
    icon:   TrendingUp,
    glow:   'shadow-amber-400/20',
  },
  green: {
    bar:    'bg-emerald-500',
    badge:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    label:  'On track',
    icon:   CheckCircle2,
    glow:   'shadow-emerald-500/20',
  },
};

// ─── Row component ─────────────────────────────────────────────────────────────

function GapRow({ row, visible, index }: { row: GapRow; visible: boolean; index: number }) {
  const cfg = STATUS_CONFIG[row.status];
  const Icon = cfg.icon;
  const maxVal = Math.max(row.stated, row.actual);
  const statedPct = (row.stated / maxVal) * 100;
  const actualPct = (row.actual / maxVal) * 100;
  const delta = Math.round(((row.actual - row.stated) / row.stated) * 100);
  const isOver = row.actual > row.stated;

  const statedCount = useCountUp(row.stated, 900, index * 400 + 200, visible);
  const actualCount = useCountUp(row.actual, 900, index * 400 + 200, visible);

  return (
    <div
      className={`transition-all duration-500 ${visible ? 'animate-row-reveal opacity-100' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 0.4}s`, animationFillMode: 'both' }}
    >
      <div className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg ${cfg.glow}`}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{row.emoji}</span>
            <span className="text-white font-semibold text-sm">{row.category}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.badge}`}>
            <Icon size={11} />
            {isOver ? `+${Math.abs(delta)}%` : `${Math.abs(delta)}% under`}
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-2 mb-3">
          {/* Stated bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>You said</span>
              <span className="text-slate-400 font-mono">${statedCount}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-600 rounded-full animate-bar-fill"
                style={{ width: `${statedPct}%`, animationDelay: `${index * 0.4 + 0.2}s` }}
              />
            </div>
          </div>

          {/* Actual bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Reality</span>
              <span className={`font-mono font-bold ${row.status === 'green' ? 'text-emerald-400' : row.status === 'red' ? 'text-red-400' : 'text-amber-400'}`}>
                ${actualCount}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.bar} rounded-full animate-bar-fill`}
                style={{ width: `${actualPct}%`, animationDelay: `${index * 0.4 + 0.4}s` }}
              />
            </div>
          </div>
        </div>

        {/* Delta label */}
        {row.status !== 'green' && (
          <div className="text-xs text-slate-600">
            {isOver
              ? `You spent $${row.actual - row.stated} more than you reported`
              : `You saved $${row.stated - row.actual} more than expected`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function GapRevealPage() {
  const { profile } = useProfile();

  const derived = deriveFromProfile(profile);
  const GAP_DATA = derived?.gapData ?? MOCK_GAP_DATA;
  const SUMMARY = derived?.summary ?? MOCK_SUMMARY;
  const isRealData = derived !== null;

  const [visibleCount, setVisibleCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(false);

  const totalRate = useCountUp(SUMMARY.actualRate * 10, 800, 400, headingVisible);
  const statedRate = useCountUp(SUMMARY.statedRate * 10, 800, 600, headingVisible);

  useEffect(() => {
    setTimeout(() => setHeadingVisible(true), 200);

    GAP_DATA.forEach((_, i) => {
      setTimeout(() => setVisibleCount(i + 1), i * 400 + 800);
    });

    setTimeout(() => setShowSummary(true), GAP_DATA.length * 400 + 1200);
  }, [GAP_DATA.length]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto w-full px-6 py-10 flex flex-col">
        {/* Heading */}
        <div className={`mb-8 transition-all duration-700 ${headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-4">
            <AlertTriangle size={11} />
            Behavioural gap detected
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Here's what your spending{' '}
            <span className="text-red-400">actually</span>{' '}
            looks like
          </h1>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed">
            We compared what you told us against your real transaction history.
            The results might surprise you.
          </p>

          {/* Rates */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
              <div className="text-xs text-slate-600 mb-1">You reported saving</div>
              <div className="text-2xl font-black text-white">{(statedRate / 10).toFixed(1)}%</div>
              <div className="text-xs text-slate-600">per month</div>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <div className="text-xs text-red-600 mb-1">You're actually saving</div>
              <div className="text-2xl font-black text-red-400">{(totalRate / 10).toFixed(1)}%</div>
              <div className="text-xs text-red-700">per month</div>
            </div>
          </div>
        </div>

        {/* Gap rows */}
        <div className="space-y-3 mb-6">
          {GAP_DATA.map((row, i) => (
            <GapRow
              key={row.category}
              row={row}
              visible={visibleCount > i}
              index={i}
            />
          ))}
        </div>

        {/* Summary callout */}
        <div className={`transition-all duration-700 ${showSummary ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-relaxed">
                  Your actual savings rate is{' '}
                  <span className="text-red-400">{SUMMARY.actualRate}%</span> — you reported{' '}
                  <span className="text-white">{SUMMARY.statedRate}%</span>.
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  This <span className="text-amber-400 font-semibold">{SUMMARY.gapPct}% behavioural gap</span> is costing you{' '}
                  <span className="text-amber-400 font-semibold">${SUMMARY.costPerMonth}/month</span> and is the #1 reason student financial plans fail.
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            See Your Readiness Scores
            <ChevronRight size={18} />
          </Link>

          <p className="mt-4 text-center text-xs text-slate-700">
            {isRealData
              ? 'Based on your uploaded transaction history.'
              : 'Based on sample data. Upload your own transactions for accurate results.'}
          </p>
        </div>
      </div>
    </div>
  );
}
