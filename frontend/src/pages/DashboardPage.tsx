import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { getStrategy } from '../lib/api';
import type { InsightResponse } from 'shared/schemas/insight';
import { CitationPills } from '../components/chat/CitationPills';
import { Loader } from '../components/common/Loader';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { MessageCircle, TrendingUp, PiggyBank } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function c(isLight: boolean, light: string, dark: string) { return isLight ? light : dark; }

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(parseFloat(((1 - Math.pow(1 - p, 3)) * target).toFixed(1)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ─── Score card ───────────────────────────────────────────────────────────────
// Uses inline style for gradient bar to avoid Tailwind dynamic-class pitfalls

const SCORE_VARIANTS = {
  saving: {
    barGradient: 'linear-gradient(to right, #10b981, #2dd4bf)',   // emerald → teal
    iconBgLight: 'bg-emerald-50',
    iconBgDark:  'bg-emerald-500/10',
    iconColor:   'text-emerald-500',
  },
  investment: {
    barGradient: 'linear-gradient(to right, #d4a849, #f59e0b)',   // gold → amber
    iconBgLight: 'bg-amber-50',
    iconBgDark:  'bg-amber-500/10',
    iconColor:   'text-gold-500',
  },
} as const;

function ScoreCard({
  label, icon: Icon, score, narrative, variant, isLight,
}: {
  label: string; icon: React.ElementType; score: number;
  narrative?: string; variant: keyof typeof SCORE_VARIANTS; isLight: boolean;
}) {
  const displayed = useCountUp(score);
  const pct = (displayed / 10) * 100;
  const vs = SCORE_VARIANTS[variant];

  const numColor =
    score >= 7 ? 'text-emerald-500' :
    score >= 4 ? c(isLight, 'text-stone-900', 'text-white') :
    'text-red-500';

  return (
    <div className={`rounded-2xl border p-6 ${c(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          isLight ? vs.iconBgLight : vs.iconBgDark
        }`}>
          <Icon size={18} className={vs.iconColor} />
        </div>
        <span className={`text-sm font-semibold ${c(isLight, 'text-stone-600', 'text-slate-400')}`}>{label}</span>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className={`font-display font-black leading-none text-6xl ${numColor}`}>
          {displayed.toFixed(1)}
        </span>
        <span className={`text-xl mb-1 ${c(isLight, 'text-stone-300', 'text-slate-700')}`}>/10</span>
      </div>

      {/* Gradient bar via inline style — avoids Tailwind JIT not scanning dynamic prop strings */}
      <div className={`h-2 rounded-full overflow-hidden ${c(isLight, 'bg-stone-100', 'bg-white/5')}`}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: vs.barGradient }}
        />
      </div>

      {narrative && (
        <p className={`mt-3 text-sm leading-relaxed italic ${c(isLight, 'text-stone-500', 'text-slate-500')}`}>
          {narrative}
        </p>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ text, isLight }: { text: string; isLight: boolean }) {
  return (
    <h2 className={`font-display font-black text-xl mb-4 ${c(isLight, 'text-stone-900', 'text-white')}`}>
      {text}
    </h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile } = useProfile();
  const { theme }   = useTheme();
  const isLight     = theme === 'light';

  const [data, setData]       = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getStrategy(profile)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e)  => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) return <Loader />;
  if (error)   return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  if (!data)   return null;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className={`font-display font-black text-3xl leading-tight ${c(isLight, 'text-stone-900', 'text-white')}`}>
            Your Financial Plan
          </h1>
          <p className={`text-base mt-1 ${c(isLight, 'text-stone-500', 'text-slate-500')}`}>
            Based on your questionnaire and transaction history
          </p>
        </div>
        <Link
          to="/dashboard/chat"
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            c(isLight,
              'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow shadow-stone-900/20',
              'border border-white/15 text-white hover:bg-white/8',
            )
          }`}
        >
          <MessageCircle size={15} />
          Ask a question
        </Link>
      </div>

      {/* ── Readiness scores ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: '0.08s' }}>
        <ScoreCard
          label="Saving Readiness"
          icon={PiggyBank}
          score={profile.saving_readiness_score}
          narrative={profile.readiness_narrative}
          variant="saving"
          isLight={isLight}
        />
        <ScoreCard
          label="Investment Readiness"
          icon={TrendingUp}
          score={profile.investment_readiness_score}
          narrative={profile.investment_narrative}
          variant="investment"
          isLight={isLight}
        />
      </div>

      {/* ── AI Narrative ───────────────────────────────────────────────────── */}
      {data.narrative && (
        <div className={`rounded-2xl border p-5 animate-fade-up ${
          c(isLight, 'border-stone-200 bg-stone-50', 'border-white/8 bg-white/[0.03]')
        }`} style={{ animationDelay: '0.14s' }}>
          <p className={`text-base font-display font-semibold italic leading-relaxed ${
            c(isLight, 'text-stone-700', 'text-slate-300')
          }`}>
            "{data.narrative}"
          </p>
        </div>
      )}

      {/* ── Insights ───────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: '0.20s' }}>
        <SectionHeading text="Personalised Insights" isLight={isLight} />
        <div className="space-y-3">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 ${
                c(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')
              }`}
            >
              <p className={`font-semibold text-base leading-snug ${c(isLight, 'text-stone-900', 'text-white')}`}>
                {insight.recommendation}
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${c(isLight, 'text-stone-500', 'text-slate-400')}`}>
                {insight.principle}
              </p>
              {insight.behavioral_flags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {insight.behavioral_flags.map((flag) => (
                    <span
                      key={flag}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        c(isLight,
                          'bg-gold-400/10 border-gold-500/30 text-gold-600',
                          'bg-amber-500/10 border-amber-500/25 text-amber-400',
                        )
                      }`}
                    >
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              <CitationPills sources={insight.sources} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 90-Day Action Plan ─────────────────────────────────────────────── */}
      <div>
        <SectionHeading text="90-Day Action Plan" isLight={isLight} />
        <div className="space-y-3">
          {data.action_plan.map((step, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 flex gap-4 ${
                c(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')
              }`}
            >
              {/* Step number — hardcoded styles, no dynamic class props */}
              <div
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-sm border"
                style={isLight
                  ? { background: '#1c1917', borderColor: '#44403c', color: '#fafaf9' }
                  : { background: 'rgba(212,168,73,0.12)', borderColor: 'rgba(212,168,73,0.28)', color: '#e8c547' }
                }
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  c(isLight, 'text-stone-400', 'text-gold-400')
                }`}>
                  {step.time_label}
                </span>
                <h3 className={`font-semibold text-base mt-1 ${c(isLight, 'text-stone-900', 'text-white')}`}>
                  {step.title}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${c(isLight, 'text-stone-500', 'text-slate-400')}`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      {data.disclaimer && (
        <p className={`text-xs leading-relaxed pb-4 ${c(isLight, 'text-stone-400', 'text-white/20')}`}>
          {data.disclaimer}
        </p>
      )}
    </div>
  );
}
