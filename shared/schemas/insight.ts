/**
 * InsightResponse — output from Person 3 (AI) to Person 1 (frontend).
 * Returned by POST /strategy. Finalize by Hour 3 for frontend wiring.
 */

import type { BadgeType } from '../constants/badges';

export interface Source {
  title: string;
  url: string;
  preview: string; // 1-2 sentences, max ~200 chars
  relevance_score: number; // 0-1
  badge_type: BadgeType;
}

export interface Insight {
  recommendation: string;
  principle: string;
  behavioral_flags: string[]; // which flags triggered this insight
  sources: Source[];
}

export interface ActionStep {
  title: string;
  description: string;
  time_label: string; // e.g. "Month 1", "Weeks 1-2"
}

export interface InsightResponse {
  insights: Insight[];
  action_plan: ActionStep[]; // 90-day plan, typically 3 steps
  narrative: string;
  disclaimer: string;
}

export const DEFAULT_DISCLAIMER =
  'FinSight AI provides educational insights and planning support — not personalized financial advice. For major financial decisions, consult a certified financial planner.';
