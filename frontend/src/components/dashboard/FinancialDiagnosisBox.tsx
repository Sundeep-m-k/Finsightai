import type { UserProfile } from 'shared/schemas/profile';
import { AlertTriangle, TrendingUp, Calendar, CreditCard } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

export function FinancialDiagnosisBox({ profile, isLight }: Props) {
  const { questionnaire, behavioral } = profile;
  
  // Calculate key metrics
  const monthlyIncome = questionnaire.income_monthly || 0;
  const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  
  // Calculate emergency fund timeline (1 month of expenses)
  const emergencyFundTarget = monthlyExpenses;
  const monthsToEmergencyFund = monthlySurplus > 0 
    ? Math.ceil(emergencyFundTarget / monthlySurplus) 
    : null;
  
  // Find biggest blocker
  const getBlocker = () => {
    if (behavioral.flags.includes('high_credit_utilization')) {
      return 'credit card utilization is too high';
    }
    if (behavioral.flags.includes('no_emergency_fund')) {
      return 'no emergency fund established';
    }
    if (behavioral.flags.includes('irregular_income') || behavioral.flags.includes('spending_gap')) {
      return 'inconsistent savings behavior';
    }
    if (behavioral.flags.includes('high_debt_burden')) {
      return 'debt-to-income ratio is elevated';
    }
    return 'building financial foundation';
  };
  
  // Calculate top spending categories (dining + subscriptions)
  const diningCategory = behavioral.expense_breakdown?.find(c => 
    c.category.toLowerCase().includes('dining') || c.category.toLowerCase().includes('restaurant')
  );
  const subscriptionCategory = behavioral.expense_breakdown?.find(c => 
    c.category.toLowerCase().includes('subscription') || c.category.toLowerCase().includes('entertainment')
  );
  
  const topSpendingAmount = (diningCategory?.amount || 0) + (subscriptionCategory?.amount || 0);

  return (
    <div className={`rounded-2xl border p-6 ${
      isLight 
        ? 'bg-amber-50/50 border-amber-200' 
        : 'bg-amber-500/5 border-amber-500/20'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isLight ? 'bg-amber-100' : 'bg-amber-500/15'
        }`}>
          <AlertTriangle size={20} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display font-bold text-base mb-3 ${
            isLight ? 'text-stone-900' : 'text-white'
          }`}>
            Your Financial Snapshot
          </h3>
          
          <div className="space-y-2.5">
            {/* Money loss */}
            {topSpendingAmount > 0 && (
              <div className="flex items-start gap-2">
                <div className={`text-xs font-medium shrink-0 mt-0.5 ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`}>
                  💸
                </div>
                <p className={`text-sm leading-relaxed ${
                  isLight ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  You're spending <span className="font-semibold">${topSpendingAmount.toFixed(0)}/month</span> on 
                  {diningCategory && subscriptionCategory ? ' dining + subscriptions' : 
                   diningCategory ? ' dining' : ' subscriptions'}
                </p>
              </div>
            )}
            
            {/* Surplus */}
            <div className="flex items-start gap-2">
              <div className={`text-xs font-medium shrink-0 mt-0.5 ${
                isLight ? 'text-emerald-600' : 'text-emerald-400'
              }`}>
                <TrendingUp size={14} />
              </div>
              <p className={`text-sm leading-relaxed ${
                isLight ? 'text-stone-700' : 'text-slate-300'
              }`}>
                Current surplus: <span className={`font-semibold ${
                  monthlySurplus > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  ${Math.abs(monthlySurplus).toFixed(0)}/month
                </span>
                {monthlySurplus < 0 && ' (deficit)'}
              </p>
            </div>
            
            {/* Emergency fund timeline */}
            {monthsToEmergencyFund !== null && monthsToEmergencyFund > 0 && (
              <div className="flex items-start gap-2">
                <div className={`text-xs font-medium shrink-0 mt-0.5 ${
                  isLight ? 'text-blue-600' : 'text-blue-400'
                }`}>
                  <Calendar size={14} />
                </div>
                <p className={`text-sm leading-relaxed ${
                  isLight ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  At this pace, reaching a 1-month emergency fund will take{' '}
                  <span className="font-semibold">{monthsToEmergencyFund} months</span>
                </p>
              </div>
            )}
            
            {/* Biggest blocker */}
            <div className="flex items-start gap-2">
              <div className={`text-xs font-medium shrink-0 mt-0.5 ${
                isLight ? 'text-red-600' : 'text-red-400'
              }`}>
                <CreditCard size={14} />
              </div>
              <p className={`text-sm leading-relaxed ${
                isLight ? 'text-stone-700' : 'text-slate-300'
              }`}>
                Your biggest blocker to investing: <span className="font-semibold">{getBlocker()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
