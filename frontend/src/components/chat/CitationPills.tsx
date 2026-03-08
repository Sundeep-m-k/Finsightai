import type { Source } from 'shared/schemas/insight';
import { BADGE_LABELS, type BadgeType } from 'shared/constants/badges';

const badgeColorClass: Record<BadgeType, string> = {
  government: 'bg-blue-100 text-blue-800 border-blue-200',
  academic: 'bg-green-100 text-green-800 border-green-200',
  market: 'bg-amber-100 text-amber-800 border-amber-200',
  'finscope-kb': 'bg-violet-100 text-violet-800 border-violet-200', // was finsight-kb
};

interface CitationPillsProps {
  sources: Source[];
  showPreview?: boolean;
}

export function CitationPills({ sources, showPreview = false }: CitationPillsProps) {
  if (!sources?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sources.map((s, i) => (
        <span
          key={i}
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColorClass[s.badge_type] || 'bg-slate-100 text-slate-800'}`}
          title={showPreview ? s.preview : undefined}
        >
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {BADGE_LABELS[s.badge_type]}: {s.title}
            </a>
          ) : (
            <>
              {BADGE_LABELS[s.badge_type]}: {s.title}
            </>
          )}
        </span>
      ))}
    </div>
  );
}
