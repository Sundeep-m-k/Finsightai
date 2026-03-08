import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { getStrategy } from '../lib/api';
import type { InsightResponse } from 'shared/schemas/insight';
import { CitationPills } from '../components/chat/CitationPills';
import { Loader } from '../components/common/Loader';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { MessageCircle, Sparkles, TrendingUp, PiggyBank } from 'lucide-react';

export function DashboardPage() {
  const { profile } = useProfile();
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

  const savingScore = profile.saving_readiness_score;
  const investScore = profile.investment_readiness_score;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Your Financial Plan</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Based on your questionnaire and transaction history
          </p>
        </div>
        <Link
          to="/dashboard/chat"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-lg shadow-indigo-500/20"
        >
          <MessageCircle size={15} />
          Ask a question
        </Link>
      </div>

      {/* Readiness scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <PiggyBank size={16} className="text-emerald-400" />
            </div>
            <span className="text-sm text-slate-400 font-medium">Saving Readiness</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-white">{savingScore.toFixed(1)}</span>
            <span className="text-slate-600 text-lg mb-1">/10</span>
          </div>
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${savingScore * 10}%` }}
            />
          </div>
          {profile.readiness_narrative && (
            <p className="mt-2 text-xs text-slate-500">{profile.readiness_narrative}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-indigo-400" />
            </div>
            <span className="text-sm text-slate-400 font-medium">Investment Readiness</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-white">{investScore.toFixed(1)}</span>
            <span className="text-slate-600 text-lg mb-1">/10</span>
          </div>
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000"
              style={{ width: `${investScore * 10}%` }}
            />
          </div>
          {profile.investment_narrative && (
            <p className="mt-2 text-xs text-slate-500">{profile.investment_narrative}</p>
          )}
        </div>
      </div>

      {/* AI Narrative */}
      {data.narrative && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={15} className="text-indigo-400" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{data.narrative}</p>
          </div>
        </div>
      )}

      {/* Insights */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Personalised Insights</h2>
        <div className="space-y-3">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <p className="font-semibold text-white text-sm leading-snug">{insight.recommendation}</p>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{insight.principle}</p>
              {insight.behavioral_flags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {insight.behavioral_flags.map((flag) => (
                    <span
                      key={flag}
                      className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
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
        <h2 className="text-lg font-bold text-white mb-3">90-Day Action Plan</h2>
        <div className="space-y-3">
          {data.action_plan.map((step, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex gap-4"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                {i + 1}
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{step.time_label}</span>
                <h3 className="font-semibold text-white text-sm mt-0.5">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      {data.disclaimer && (
        <p className="text-xs text-slate-700 leading-relaxed">{data.disclaimer}</p>
      )}
    </div>
  );
}
