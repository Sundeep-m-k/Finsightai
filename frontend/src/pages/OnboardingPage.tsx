import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft,
  TrendingUp, Shield, PiggyBank, Target,
  DollarSign, Briefcase, Clock,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { useNavSlot } from '../context/NavSlotContext';
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
  { value: 'debt_payoff',    label: 'Pay off debt',               icon: Shield,     grad: 'from-rose-500 to-red-600',      desc: 'Eliminate what you owe first' },
  { value: 'emergency_fund', label: 'Build emergency fund',        icon: PiggyBank,  grad: 'from-amber-500 to-orange-500',  desc: 'Create a financial safety net' },
  { value: 'investing',      label: 'Start investing',             icon: TrendingUp, grad: 'from-emerald-500 to-teal-600',  desc: 'Put money to work for you' },
  { value: 'budgeting',      label: 'Save for something specific', icon: Target,     grad: 'from-violet-500 to-indigo-600', desc: 'A clear goal in mind' },
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

// ─── Theme helpers ────────────────────────────────────────────────────────────

function c(isLight: boolean, light: string, dark: string) {
  return isLight ? light : dark;
}

// ─── Reusable card classes ────────────────────────────────────────────────────

function optionCard(selected: boolean, isLight: boolean) {
  const base = 'transition-all rounded-2xl border cursor-pointer';
  if (selected) {
    return `${base} border-gold-500 ring-2 ring-gold-500/40 ${c(isLight, 'bg-gold-400/8', 'bg-gold-500/10')}`;
  }
  return `${base} ${c(
    isLight,
    'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm',
    'border-slate-800 bg-slate-900/60 hover:border-slate-600',
  )}`;
}

function inputCls(isLight: boolean) {
  return `w-full border rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-colors ${
    c(isLight,
      'bg-white border-stone-200 text-stone-900 placeholder:text-stone-300',
      'bg-slate-900 border-slate-700 text-white placeholder:text-slate-700',
    )
  }`;
}

// ─── Step heading ─────────────────────────────────────────────────────────────

function StepHeading({ heading, sub, isLight }: { heading: string; sub: string; isLight: boolean }) {
  return (
    <div className="mb-8">
      <h2 className={`font-display font-black text-3xl sm:text-4xl leading-tight ${c(isLight, 'text-stone-900', 'text-white')}`}>
        {heading}
      </h2>
      <p className={`mt-3 text-base leading-relaxed ${c(isLight, 'text-stone-500', 'text-slate-400')}`}>{sub}</p>
    </div>
  );
}

// ─── Yes / No buttons ────────────────────────────────────────────────────────

function YesNoButtons({ value, onYes, onNo, isLight }: { value: boolean | null; onYes: () => void; onNo: () => void; isLight: boolean }) {
  return (
    <div className="flex gap-4 mb-6">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          onClick={v ? onYes : onNo}
          className={`flex-1 py-5 rounded-2xl border font-bold text-base transition-all ${optionCard(value === v, isLight)} ${
            value === v
              ? c(isLight, 'text-stone-900', 'text-white')
              : c(isLight, 'text-stone-500', 'text-slate-400')
          }`}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function GoalStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  return (
    <div>
      <StepHeading isLight={isLight} heading="What is your primary financial goal?" sub="We'll build your entire plan around this." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GOALS.map((g) => {
          const Icon = g.icon;
          const selected = form.goal === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setForm(f => ({ ...f, goal: g.value }))}
              className={`text-left p-5 ${optionCard(selected, isLight)}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.grad} flex items-center justify-center mb-4`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className={`font-bold text-base mb-1 ${c(isLight, 'text-stone-900', 'text-white')}`}>{g.label}</div>
              <div className={`text-sm ${c(isLight, 'text-stone-500', 'text-slate-500')}`}>{g.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoneyInputStep({
  form, setForm, field, heading, sub, placeholder, isLight,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  field: 'income' | 'fixedExpenses';
  heading: string;
  sub: string;
  placeholder: string;
  isLight: boolean;
}) {
  return (
    <div>
      <StepHeading isLight={isLight} heading={heading} sub={sub} />
      <div className="relative">
        <div className={`absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>
          <DollarSign size={22} />
        </div>
        <input
          type="number" min="0" inputMode="numeric"
          placeholder={placeholder}
          value={form[field]}
          onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
          className={`${inputCls(isLight)} pl-14 pr-5 py-6 text-4xl font-display font-black`}
          autoFocus
        />
      </div>
      <p className={`mt-3 text-sm ${c(isLight, 'text-stone-400', 'text-slate-600')}`}>
        Enter your average monthly amount in USD.
      </p>
    </div>
  );
}

function StudentLoanStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  return (
    <div>
      <StepHeading isLight={isLight} heading="Do you have student loans?" sub="This affects your debt-to-income ratio and readiness scores." />
      <YesNoButtons
        value={form.hasStudentLoan}
        onYes={() => setForm(f => ({ ...f, hasStudentLoan: true }))}
        onNo={() => setForm(f => ({ ...f, hasStudentLoan: false }))}
        isLight={isLight}
      />
      {form.hasStudentLoan && (
        <div className="space-y-3 animate-fade-up">
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>$</span>
            <input type="number" min="0" placeholder="Total loan balance" value={form.loanBalance}
              onChange={(e) => setForm(f => ({ ...f, loanBalance: e.target.value }))}
              className={`${inputCls(isLight)} pl-8 pr-4 py-4 text-base`} />
          </div>
          <input type="number" min="0" step="0.1" placeholder="Interest rate % (e.g. 6.5)" value={form.loanRate}
            onChange={(e) => setForm(f => ({ ...f, loanRate: e.target.value }))}
            className={`${inputCls(isLight)} px-4 py-4 text-base`} />
        </div>
      )}
    </div>
  );
}

function CreditCardStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  return (
    <div>
      <StepHeading isLight={isLight} heading="Do you carry a credit card balance?" sub="High utilisation lowers your investment readiness score." />
      <YesNoButtons
        value={form.hasCreditCard}
        onYes={() => setForm(f => ({ ...f, hasCreditCard: true }))}
        onNo={() => setForm(f => ({ ...f, hasCreditCard: false }))}
        isLight={isLight}
      />
      {form.hasCreditCard && (
        <div className="space-y-3 animate-fade-up">
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>$</span>
            <input type="number" min="0" placeholder="Current balance owed" value={form.ccBalance}
              onChange={(e) => setForm(f => ({ ...f, ccBalance: e.target.value }))}
              className={`${inputCls(isLight)} pl-8 pr-4 py-4 text-base`} />
          </div>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>$</span>
            <input type="number" min="0" placeholder="Credit limit" value={form.ccLimit}
              onChange={(e) => setForm(f => ({ ...f, ccLimit: e.target.value }))}
              className={`${inputCls(isLight)} pl-8 pr-4 py-4 text-base`} />
          </div>
        </div>
      )}
    </div>
  );
}

function IncomeTypeStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  return (
    <div>
      <StepHeading isLight={isLight} heading="What type of income do you have?" sub="This helps us flag income volatility risks." />
      <div className="space-y-3">
        {INCOME_TYPES.map((t) => {
          const selected = form.incomeType === t.value;
          return (
            <button key={t.value} onClick={() => setForm(f => ({ ...f, incomeType: t.value }))}
              className={`w-full text-left px-5 py-4 flex items-center justify-between ${optionCard(selected, isLight)}`}>
              <div>
                <div className={`font-semibold text-base ${c(isLight, 'text-stone-900', 'text-white')}`}>{t.label}</div>
                <div className={`text-sm mt-0.5 ${c(isLight, 'text-stone-500', 'text-slate-500')}`}>{t.sub}</div>
              </div>
              <Briefcase size={18} className={selected ? 'text-gold-500' : c(isLight, 'text-stone-300', 'text-slate-700')} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  const level = form.riskComfort;
  const colors  = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-500', 'bg-teal-500'];
  const rings   = ['ring-red-500', 'ring-orange-500', 'ring-amber-400', 'ring-emerald-500', 'ring-teal-500'];
  return (
    <div>
      <StepHeading isLight={isLight} heading="How comfortable are you with financial risk?" sub="This shapes your investment strategy recommendations." />
      <div className="text-center mb-10">
        <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full ring-4 mb-4 ${rings[level - 1]} ${c(isLight, 'bg-white shadow', 'bg-slate-900')}`}>
          <span className={`text-5xl font-display font-black ${c(isLight, 'text-stone-900', 'text-white')}`}>{level}</span>
        </div>
        <div className={`font-bold text-xl ${c(isLight, 'text-stone-900', 'text-white')}`}>{RISK_LABELS[level - 1]}</div>
      </div>
      <div className="px-2">
        <input type="range" min={1} max={5} step={1} value={level}
          onChange={(e) => setForm(f => ({ ...f, riskComfort: Number(e.target.value) }))}
          className="w-full cursor-pointer accent-gold-500" />
        <div className={`flex justify-between text-sm mt-2 ${c(isLight, 'text-stone-400', 'text-slate-600')}`}>
          <span>Very cautious</span><span>Very comfortable</span>
        </div>
      </div>
      <div className="flex justify-between mt-6 px-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setForm(f => ({ ...f, riskComfort: n }))}
            className={`w-12 h-12 rounded-full text-base font-bold transition-all ${
              n === level
                ? `${colors[n - 1]} text-white scale-110 shadow-lg`
                : c(isLight, 'bg-cream-200 text-stone-500 hover:bg-cream-300', 'bg-slate-800 text-slate-500 hover:bg-slate-700')
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeHorizonStep({ form, setForm, isLight }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; isLight: boolean }) {
  return (
    <div>
      <StepHeading isLight={isLight} heading="What is your investing time horizon?" sub="When do you plan to need the money you invest?" />
      <div className="space-y-3">
        {TIME_HORIZONS.map((h) => {
          const selected = form.timeHorizon === h.value;
          return (
            <button key={h.value} onClick={() => setForm(f => ({ ...f, timeHorizon: h.value }))}
              className={`w-full text-left px-5 py-5 flex items-center justify-between ${optionCard(selected, isLight)}`}>
              <span className={`font-semibold text-base ${c(isLight, 'text-stone-900', 'text-white')}`}>{h.label}</span>
              <Clock size={18} className={selected ? 'text-gold-500' : c(isLight, 'text-stone-300', 'text-slate-700')} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── canProceed ───────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setQuestionnaire, setSessionId } = useProfile();
  const { theme } = useTheme();
  const { setSlot, clearSlot } = useNavSlot();
  const isLight = theme === 'light';

  const [step, setStep]           = useState(0);
  const [slideDir, setSlideDir]   = useState<'right' | 'left'>('right');
  const [slideKey, setSlideKey]   = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    goal: null, income: '', fixedExpenses: '',
    hasStudentLoan: null, loanBalance: '', loanRate: '',
    hasCreditCard: null, ccBalance: '', ccLimit: '',
    incomeType: null, riskComfort: 3, timeHorizon: null,
  });

  const goNext = () => {
    if (!canProceed(step, form)) return;
    setSlideDir('right'); setSlideKey(k => k + 1); setStep(s => s + 1);
  };
  const goBack = () => {
    if (step === 0) { navigate('/'); return; }
    setSlideDir('left'); setSlideKey(k => k + 1); setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const riskMap: Record<number, RiskTolerance> = { 1: 'low', 2: 'low', 3: 'medium', 4: 'high', 5: 'high' };
    const q = {
      primary_goal:          form.goal ?? 'investing',
      income_monthly:        form.income ? Number(form.income) : undefined,
      expenses_monthly:      form.fixedExpenses ? Number(form.fixedExpenses) : undefined,
      loan_balance:          form.hasStudentLoan && form.loanBalance ? Number(form.loanBalance) : undefined,
      loan_rate:             form.hasStudentLoan && form.loanRate ? Number(form.loanRate) : undefined,
      credit_card_balance:   form.hasCreditCard && form.ccBalance ? Number(form.ccBalance) : undefined,
      cc_limit:              form.hasCreditCard && form.ccLimit ? Number(form.ccLimit) : undefined,
      risk_tolerance:        riskMap[form.riskComfort] ?? 'medium',
      months_until_graduation: undefined,
      income_type:           form.incomeType ?? undefined,
      time_horizon:          form.timeHorizon ?? undefined,
    };
    setQuestionnaire(q);
    try { const sid = await submitOnboard(q); setSessionId(sid); } catch { /* continue */ }
    navigate('/upload');
  };

  const progress     = (step / TOTAL_STEPS) * 100;
  const slideClass   = slideDir === 'right' ? 'animate-slide-right' : 'animate-slide-left';

  // Inject step counter into global nav centre slot
  useEffect(() => {
    setSlot(
      <span className={`text-xs sm:text-sm font-semibold tabular-nums px-3 py-1 rounded-full border ${
        isLight
          ? 'border-stone-200 text-stone-500 bg-stone-100'
          : 'border-white/10 text-slate-400 bg-white/5'
      }`}>
        Step {step + 1} / {TOTAL_STEPS}
      </span>
    );
    return () => clearSlot();
  }, [step, isLight, setSlot, clearSlot]);

  const stepComponents = [
    <GoalStep form={form} setForm={setForm} isLight={isLight} />,
    <MoneyInputStep form={form} setForm={setForm} field="income" isLight={isLight}
      heading="What's your monthly take-home income?"
      sub="After taxes — paycheques, scholarships, part-time work, everything."
      placeholder="e.g. 1800" />,
    <MoneyInputStep form={form} setForm={setForm} field="fixedExpenses" isLight={isLight}
      heading="What are your fixed monthly expenses?"
      sub="Rent, phone, subscriptions — things you pay every month regardless."
      placeholder="e.g. 1100" />,
    <StudentLoanStep  form={form} setForm={setForm} isLight={isLight} />,
    <CreditCardStep   form={form} setForm={setForm} isLight={isLight} />,
    <IncomeTypeStep   form={form} setForm={setForm} isLight={isLight} />,
    <RiskStep         form={form} setForm={setForm} isLight={isLight} />,
    <TimeHorizonStep  form={form} setForm={setForm} isLight={isLight} />,
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${c(isLight, 'bg-cream-100', 'bg-[#0a0a0a]')}`}>

      {/* Progress bar — sits just below the global nav */}
      <div className={`h-1 ${c(isLight, 'bg-stone-200', 'bg-slate-800')}`}>
        <div className="h-full bg-gold-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 pt-3 justify-center">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
            i < step    ? 'bg-gold-500 w-6'
            : i === step ? 'bg-gold-400 w-9'
            : c(isLight, 'bg-stone-200 w-6', 'bg-slate-800 w-6')
          }`} />
        ))}
      </div>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 sm:px-8 py-10">
          <div key={slideKey} className={slideClass}>
            {stepComponents[step]}
          </div>
        </div>
      </div>

      {/* ── Navigation footer ────────────────────────────────────────────── */}
      <footer className={`sticky bottom-0 border-t ${c(isLight, 'bg-cream-100/95 border-stone-200', 'bg-[#0a0a0a]/95 border-white/5')} backdrop-blur-sm`}>
        <div className="max-w-2xl mx-auto px-6 sm:px-8 py-5 flex gap-3">
          <button
            onClick={goBack}
            className={`flex items-center gap-2 px-5 py-4 rounded-2xl border font-semibold text-base transition-all shrink-0 ${
              c(isLight,
                'border-stone-200 text-stone-500 hover:bg-stone-100 hover:text-stone-900',
                'border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-white',
              )
            }`}
          >
            <ChevronLeft size={18} />
            {step === 0 ? 'Home' : 'Back'}
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={goNext}
              disabled={!canProceed(step, form)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                c(isLight,
                  'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow shadow-stone-900/20',
                  'bg-white text-stone-900 hover:bg-cream-100',
                )
              }`}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed(step, form) || submitting}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                c(isLight,
                  'bg-stone-900 text-stone-50 hover:bg-stone-700 shadow shadow-stone-900/20',
                  'bg-white text-stone-900 hover:bg-cream-100',
                )
              }`}
            >
              {submitting
                ? <><div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${c(isLight, 'border-stone-400', 'border-stone-600')}`} /> Analysing…</>
                : <>Analyse My Finances <ChevronRight size={18} /></>}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
