import type { UserProfile } from 'shared/schemas/profile';
import { Lock, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

interface Gate {
  label: string;
  passed: boolean;
  description: string;
}

export function InvestmentReadinessGate({ profile, isLight }: Props) {
  const { behavioral, questionnaire, investment_readiness_score } = profile;
  
  // Only show if investment score is low
  if (investment_readiness_score >= 6.5) {
    return null;
  }
  
  const monthlyIncome = questionnaire.income_monthly || 0;
  const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
  const surplus = monthlyIncome - monthlyExpenses;
  const emergencyFund = surplus > 0 ? (surplus / monthlyExpenses) : 0;
  
  const ccUtilization = questionnaire.cc_limit ? 
    ((questionnaire.credit_card_balance || 0) / questionnaire.cc_limit) * 100 : 0;
  
  const gates: Gate[] = [
    {
      label: 'Emergency fund minimum',
      passed: emergencyFund >= 0.25 || surplus > 200,
      description: emergencyFund >= 0.25 
        ? `✓ ${(emergencyFund * 100).toFixed(0)}% of monthly expenses saved`
        : `Need $${Math.max(0, monthlyExpenses * 0.25).toFixed(0)} minimum buffer`
    },
    {
      label: 'Credit card health',
      passed: ccUtilization < 30,
      description: ccUtilization < 30 
        ? `✓ ${ccUtilization.toFixed(0)}% utilization (healthy)`
        : `${ccUtilization.toFixed(0)}% utilization — reduce to below 30%`
    },
    {
      label: 'Consistent saving habit',
      passed: !behavioral.flags.includes('spending_gap') && 
              !behavioral.flags.includes('irregular_income'),
      description: !behavioral.flags.includes('spending_gap') 
        ? '✓ Regular savings pattern established'
        : 'Save consistently for 3+ months'
    }
  ];
  
  const passedCount = gates.filter(g => g.passed).length;
  const totalGates = gates.length;
  
  // What unlocks investing
  const unlockActions = [
    !gates[0].passed && 'Build $1000 emergency reserve',
    !gates[1].passed && 'Bring CC utilization below 30%',
    !gates[2].passed && 'Save for 3 consecutive months'
  ].filter(Boolean);

  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        Investment Readiness Gate
      </h2>
      <div className={`rounded-2xl border overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-br from-orange-50 to-red-50/50 border-orange-200'
          : 'bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20'
      }`}>
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-orange-100' : 'bg-orange-500/15'
            }`}>
              <Lock size={20} className="text-orange-500" />
            </div>
            <div>
              <h3 className={`font-display font-bold text-base ${
                isLight ? 'text-stone-900' : 'text-white'
              }`}>
                Not Ready to Invest Yet — Here's Why
              </h3>
              <p className={`text-xs mt-0.5 ${
                isLight ? 'text-stone-600' : 'text-slate-400'
              }`}>
                {passedCount}/{totalGates} requirements met
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className={`h-2 rounded-full overflow-hidden ${
            isLight ? 'bg-stone-200' : 'bg-slate-800'
          }`}>
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
              style={{ width: `${(passedCount / totalGates) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Gates */}
        <div className={`border-t ${
          isLight ? 'border-orange-200 bg-white/50' : 'border-orange-500/20 bg-slate-900/20'
        }`}>
          <div className="p-5 space-y-3">
            {gates.map((gate, i) => (
              <div
                key={i}
                className="flex items-start gap-3"
              >
                <div className={`shrink-0 mt-0.5 ${
                  gate.passed 
                    ? 'text-emerald-500' 
                    : isLight ? 'text-stone-400' : 'text-slate-600'
                }`}>
                  {gate.passed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    gate.passed 
                      ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                      : isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {gate.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    isLight ? 'text-stone-600' : 'text-slate-400'
                  }`}>
                    {gate.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* What unlocks investing */}
        {unlockActions.length > 0 && (
          <div className={`border-t p-5 ${
            isLight ? 'border-orange-200 bg-orange-50/50' : 'border-orange-500/20 bg-orange-500/5'
          }`}>
            <h4 className={`font-semibold text-sm mb-2 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              What unlocks investing:
            </h4>
            <ul className="space-y-1.5">
              {unlockActions.map((action, i) => (
                <li
                  key={i}
                  className={`text-sm flex items-start gap-2 ${
                    isLight ? 'text-stone-700' : 'text-slate-300'
                  }`}
                >
                  <span className="shrink-0 mt-1">→</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
