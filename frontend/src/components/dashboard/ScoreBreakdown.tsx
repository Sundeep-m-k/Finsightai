import type { UserProfile } from 'shared/schemas/profile';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

interface BreakdownItem {
  label: string;
  score: number;
  maxScore: number;
  description: string;
}

export function ScoreBreakdown({ profile, isLight }: Props) {
  const [expanded, setExpanded] = useState<'saving' | 'investment' | null>(null);
  
  const { questionnaire, behavioral } = profile;
  
  // Calculate saving readiness breakdown
  const getSavingBreakdown = (): BreakdownItem[] => {
    const monthlyIncome = questionnaire.income_monthly || 0;
    const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
    const surplus = monthlyIncome - monthlyExpenses;
    
    // Emergency fund coverage (0-3 points)
    const emergencyScore = surplus > 0 ? Math.min(3, (surplus / monthlyExpenses) * 3) : 0;
    
    // Savings consistency (0-3 points)
    const consistencyScore = behavioral.savings_rate_pct && behavioral.savings_rate_pct > 0 ? 
      (behavioral.flags.includes('irregular_income') ? 1.5 : 2.5) : 0.5;
    
    // Debt-to-income (0-2 points)
    const debtScore = behavioral.flags.includes('high_debt_burden') ? 0.5 : 2;
    
    // Income stability (0-2 points)
    const stabilityScore = behavioral.flags.includes('irregular_income') ? 0.5 : 
      (questionnaire.income_type === 'fixed' ? 2 : 1.5);
    
    return [
      {
        label: 'Emergency Fund Coverage',
        score: emergencyScore,
        maxScore: 3,
        description: surplus > 0 ? `${Math.round((surplus / monthlyExpenses) * 100)}% of monthly expenses` : 'No surplus yet'
      },
      {
        label: 'Savings Consistency',
        score: consistencyScore,
        maxScore: 3,
        description: behavioral.savings_rate_pct ? 
          `${behavioral.savings_rate_pct}% savings rate` : 'Inconsistent savings behavior'
      },
      {
        label: 'Debt-to-Income Ratio',
        score: debtScore,
        maxScore: 2,
        description: behavioral.flags.includes('high_debt_burden') ? 
          'High debt burden' : 'Manageable debt levels'
      },
      {
        label: 'Income Stability',
        score: stabilityScore,
        maxScore: 2,
        description: questionnaire.income_type === 'fixed' ? 'Stable income' : 
          behavioral.flags.includes('irregular_income') ? 'Irregular income' : 'Part-time income'
      }
    ];
  };
  
  // Calculate investment readiness breakdown
  const getInvestmentBreakdown = (): BreakdownItem[] => {
    const monthlyIncome = questionnaire.income_monthly || 0;
    const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
    const surplus = monthlyIncome - monthlyExpenses;
    
    // Saving foundation (0-3 points)
    const foundationScore = profile.saving_readiness_score > 7 ? 3 : 
      profile.saving_readiness_score > 5 ? 2 : profile.saving_readiness_score > 3 ? 1 : 0.5;
    
    // Investable surplus (0-3 points)
    const surplusScore = surplus > 300 ? 3 : surplus > 150 ? 2 : surplus > 50 ? 1 : 0;
    
    // Volatility (0-2 points)
    const volatilityScore = behavioral.flags.includes('spending_gap') || 
      behavioral.flags.includes('lifestyle_creep') ? 0.5 : 1.5;
    
    // Debt pressure (0-2 points)
    const debtPressureScore = behavioral.flags.includes('high_credit_utilization') || 
      behavioral.flags.includes('high_debt_burden') ? 0.5 : 2;
    
    return [
      {
        label: 'Saving Foundation',
        score: foundationScore,
        maxScore: 3,
        description: profile.saving_readiness_score > 7 ? 'Strong saving habits' : 
          profile.saving_readiness_score > 5 ? 'Developing saving habits' : 'Building foundation'
      },
      {
        label: 'Investable Surplus',
        score: surplusScore,
        maxScore: 3,
        description: surplus > 0 ? `$${surplus.toFixed(0)}/month available` : 'No surplus yet'
      },
      {
        label: 'Spending Volatility',
        score: volatilityScore,
        maxScore: 2,
        description: behavioral.flags.includes('spending_gap') ? 
          'High spending variance' : 'Consistent spending patterns'
      },
      {
        label: 'Debt Pressure',
        score: debtPressureScore,
        maxScore: 2,
        description: behavioral.flags.includes('high_credit_utilization') ? 
          'High CC utilization' : 'Low debt pressure'
      }
    ];
  };
  
  const savingBreakdown = getSavingBreakdown();
  const investmentBreakdown = getInvestmentBreakdown();
  
  const renderBreakdown = (items: BreakdownItem[], type: 'saving' | 'investment') => {
    const isExpanded = expanded === type;
    
    return (
      <div className={`rounded-2xl border overflow-hidden ${
        isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
      }`}>
        <button
          onClick={() => setExpanded(isExpanded ? null : type)}
          className={`w-full p-4 flex items-center justify-between transition-colors ${
            isLight ? 'hover:bg-stone-50' : 'hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'saving' ? 'bg-emerald-500/15' : 'bg-indigo-500/15'
            }`}>
              <span className="text-lg">
                {type === 'saving' ? '💰' : '📈'}
              </span>
            </div>
            <span className={`font-semibold text-sm ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              {type === 'saving' ? 'Saving Readiness' : 'Investment Readiness'} Breakdown
            </span>
          </div>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {isExpanded && (
          <div className={`border-t p-4 space-y-4 ${
            isLight ? 'border-stone-200' : 'border-slate-800'
          }`}>
            {items.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${
                    isLight ? 'text-stone-600' : 'text-slate-400'
                  }`}>
                    {item.label}
                  </span>
                  <span className={`text-xs font-bold ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {item.score.toFixed(1)}/{item.maxScore}
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${
                  isLight ? 'bg-stone-200' : 'bg-slate-800'
                }`}>
                  <div
                    className={`h-full transition-all duration-500 ${
                      type === 'saving' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                    }`}
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  isLight ? 'text-stone-500' : 'text-slate-500'
                }`}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        Why This Score?
      </h2>
      <div className="space-y-3">
        {renderBreakdown(savingBreakdown, 'saving')}
        {renderBreakdown(investmentBreakdown, 'investment')}
      </div>
    </div>
  );
}
