/**
 * Citation badge types for source attribution.
 * Must stay in sync with ai-service schemas/sources.py
 */
export const BADGE_TYPES = [
  'government',
  'academic',
  'market',
  'finscope-kb',
] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];

export const BADGE_LABELS: Record<BadgeType, string> = {
  government: 'Government',
  academic: 'Academic',
  market: 'Market',
  'finscope-kb': 'FinScope',
};

export const BADGE_COLORS: Record<BadgeType, string> = {
  government: 'blue',
  academic: 'green',
  market: 'amber',
  'finscope-kb': 'violet',
};
