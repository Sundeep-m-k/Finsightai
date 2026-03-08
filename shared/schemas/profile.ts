/**
 * UserProfile — input from Person 2 (data engine) to Person 3 (AI).
 * Consumed by POST /strategy and as context for POST /chat.
 */

export type PrimaryGoal = 'debt_payoff' | 'emergency_fund' | 'investing' | 'budgeting';
export type RiskTolerance = 'low' | 'medium' | 'high';

export type BehavioralFlag =
  | 'high_credit_utilization'
  | 'spending_gap'
  | 'lifestyle_creep'
  | 'irregular_income'
  | 'no_emergency_fund'
  | 'high_debt_burden';

export interface QuestionnaireSummary {
  income_monthly?: number;
  expenses_monthly?: number;
  loan_balance?: number;
  credit_card_balance?: number;
  primary_goal: PrimaryGoal;
  risk_tolerance?: RiskTolerance;
  months_until_graduation?: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage?: number;
}

export interface BehavioralProfile {
  flags: BehavioralFlag[];
  avg_monthly_spending?: number;
  savings_rate_pct?: number;
  said_vs_actual_gap_pct?: number;
  expense_breakdown?: ExpenseCategory[];
}

export interface UserProfile {
  questionnaire: QuestionnaireSummary;
  behavioral: BehavioralProfile;
  saving_readiness_score: number; // 0-10
  investment_readiness_score: number; // 0-10
  analysis_period_months?: number;
}
