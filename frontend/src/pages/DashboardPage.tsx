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

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((eased * target).toFixed(1)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({
  label,
  icon: Icon,
  score,
  narrative,
  barColor,
  iconBg,
  iconColor,
  isLight,
}: {
  label: string;
  icon: React.ElementType;
  score: number;
  narrative?: string;
  barColor: string;
  iconBg: string;
  iconColor: string;
  isLight: boolean;
}) {
  const displayed = useCountUp(score);

  return (
    <div className={`rounded-2xl border p-5 ${
      isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <span className={`text-sm font-medium ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-5xl font-display font-black leading-none ${isLight ? 'text-stone-900' : 'text-white'}`}>
          {displayed.toFixed(1)}
        </span>
        <span className={`text-lg mb-1 ${isLight ? 'text-stone-300' : 'text-slate-600'}`}>/10</span>
      </div>
      <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-cream-300' : 'bg-slate-800'}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${(displayed / 10) * 100}%` }}
        />
      </div>
      {narrative && (
        <p className={`mt-3 text-xs leading-relaxed italic ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
          {narrative}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile } = useProfile();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [data, setData] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStrategy(profile)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`font-display font-black text-2xl leading-tight ${isLight ? 'text-stone-900' : 'text-white'}`}>
            Your Financial Plan
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-stone-500' : 'text-slate-500'}`}>
            Based on your questionnaire and transaction history
          </p>
        </div>
        <Link
          to="/dashboard/chat"
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isLight
              ? 'bg-stone-900 text-white hover:bg-stone-700 shadow shadow-stone-200'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
        >
          <MessageCircle size={15} />
          Ask a question
        </Link>
      </div>

      {/* Readiness scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard
          label="Saving Readiness"
          icon={PiggyBank}
          score={profile.saving_readiness_score}
          narrative={profile.readiness_narrative}
          barColor="bg-gradient-to-r from-emerald-500 to-teal-400"
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          isLight={isLight}
        />
        <ScoreCard
          label="Investment Readiness"
          icon={TrendingUp}
          score={profile.investment_readiness_score}
          narrative={profile.investment_narrative}
          barColor="bg-gradient-to-r from-indigo-500 to-cyan-400"
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          isLight={isLight}
        />
      </div>

      {/* AI Narrative */}
      {data.narrative && (
        <div className={`rounded-2xl border p-5 ${
          isLight
            ? 'border-stone-200 bg-stone-50'
            : 'border-indigo-500/20 bg-indigo-500/5'
        }`}>
          <p className={`text-sm leading-relaxed italic ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
            "{data.narrative}"
          </p>
        </div>
      )}

      {/* Insights */}
      <div>
        <h2 className={`font-display font-bold text-lg mb-3 ${isLight ? 'text-stone-900' : 'text-white'}`}>
          Personalised Insights
        </h2>
        <div className="space-y-3">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${
                isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <p className={`font-semibold text-sm leading-snug ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {insight.recommendation}
              </p>
              <p className={`mt-1.5 text-sm leading-relaxed ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {insight.principle}
              </p>
              {insight.behavioral_flags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {insight.behavioral_flags.map((flag) => (
                    <span
                      key={flag}
                      className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium"
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

      {/* 90-day action plan */}
      <div>
        <h2 className={`font-display font-bold text-lg mb-3 ${isLight ? 'text-stone-900' : 'text-white'}`}>
          90-Day Action Plan
        </h2>
        <div className="space-y-3">
          {data.action_plan.map((step, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 flex gap-4 ${
                isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center font-display font-bold text-sm ${
                isLight
                  ? 'bg-stone-100 border-stone-200 text-stone-500'
                  : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
              }`}>
                {i + 1}
              </div>
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  isLight ? 'text-stone-400' : 'text-indigo-400'
                }`}>
                  {step.time_label}
                </span>
                <h3 className={`font-semibold text-sm mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  {step.title}
                </h3>
                <p className={`mt-1 text-sm leading-relaxed ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      {data.disclaimer && (
        <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-400' : 'text-slate-700'}`}>
          {data.disclaimer}
        </p>
      )}
    </div>
  );
}
