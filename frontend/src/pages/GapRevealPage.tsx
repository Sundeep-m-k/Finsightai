import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import type { BehavioralFlag } from 'shared/schemas/profile';

const FLAG_LABELS: Partial<Record<BehavioralFlag, string>> = {
  spending_gap: 'Spending gap',
  no_emergency_fund: 'No emergency fund',
  high_credit_utilization: 'High credit utilization',
  lifestyle_creep: 'Lifestyle creep',
  irregular_income: 'Irregular income',
  high_debt_burden: 'High debt burden',
};

export function GapRevealPage() {
  const { profile } = useProfile();
  const { behavioral } = profile;
  const gap = behavioral.said_vs_actual_gap_pct ?? 0;
  const flags = behavioral.flags ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Where your money really goes</h1>
      <p className="mt-1 text-slate-600">
        Based on your data, here’s what we see.
      </p>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-slate-800">Said vs. reality gap</h2>
          <p className="mt-2 text-slate-600">
            You thought you spent about <strong>{gap > 0 ? gap : 0}%</strong> less than you actually did
            {gap > 0 ? ' — very common and fixable.' : '.'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Tracking spending for 2 weeks helps close this gap.
          </p>
        </div>

        {flags.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-800">Behavioral flags</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {flags.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
                >
                  {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </div>
        )}

        {behavioral.expense_breakdown && behavioral.expense_breakdown.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-800">Expense breakdown</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {behavioral.expense_breakdown.map((row, i) => (
                <li key={i}>
                  {row.category}: ${row.amount}
                  {row.percentage != null ? ` (${row.percentage}%)` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          See my plan
        </Link>
      </div>
    </div>
  );
}
