import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { getStrategy } from '../lib/api';
import type { InsightResponse } from 'shared/schemas/insight';
import { CitationPills } from '../components/chat/CitationPills';
import { Loader } from '../components/common/Loader';
import { ErrorBanner } from '../components/common/ErrorBanner';

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
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Your plan</h1>
        <Link
          to="/dashboard/chat"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Ask a question
        </Link>
      </div>

      {/* Scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Saving readiness</h2>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{profile.saving_readiness_score}/10</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Investment readiness</h2>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{profile.investment_readiness_score}/10</p>
        </div>
      </div>

      {/* Narrative */}
      {data.narrative && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-700">{data.narrative}</p>
        </div>
      )}

      {/* Insights */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Insights</h2>
        <div className="space-y-4">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-slate-900">{insight.recommendation}</p>
              <p className="mt-1 text-sm text-slate-600">{insight.principle}</p>
              {insight.behavioral_flags?.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Flags: {insight.behavioral_flags.join(', ')}
                </p>
              )}
              <CitationPills sources={insight.sources} />
            </div>
          ))}
        </div>
      </div>

      {/* 90-day plan */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">90-day action plan</h2>
        <ul className="space-y-3">
          {data.action_plan.map((step, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-indigo-600">{step.time_label}</span>
              <h3 className="font-medium text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      {data.disclaimer && (
        <p className="text-xs text-slate-500">{data.disclaimer}</p>
      )}
    </div>
  );
}
