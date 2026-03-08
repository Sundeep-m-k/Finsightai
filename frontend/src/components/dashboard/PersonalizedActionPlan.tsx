import type { UserProfile } from 'shared/schemas/profile';
import { Calendar, Target } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

interface TimePhase {
  label: string;
  days: string;
  actions: string[];
  goal: string;
}

export function PersonalizedActionPlan({ profile, isLight }: Props) {
  const { behavioral, questionnaire, gap_analysis } = profile;
  
  const monthlyIncome = questionnaire.income_monthly || 0;
  const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
  const surplus = monthlyIncome - monthlyExpenses;
  
  // Calculate specific targets based on actual data
  const diningGap = gap_analysis?.find(g => g.category.toLowerCase().includes('dining'));
  const diningTarget = diningGap ? diningGap.actual * 0.7 : null; // 30% reduction
  
  const subscriptionGap = gap_analysis?.find(g => g.category.toLowerCase().includes('subscription'));
  const unusedSubscriptions = subscriptionGap && subscriptionGap.delta_pct > 30 ? 2 : 1;
  
  const autoSaveAmount = Math.max(50, Math.floor(surplus * 0.3 / 25) * 25); // Round to $25
  const emergencyTarget1 = Math.floor((monthlyExpenses * 0.15) / 100) * 100; // 15% of expenses
  const emergencyTarget2 = Math.floor((monthlyExpenses * 0.35) / 100) * 100; // 35% of expenses
  
  const ccPayment = questionnaire.credit_card_balance ? 
    Math.min(100, Math.floor(questionnaire.credit_card_balance * 0.2 / 50) * 50) : null;
  
  const phases: TimePhase[] = [
    {
      label: 'Days 1–30',
      days: 'Month 1',
      actions: [
        diningTarget ? `Cut dining budget from $${diningGap!.actual.toFixed(0)} to $${diningTarget.toFixed(0)}` : 'Review and reduce discretionary spending',
        `Cancel ${unusedSubscriptions} unused subscription${unusedSubscriptions > 1 ? 's' : ''}`,
        autoSaveAmount > 0 ? `Auto-save $${autoSaveAmount} on payday` : 'Set up automatic savings'
      ],
      goal: 'Build momentum with quick wins'
    },
    {
      label: 'Days 31–60',
      days: 'Month 2',
      actions: [
        emergencyTarget1 > 0 ? `Reach $${emergencyTarget1} emergency fund` : 'Build initial emergency buffer',
        ccPayment ? `Pay extra $${ccPayment} toward credit card` : 'Make progress on any outstanding debt',
        'Maintain spending below target for 3 weeks'
      ],
      goal: 'Establish consistent financial habits'
    },
    {
      label: 'Days 61–90',
      days: 'Month 3',
      actions: [
        emergencyTarget2 > 0 ? `Reach $${emergencyTarget2} emergency fund` : 'Continue building emergency fund',
        behavioral.flags.includes('high_credit_utilization') ? 'Lower credit card utilization below 30%' : 'Maintain healthy credit habits',
        'Recheck investment readiness score'
      ],
      goal: 'Prepare for next-level financial growth'
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-display font-bold text-lg ${
          isLight ? 'text-stone-900' : 'text-white'
        }`}>
          Your 90-Day Action Plan
        </h2>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/15 text-blue-400'
        }`}>
          <Calendar size={12} />
          <span>Personalized</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div
            key={i}
            className={`rounded-2xl border overflow-hidden ${
              isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
            }`}
          >
            {/* Phase header */}
            <div className={`p-4 border-b ${
              isLight ? 'bg-stone-50/50 border-stone-200' : 'bg-slate-800/30 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm ${
                  isLight
                    ? 'bg-white border-stone-300 text-stone-700'
                    : 'bg-slate-900 border-indigo-500/30 text-indigo-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {phase.label}
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isLight ? 'text-stone-500' : 'text-slate-500'
                  }`}>
                    {phase.goal}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-4">
              <ul className="space-y-2.5">
                {phase.actions.map((action, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5"
                  >
                    <div className={`shrink-0 w-5 h-5 rounded border-2 mt-0.5 ${
                      isLight 
                        ? 'border-stone-300 bg-stone-50' 
                        : 'border-slate-700 bg-slate-800'
                    }`} />
                    <span className={`text-sm leading-relaxed ${
                      isLight ? 'text-stone-700' : 'text-slate-300'
                    }`}>
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      {/* Success metric */}
      <div className={`mt-4 rounded-xl border p-4 flex items-start gap-3 ${
        isLight 
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-emerald-500/5 border-emerald-500/20'
      }`}>
        <Target size={18} className="shrink-0 mt-0.5 text-emerald-500" />
        <div>
          <p className={`text-sm font-semibold ${
            isLight ? 'text-stone-900' : 'text-white'
          }`}>
            Success marker
          </p>
          <p className={`text-xs mt-0.5 ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            If you complete this plan, your saving score should improve by 1.5–2.5 points 
            and your investment readiness will unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
