import type { UserProfile } from 'shared/schemas/profile';
import { AlertCircle } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

interface Leak {
  title: string;
  amount: number;
  description: string;
  icon: string;
}

export function TopLeaksCard({ profile, isLight }: Props) {
  const { behavioral, gap_analysis } = profile;
  
  const leaks: Leak[] = [];
  
  // 1. Check for dining overspend
  const diningGap = gap_analysis?.find(g => 
    g.category.toLowerCase().includes('dining') || 
    g.category.toLowerCase().includes('restaurant')
  );
  if (diningGap && diningGap.delta_pct > 20) {
    const overspend = diningGap.actual - diningGap.stated;
    leaks.push({
      title: 'Dining Overspend',
      amount: overspend,
      description: `$${overspend.toFixed(0)}/month above target`,
      icon: '🍽️'
    });
  }
  
  // 2. Check for subscription creep
  const subscriptionGap = gap_analysis?.find(g => 
    g.category.toLowerCase().includes('subscription') || 
    g.category.toLowerCase().includes('entertainment')
  );
  if (subscriptionGap && subscriptionGap.delta_pct > 20) {
    const overspend = subscriptionGap.actual - subscriptionGap.stated;
    leaks.push({
      title: 'Subscription Creep',
      amount: overspend,
      description: `$${overspend.toFixed(0)}/month above target`,
      icon: '📱'
    });
  }
  
  // 3. Check for irregular savings
  if (behavioral.flags.includes('spending_gap') || behavioral.flags.includes('irregular_income')) {
    leaks.push({
      title: 'Inconsistent Savings',
      amount: 0,
      description: 'Saving not happening every month',
      icon: '⚠️'
    });
  }
  
  // 4. Check for high credit card utilization
  if (behavioral.flags.includes('high_credit_utilization')) {
    leaks.push({
      title: 'High CC Utilization',
      amount: 0,
      description: 'Credit card balance limiting flexibility',
      icon: '💳'
    });
  }
  
  // 5. Check lifestyle creep
  if (behavioral.flags.includes('lifestyle_creep')) {
    leaks.push({
      title: 'Lifestyle Creep',
      amount: 0,
      description: 'Discretionary spending increasing over time',
      icon: '📈'
    });
  }
  
  // Take top 3 leaks
  const topLeaks = leaks.slice(0, 3);
  
  if (topLeaks.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        Biggest Money Leaks
      </h2>
      <div className={`rounded-2xl border p-5 ${
        isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
      }`}>
        <div className="space-y-4">
          {topLeaks.map((leak, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 pb-4 ${
                i < topLeaks.length - 1 ? 'border-b' : ''
              } ${isLight ? 'border-stone-200' : 'border-slate-800'}`}
            >
              {/* Rank badge */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                i === 0 
                  ? isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/15 text-red-400'
                  : i === 1
                  ? isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/15 text-amber-400'
                  : isLight ? 'bg-yellow-100 text-yellow-600' : 'bg-yellow-500/15 text-yellow-400'
              }`}>
                {i + 1}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{leak.icon}</span>
                  <h3 className={`font-semibold text-sm ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {leak.title}
                  </h3>
                </div>
                <p className={`text-xs ${
                  isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  {leak.description}
                </p>
              </div>
              
              {/* Amount (if applicable) */}
              {leak.amount > 0 && (
                <div className={`shrink-0 font-bold text-sm ${
                  isLight ? 'text-red-600' : 'text-red-400'
                }`}>
                  ${leak.amount.toFixed(0)}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Action hint */}
        <div className={`mt-4 pt-4 border-t flex items-start gap-2 ${
          isLight ? 'border-stone-200' : 'border-slate-800'
        }`}>
          <AlertCircle size={14} className={`shrink-0 mt-0.5 ${
            isLight ? 'text-blue-600' : 'text-blue-400'
          }`} />
          <p className={`text-xs leading-relaxed ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            <span className="font-semibold">Quick win:</span> Tackle the #1 leak first. 
            Small behavioral changes here will move your score fastest.
          </p>
        </div>
      </div>
    </div>
  );
}
