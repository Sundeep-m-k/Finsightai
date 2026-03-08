import type { UserProfile } from 'shared/schemas/profile';
import { Shield, Target } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

export function EmergencyFundProgress({ profile, isLight }: Props) {
  const { behavioral, questionnaire } = profile;
  
  const monthlyIncome = questionnaire.income_monthly || 0;
  const monthlyExpenses = behavioral.avg_monthly_spending || questionnaire.expenses_monthly || 0;
  const surplus = monthlyIncome - monthlyExpenses;
  
  // Estimate current emergency fund (this is a simplification)
  // In reality, you'd track actual savings
  const estimatedBuffer = Math.max(0, surplus * 0.5); // Assume half of surplus is saved
  
  const oneMonthTarget = monthlyExpenses;
  const threeMonthTarget = monthlyExpenses * 3;
  
  const currentPercentage = (estimatedBuffer / oneMonthTarget) * 100;
  const oneMonthPercentage = 100;
  
  const milestones = [
    { label: 'Current', amount: estimatedBuffer, percentage: Math.min(100, currentPercentage) },
    { label: '1-Month Target', amount: oneMonthTarget, percentage: oneMonthPercentage },
    { label: '3-Month Goal', amount: threeMonthTarget, percentage: 100 },
  ];
  
  const getStatusMessage = () => {
    if (estimatedBuffer < oneMonthTarget * 0.25) {
      return 'Just getting started';
    } else if (estimatedBuffer < oneMonthTarget * 0.5) {
      return 'Building momentum';
    } else if (estimatedBuffer < oneMonthTarget) {
      return 'Great progress!';
    } else if (estimatedBuffer < threeMonthTarget) {
      return 'Strong foundation';
    } else {
      return 'Excellent buffer!';
    }
  };
  
  const monthsToOneMonth = surplus > 0 ? Math.ceil(oneMonthTarget / surplus) : null;

  return (
    <div>
      <h2 className={`font-display font-bold text-lg mb-3 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}>
        Emergency Fund Progress
      </h2>
      <div className={`rounded-2xl border p-5 ${
        isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-cyan-100' : 'bg-cyan-500/15'
          }`}>
            <Shield size={20} className="text-cyan-500" />
          </div>
          <div>
            <h3 className={`font-display font-bold text-base ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              {getStatusMessage()}
            </h3>
            <p className={`text-xs mt-0.5 ${
              isLight ? 'text-stone-600' : 'text-slate-400'
            }`}>
              {monthsToOneMonth !== null && monthsToOneMonth > 0 
                ? `${monthsToOneMonth} months to 1-month target`
                : 'Build surplus first'}
            </p>
          </div>
        </div>
        
        {/* Visual progress */}
        <div className="relative h-16 mb-4">
          {/* Track */}
          <div className={`absolute inset-0 rounded-full overflow-hidden ${
            isLight ? 'bg-stone-200' : 'bg-slate-800'
          }`}>
            {/* Current progress */}
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, (estimatedBuffer / threeMonthTarget) * 100)}%` }}
            />
            
            {/* 1-month marker */}
            <div
              className={`absolute top-0 bottom-0 w-0.5 ${
                isLight ? 'bg-stone-400' : 'bg-slate-600'
              }`}
              style={{ left: `${(oneMonthTarget / threeMonthTarget) * 100}%` }}
            >
              <div className={`absolute -top-1 -left-2 w-4 h-4 rounded-full border-2 ${
                estimatedBuffer >= oneMonthTarget
                  ? 'bg-emerald-500 border-white'
                  : isLight 
                  ? 'bg-white border-stone-400'
                  : 'bg-slate-900 border-slate-600'
              }`} />
            </div>
          </div>
          
          {/* Amount label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-display font-black text-xl mix-blend-difference text-white`}>
              ${estimatedBuffer.toFixed(0)}
            </span>
          </div>
        </div>
        
        {/* Milestones */}
        <div className="space-y-2">
          {milestones.map((milestone, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 ${
                i < milestones.length - 1 ? 'border-b' : ''
              } ${isLight ? 'border-stone-200' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-2">
                {i === 0 && <Target size={14} className="text-cyan-500" />}
                <span className={`text-xs font-medium ${
                  i === 0 
                    ? 'text-cyan-600 font-semibold'
                    : isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  {milestone.label}
                </span>
              </div>
              <span className={`text-sm font-bold ${
                i === 0
                  ? 'text-cyan-600'
                  : isLight ? 'text-stone-900' : 'text-white'
              }`}>
                ${milestone.amount.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Recommendation */}
        <div className={`mt-4 pt-4 border-t ${
          isLight ? 'border-stone-200' : 'border-slate-800'
        }`}>
          <p className={`text-xs leading-relaxed ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            💡 <span className="font-semibold">Financial experts recommend:</span>{' '}
            Start with $500-$1000, then build to 1 month of expenses before investing heavily.
          </p>
        </div>
      </div>
    </div>
  );
}
