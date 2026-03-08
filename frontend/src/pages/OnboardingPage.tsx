import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { submitOnboard } from '../lib/api';
import type { PrimaryGoal, RiskTolerance } from 'shared/schemas/profile';

const GOALS: { value: PrimaryGoal; label: string }[] = [
  { value: 'budgeting', label: 'Get a better budget' },
  { value: 'debt_payoff', label: 'Pay off debt' },
  { value: 'emergency_fund', label: 'Build an emergency fund' },
  { value: 'investing', label: 'Start investing' },
];

const RISK: { value: RiskTolerance; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, setQuestionnaire, setSessionId } = useProfile();
  const [income, setIncome] = useState(profile.questionnaire.income_monthly ?? '');
  const [expenses, setExpenses] = useState(profile.questionnaire.expenses_monthly ?? '');
  const [loan, setLoan] = useState(profile.questionnaire.loan_balance ?? '');
  const [cc, setCc] = useState(profile.questionnaire.credit_card_balance ?? '');
  const [goal, setGoal] = useState<PrimaryGoal>(profile.questionnaire.primary_goal);
  const [risk, setRisk] = useState<RiskTolerance>(profile.questionnaire.risk_tolerance ?? 'medium');
  const [months, setMonths] = useState(profile.questionnaire.months_until_graduation ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const q = {
      income_monthly: income ? Number(income) : undefined,
      expenses_monthly: expenses ? Number(expenses) : undefined,
      loan_balance: loan ? Number(loan) : undefined,
      credit_card_balance: cc ? Number(cc) : undefined,
      primary_goal: goal,
      risk_tolerance: risk,
      months_until_graduation: months ? Number(months) : undefined,
    };
    setQuestionnaire(q);
    setSubmitting(true);
    try {
      const sid = await submitOnboard(q);
      setSessionId(sid);
      navigate('/upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Is the backend running on port 8000?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Quick questionnaire</h1>
      <p className="mt-1 text-slate-600">Help us personalize your plan.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Monthly income ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Monthly expenses ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Loan balance ($, optional)</label>
          <input
            type="number"
            min="0"
            value={loan}
            onChange={(e) => setLoan(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Credit card balance ($, optional)</label>
          <input
            type="number"
            min="0"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Primary goal</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as PrimaryGoal)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Risk tolerance (optional)</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as RiskTolerance)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {RISK.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Months until graduation (optional)</label>
          <input
            type="number"
            min="0"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
