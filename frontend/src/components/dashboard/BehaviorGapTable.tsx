import type { UserProfile } from 'shared/schemas/profile';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  profile: UserProfile;
  isLight: boolean;
}

export function BehaviorGapTable({ profile, isLight }: Props) {
  const { gap_analysis } = profile;
  
  if (!gap_analysis || gap_analysis.length === 0) {
    return null;
  }
  
  // Sort by absolute delta percentage (biggest gaps first)
  const sortedGaps = [...gap_analysis].sort((a, b) => 
    Math.abs(b.delta_pct) - Math.abs(a.delta_pct)
  );
  
  const getStatusColor = (status: string) => {
    if (status === 'red') return isLight ? 'text-red-600' : 'text-red-400';
    if (status === 'amber') return isLight ? 'text-amber-600' : 'text-amber-400';
    return isLight ? 'text-emerald-600' : 'text-emerald-400';
  };
  
  const getStatusIcon = (deltaPct: number) => {
    if (Math.abs(deltaPct) < 10) return <Minus size={14} />;
    if (deltaPct > 0) return <TrendingUp size={14} />;
    return <TrendingDown size={14} />;
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
        Behavior Gap
      </h2>
      <div className={`rounded-2xl border overflow-hidden ${
        isLight ? 'bg-white border-cream-300' : 'border-slate-800 bg-slate-900/80'
      }`}>
        <div className={`overflow-x-auto ${isLight ? 'bg-stone-50' : 'bg-slate-800/30'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${
                isLight ? 'border-stone-200' : 'border-slate-700'
              }`}>
                <th className={`text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide ${
                  isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  Category
                </th>
                <th className={`text-right py-3 px-4 font-semibold text-xs uppercase tracking-wide ${
                  isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  You Estimated
                </th>
                <th className={`text-right py-3 px-4 font-semibold text-xs uppercase tracking-wide ${
                  isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  Actual Average
                </th>
                <th className={`text-right py-3 px-4 font-semibold text-xs uppercase tracking-wide ${
                  isLight ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  Gap
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedGaps.map((gap, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 ${
                    isLight ? 'border-stone-200' : 'border-slate-800'
                  } ${isLight ? 'hover:bg-stone-50' : 'hover:bg-slate-800/20'} transition-colors`}
                >
                  <td className={`py-3 px-4 font-medium ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    {formatCategory(gap.category)}
                  </td>
                  <td className={`py-3 px-4 text-right ${
                    isLight ? 'text-stone-600' : 'text-slate-400'
                  }`}>
                    ${gap.stated.toFixed(0)}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    isLight ? 'text-stone-900' : 'text-white'
                  }`}>
                    ${gap.actual.toFixed(0)}
                  </td>
                  <td className={`py-3 px-4 text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <span className={getStatusColor(gap.status)}>
                        {getStatusIcon(gap.delta_pct)}
                      </span>
                      <span className={`font-semibold ${getStatusColor(gap.status)}`}>
                        {gap.delta_pct > 0 ? '+' : ''}{gap.delta_pct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary note */}
        <div className={`p-4 border-t ${
          isLight ? 'border-stone-200 bg-stone-50/50' : 'border-slate-800 bg-slate-800/20'
        }`}>
          <p className={`text-xs leading-relaxed ${
            isLight ? 'text-stone-600' : 'text-slate-400'
          }`}>
            💡 <span className="font-semibold">What this means:</span> Positive gaps show you're 
            spending more than you thought. This is your unique insight — most people underestimate 
            their spending by 20-40%.
          </p>
        </div>
      </div>
    </div>
  );
}
