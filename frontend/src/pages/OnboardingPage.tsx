import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Sparkles,
  TrendingUp, Shield, PiggyBank, Target,
  DollarSign, Briefcase, Clock,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { submitOnboard } from '../lib/api';
import type { PrimaryGoal, RiskTolerance } from 'shared/schemas/profile';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  goal: PrimaryGoal | null;
  income: string;
  fixedExpenses: string;
  hasStudentLoan: boolean | null;
  loanBalance: string;
  loanRate: string;
  hasCreditCard: boolean | null;
  ccBalance: string;
  ccLimit: string;
  incomeType: string | null;
  riskComfort: number;
  timeHorizon: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8;

const GOALS: { value: PrimaryGoal; label: string; icon: typeof Shield; grad: string; desc: string }[] = [
  { value: 'debt_payoff',    label: 'Pay off debt',               icon: Shield,     grad: 'from-rose-600 to-red-700',      desc: 'Eliminate what you owe first' },
  { value: 'emergency_fund', label: 'Build emergency fund',        icon: PiggyBank,  grad: 'from-amber-500 to-orange-600',  desc: 'Create a financial safety net' },
  { value: 'investing',      label: 'Start investing',             icon: TrendingUp, grad: 'from-emerald-500 to-teal-600',  desc: 'Put money to work for you' },
  { value: 'budgeting',      label: 'Save for something specific', icon: Target,     grad: 'from-indigo-500 to-violet-600', desc: 'A clear goal in mind' },
];

const INCOME_TYPES = [
  { value: 'fixed',     label: 'Fixed salary / wage',  sub: 'Regular paycheque' },
  { value: 'part_time', label: 'Part-time',             sub: 'Variable hours' },
  { value: 'freelance', label: 'Freelance / irregular', sub: 'Project-based income' },
  { value: 'stipend',   label: 'Stipend / fellowship',  sub: 'Research or academic' },
];

const TIME_HORIZONS = [
  { value: 'lt_1yr', label: 'Less than 1 year' },
  { value: '1_3yr',  label: '1–3 years' },
  { value: '3_5yr',  label: '3–5 years' },
  { value: '5plus',  label: '5+ years' },
];

const RISK_LABELS = ['Very cautious', 'Cautious', 'Moderate', 'Comfortable', 'Very comfortable'];

// ─── Step components ──────────────────────────────────────────────────────────

function StepHeading({ step, sub }: { step: string; sub: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{step}</h2>
      <p className="mt-2 text-slate-400 text-sm">{sub}</p>
    </div>
  );
}

function GoalStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div>
      <StepHeading step="What is your primary financial goal?" sub="We'll build your entire plan around this." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map((g) => {
          const Icon = g.icon;
          const selected = form.goal === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setForm(f => ({ ...f, goal: g.value }))}
              className={`text-left p-4 rounded-2xl border transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.grad} flex items-center justify-center mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="font-semibold text-white text-sm">{g.label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{g.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoneyInputStep({
  form, setForm, field, heading, sub, placeholder,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  field: 'income' | 'fixedExpenses';
  heading: string;
  sub: string;
  placeholder: string;
}) {
  return (
    <div>
      <StepHeading step={heading} sub={sub} />
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <DollarSign size={20} />
        </div>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder={placeholder}
          value={form[field]}
          onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-5 text-3xl font-bold text-white placeholder:text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          autoFocus
        />
      </div>
      <p className="mt-3 text-xs text-slate-600">Enter your average monthly amount in USD.</p>
    </div>
  );
}

function StudentLoanStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div>
      <StepHeading step="Do you have student loans?" sub="This affects your debt-to-income ratio and readiness scores." />
      <div className="flex gap-3 mb-6">
        {(['yes', 'no'] as const).map((v) => {
          const selected = form.hasStudentLoan === (v === 'yes');
          return (
            <button
              key={v}
              onClick={() => setForm(f => ({ ...f, hasStudentLoan: v === 'yes' }))}
              className={`flex-1 py-4 rounded-2xl border font-semibold transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              {v === 'yes' ? 'Yes' : 'No'}
            </button>
          );
        })}
      </div>
      {form.hasStudentLoan && (
        <div className="space-y-3 animate-fade-up">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
            <input
              type="number" min="0"
              placeholder="Total loan balance"
              value={form.loanBalance}
              onChange={(e) => setForm(f => ({ ...f, loanBalance: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <input
            type="number" min="0" step="0.1"
            placeholder="Interest rate % (e.g. 6.5)"
            value={form.loanRate}
            onChange={(e) => setForm(f => ({ ...f, loanRate: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      )}
    </div>
  );
}

function CreditCardStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div>
      <StepHeading step="Do you carry a credit card balance?" sub="High utilisation lowers your investment readiness score." />
      <div className="flex gap-3 mb-6">
        {(['yes', 'no'] as const).map((v) => {
          const selected = form.hasCreditCard === (v === 'yes');
          return (
            <button
              key={v}
              onClick={() => setForm(f => ({ ...f, hasCreditCard: v === 'yes' }))}
              className={`flex-1 py-4 rounded-2xl border font-semibold transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              {v === 'yes' ? 'Yes' : 'No'}
            </button>
          );
        })}
      </div>
      {form.hasCreditCard && (
        <div className="space-y-3 animate-fade-up">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
            <input
              type="number" min="0"
              placeholder="Current balance owed"
              value={form.ccBalance}
              onChange={(e) => setForm(f => ({ ...f, ccBalance: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
            <input
              type="number" min="0"
              placeholder="Credit limit"
              value={form.ccLimit}
              onChange={(e) => setForm(f => ({ ...f, ccLimit: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function IncomeTypeStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div>
      <StepHeading step="What type of income do you have?" sub="This helps us flag income volatility risks." />
      <div className="space-y-3">
        {INCOME_TYPES.map((t) => {
          const selected = form.incomeType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setForm(f => ({ ...f, incomeType: t.value }))}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="font-medium text-white text-sm">{t.label}</div>
                <div className="text-slate-500 text-xs">{t.sub}</div>
              </div>
              <Briefcase size={16} className={selected ? 'text-indigo-400' : 'text-slate-700'} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  const level = form.riskComfort;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-500', 'bg-cyan-500'];
  const ringColors = ['ring-red-500', 'ring-orange-500', 'ring-amber-400', 'ring-emerald-500', 'ring-cyan-500'];
  return (
    <div>
      <StepHeading step="How comfortable are you with financial risk?" sub="This shapes your investment strategy recommendations." />
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-900 ring-4 ${ringColors[level - 1]} mb-4`}>
          <span className="text-4xl font-black text-white">{level}</span>
        </div>
        <div className="text-white font-semibold text-lg">{RISK_LABELS[level - 1]}</div>
      </div>
      <div className="px-2">
        <input
          type="range" min={1} max={5} step={1}
          value={level}
          onChange={(e) => setForm(f => ({ ...f, riskComfort: Number(e.target.value) }))}
          className="w-full cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-2">
          <span>Very cautious</span>
          <span>Very comfortable</span>
        </div>
      </div>
      <div className="flex justify-between mt-5 px-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setForm(f => ({ ...f, riskComfort: n }))}
            className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
              n === level ? `${colors[n - 1]} text-white scale-110 shadow-lg` : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeHorizonStep({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div>
      <StepHeading step="What is your investing time horizon?" sub="When do you plan to need the money you invest?" />
      <div className="space-y-3">
        {TIME_HORIZONS.map((h) => {
          const selected = form.timeHorizon === h.value;
          return (
            <button
              key={h.value}
              onClick={() => setForm(f => ({ ...f, timeHorizon: h.value }))}
              className={`w-full text-left px-4 py-4 rounded-2xl border transition-all flex items-center justify-between ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <span className="font-medium text-white">{h.label}</span>
              <Clock size={16} className={selected ? 'text-indigo-400' : 'text-slate-700'} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── canProceed helper ─────────────────────────────────────────────────────────

function canProceed(step: number, form: FormData): boolean {
  switch (step) {
    case 0: return form.goal !== null;
    case 1: return form.income.trim() !== '';
    case 2: return form.fixedExpenses.trim() !== '';
    case 3: return form.hasStudentLoan !== null;
    case 4: return form.hasCreditCard !== null;
    case 5: return form.incomeType !== null;
    case 6: return true;
    case 7: return form.timeHorizon !== null;
    default: return true;
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setQuestionnaire, setSessionId } = useProfile();
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [slideKey, setSlideKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    goal: null,
    income: '',
    fixedExpenses: '',
    hasStudentLoan: null,
    loanBalance: '',
    loanRate: '',
    hasCreditCard: null,
    ccBalance: '',
    ccLimit: '',
    incomeType: null,
    riskComfort: 3,
    timeHorizon: null,
  });

  const goNext = () => {
    if (!canProceed(step, form)) return;
    setSlideDir('right');
    setSlideKey(k => k + 1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 0) { navigate('/'); return; }
    setSlideDir('left');
    setSlideKey(k => k + 1);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const riskMap: Record<number, RiskTolerance> = { 1: 'low', 2: 'low', 3: 'medium', 4: 'high', 5: 'high' };
    const q = {
      primary_goal: form.goal ?? 'investing',
      income_monthly: form.income ? Number(form.income) : undefined,
      expenses_monthly: form.fixedExpenses ? Number(form.fixedExpenses) : undefined,
      loan_balance: form.hasStudentLoan && form.loanBalance ? Number(form.loanBalance) : undefined,
      loan_rate: form.hasStudentLoan && form.loanRate ? Number(form.loanRate) : undefined,
      credit_card_balance: form.hasCreditCard && form.ccBalance ? Number(form.ccBalance) : undefined,
      cc_limit: form.hasCreditCard && form.ccLimit ? Number(form.ccLimit) : undefined,
      risk_tolerance: riskMap[form.riskComfort] ?? 'medium',
      months_until_graduation: undefined,
      income_type: form.incomeType ?? undefined,
      time_horizon: form.timeHorizon ?? undefined,
    };
    setQuestionnaire(q);
    try {
      const sid = await submitOnboard(q);
      setSessionId(sid);
    } catch { /* continue even if backend unavailable */ }
    navigate('/upload');
  };

  const progress = (step / TOTAL_STEPS) * 100;
  const slideClass = slideDir === 'right' ? 'animate-slide-right' : 'animate-slide-left';

  const stepComponents = [
    <GoalStep form={form} setForm={setForm} />,
    <MoneyInputStep form={form} setForm={setForm} field="income"
      heading="What's your monthly take-home income?"
      sub="After taxes — paycheques, scholarships, part-time work, everything."
      placeholder="e.g. 1800" />,
    <MoneyInputStep form={form} setForm={setForm} field="fixedExpenses"
      heading="What are your fixed monthly expenses?"
      sub="Rent, phone, subscriptions — things you pay every month regardless."
      placeholder="e.g. 1100" />,
    <StudentLoanStep form={form} setForm={setForm} />,
    <CreditCardStep form={form} setForm={setForm} />,
    <IncomeTypeStep form={form} setForm={setForm} />,
    <RiskStep form={form} setForm={setForm} />,
    <TimeHorizonStep form={form} setForm={setForm} />,
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-500">FinSight AI</span>
          </div>
          <span className="text-xs text-slate-600 tabular-nums">Step {step + 1} of {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dot row */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i < step ? 'bg-indigo-500 w-5' : i === step ? 'bg-cyan-400 w-7' : 'bg-slate-800 w-5'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div key={slideKey} className={slideClass}>
          {stepComponents[step]}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-10 pt-4 shrink-0 flex gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl border border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-white transition-all text-sm shrink-0"
        >
          <ChevronLeft size={16} />
          {step === 0 ? 'Home' : 'Back'}
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={goNext}
            disabled={!canProceed(step, form)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed(step, form) || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing…</>
              : 'Analyse My Finances →'}
          </button>
        )}
      </div>
    </div>
  );
}
