import type { UserProfile } from 'shared/schemas/profile';
import { Zap, TrendingUp } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

interface ImpactAction {
  action: string;
  scoreType: 'saving' | 'investment';
  impact: number;
  priority: number;
}

export function ScoreImpactCard({ profile, isLight }: Props) {
  const { behavioral, questionnaire, gap_analysis } = profile;
  
  const actions: ImpactAction[] = [];
  
  // Calculate potential impacts based on current situation
  
  // 1. Dining reduction impact
  const diningGap = gap_analysis?.find(g => 
    g.category.toLowerCase().includes('dining')
  );
  if (diningGap && diningGap.delta_pct > 20) {
    const reductionAmount = diningGap.actual - diningGap.stated;
    actions.push({
      action: `Reduce dining by $${reductionAmount.toFixed(0)}/month`,
      scoreType: 'saving',
      impact: Math.min(0.8, (reductionAmount / 100) * 0.3),
      priority: 1
    });
  }
  
  // 2. Automatic savings
  if (behavioral.flags.includes('irregular_income') || behavioral.flags.includes('spending_gap')) {
    actions.push({
      action: 'Save automatically every month',
      scoreType: 'saving',
      impact: 0.6,
      priority: 2
    });
  }
  
  // 3. Credit card reduction
  if (behavioral.flags.includes('high_credit_utilization') && questionnaire.credit_card_balance) {
    const reductionTarget = Math.min(questionnaire.credit_card_balance, 500);
    actions.push({
      action: `Reduce credit card balance by $${reductionTarget}`,
      scoreType: 'investment',
      impact: 1.1,
      priority: 1
    });
  }
  
  // 4. Emergency fund
  if (behavioral.flags.includes('no_emergency_fund')) {
    actions.push({
      action: 'Build $500 emergency buffer',
      scoreType: 'both' as any,
      impact: 0.9,
      priority: 2
    });
  }
  
  // 5. Subscription audit
  const subscriptionGap = gap_analysis?.find(g => 
    g.category.toLowerCase().includes('subscription')
  );
  if (subscriptionGap && subscriptionGap.delta_pct > 30) {
    const reductionAmount = (subscriptionGap.actual - subscriptionGap.stated) * 0.7;
    actions.push({
      action: `Cancel unused subscriptions (save ~$${reductionAmount.toFixed(0)}/month)`,
      scoreType: 'saving',
      impact: 0.5,
      priority: 3
    });
  }
  
  // 6. Consistent spending
  if (behavioral.flags.includes('lifestyle_creep') || behavioral.flags.includes('spending_gap')) {
    actions.push({
      action: 'Maintain spending below target for 3 weeks',
      scoreType: 'investment',
      impact: 0.7,
      priority: 3
    });
  }
  
  // Sort by priority and take top 3-4
  const topActions = actions
    .sort((a, b) => b.impact - a.impact || a.priority - b.priority)
    .slice(0, 4);
  
  if (topActions.length === 0) {
    return null;
  }
  
  const getScoreLabel = (scoreType: string) => {
    if (scoreType === 'both') return 'Both scores';
    return scoreType === 'saving' ? 'Saving score' : 'Investment score';
  };
  
  const getScoreColor = (scoreType: string) => {
    if (scoreType === 'both') return isLight ? 'text-purple-600' : 'text-purple-400';
    return scoreType === 'saving' 
      ? isLight ? 'text-emerald-600' : 'text-emerald-400'
      : isLight ? 'text-indigo-600' : 'text-indigo-400';
  };

  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        What Improves Your Score Fastest?
      </h2>
      <div className={`rounded-2xl border p-5 ${
        isLight 
          ? 'bg-gradient-to-br from-blue-50 to-cyan-50/50 border-blue-200'
          : 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20'
      }`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-blue-100' : 'bg-blue-500/15'
          }`}>
            <Zap size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className={`font-display font-bold text-base ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              Fastest Score Improvements
            </h3>
            <p className={`text-xs mt-0.5 ${
              isLight ? 'text-stone-600' : 'text-slate-400'
            }`}>
              Small changes with big impact
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {topActions.map((action, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 ${
                isLight ? 'bg-white/80 border border-blue-200/50' : 'bg-slate-800/30 border border-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {action.action}
                  </p>
                  <p className={`text-xs mt-1 ${
                    isLight ? 'text-stone-600' : 'text-slate-400'
                  }`}>
                    {getScoreLabel(action.scoreType)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <TrendingUp size={14} className={getScoreColor(action.scoreType)} />
                  <span className={`font-bold text-sm ${getScoreColor(action.scoreType)}`}>
                    +{action.impact.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pro tip */}
        <div className={`mt-4 pt-4 border-t ${
          isLight ? 'border-blue-200' : 'border-slate-700'
        }`}>
          <p className={`text-xs leading-relaxed ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            💡 <span className="font-semibold">Pro tip:</span> Stack 2-3 of these actions together 
            for compound improvements. You could boost your score by 2+ points in 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}
