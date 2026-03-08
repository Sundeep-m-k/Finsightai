/**
 * Questionnaire structure for onboarding (Person 1 UI).
 * Used to build UserProfile.questionnaire after Person 2 processing.
 */

export type GoalOption = 'debt_payoff' | 'emergency_fund' | 'investing' | 'budgeting';
export type RiskOption = 'low' | 'medium' | 'high';

export interface QuestionnaireAnswers {
  income_monthly?: number;
  expenses_monthly?: number;
  loan_balance?: number;
  credit_card_balance?: number;
  primary_goal: GoalOption;
  risk_tolerance?: RiskOption;
  months_until_graduation?: number;
}
