import type { UserProfile } from 'shared/schemas/profile';
import { BarChart3 } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
];

const CATEGORY_ICONS: Record<string, string> = {
  'rent': '🏠',
  'housing': '🏠',
  'groceries': '🛒',
  'food': '🛒',
  'dining': '🍽️',
  'restaurant': '🍽️',
  'transport': '🚗',
  'transportation': '🚗',
  'gas': '⛽',
  'subscriptions': '📱',
  'entertainment': '🎬',
  'shopping': '🛍️',
  'utilities': '💡',
  'healthcare': '⚕️',
  'other': '📦',
};

export function SpendingChart({ profile, isLight }: Props) {
  const { behavioral } = profile;
  
  if (!behavioral.expense_breakdown || behavioral.expense_breakdown.length === 0) {
    return null;
  }
  
  // Filter out income and sort by amount
  const expenses = behavioral.expense_breakdown
    .filter(e => e.category.toLowerCase() !== 'income')
    .sort((a, b) => b.amount - a.amount);
  
  if (expenses.length === 0) {
    return null;
  }
  
  const maxAmount = Math.max(...expenses.map(e => e.amount));
  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
      if (lowerCategory.includes(key)) return icon;
    }
    return '📊';
  };
  
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        Spending Breakdown
      </h2>
      <div className={`rounded-2xl border p-5 ${
        isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-purple-100' : 'bg-purple-500/15'
          }`}>
            <BarChart3 size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className={`font-display font-bold text-base ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              Monthly Spending by Category
            </h3>
            <p className={`text-xs mt-0.5 ${
              isLight ? 'text-stone-600' : 'text-slate-400'
            }`}>
              Total: ${totalSpending.toFixed(0)}/month
            </p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="space-y-3">
          {expenses.map((expense, i) => {
            const percentage = (expense.amount / maxAmount) * 100;
            const percentOfTotal = expense.percentage || (expense.amount / totalSpending) * 100;
            
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getCategoryIcon(expense.category)}</span>
                    <span className={`text-sm font-medium ${
                      isLight ? 'text-stone-700' : 'text-slate-300'
                    }`}>
                      {formatCategory(expense.category)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-bold ${
                      isLight ? 'text-stone-900' : 'text-white'
                    }`}>
                      ${expense.amount.toFixed(0)}
                    </span>
                    <span className={`text-xs ${
                      isLight ? 'text-stone-500' : 'text-slate-500'
                    }`}>
                      {percentOfTotal.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={`h-8 rounded-lg overflow-hidden ${
                  isLight ? 'bg-stone-100' : 'bg-slate-800'
                }`}>
                  <div
                    className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} transition-all duration-500 flex items-center px-2`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && (
                      <span className="text-xs font-semibold text-white opacity-90">
                        ${expense.amount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className={`mt-4 pt-4 border-t ${
          isLight ? 'border-stone-200' : 'border-slate-800'
        }`}>
          <p className={`text-xs leading-relaxed ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            💡 Your top 3 categories account for{' '}
            <span className="font-semibold">
              {expenses.slice(0, 3).reduce((sum, e) => sum + (e.percentage || 0), 0).toFixed(0)}%
            </span>{' '}
            of spending — small reductions here have big impact.
          </p>
        </div>
      </div>
    </div>
  );
}
