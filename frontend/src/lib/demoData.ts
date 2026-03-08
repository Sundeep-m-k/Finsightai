import type { UserProfile } from 'shared/schemas/profile';

/**
 * Realistic demo profile: Indian CS PhD student at Binghamton on a $2,200/month stipend.
 * 14 months of transaction history — used for hackathon demos and "Try demo" flow.
 */
export const DEMO_PROFILE: UserProfile = {
  questionnaire: {
    income_monthly: 2200,
    expenses_monthly: 1800,
    loan_balance: 0,
    loan_rate: 0,
    credit_card_balance: 680,
    cc_limit: 2000,
    primary_goal: 'emergency_fund',
    risk_tolerance: 'low',
    months_until_graduation: 24,
    income_type: 'stipend',
    time_horizon: '3_5yr',
  },
  behavioral: {
    flags: ['spending_gap', 'no_emergency_fund', 'lifestyle_creep'],
    avg_monthly_spending: 1942,
    savings_rate_pct: 3.8,
    said_vs_actual_gap_pct: 41.8,
    expense_breakdown: [
      { category: 'Rent & Utilities', amount: 780, percentage: 40 },
      { category: 'Food & Dining',    amount: 420, percentage: 22 },
      { category: 'Groceries',        amount: 195, percentage: 10 },
      { category: 'Shopping',         amount: 198, percentage: 10 },
      { category: 'Subscriptions',    amount: 143, percentage:  7 },
      { category: 'Health',           amount:  67, percentage:  3 },
      { category: 'Transport',        amount:  87, percentage:  4 },
      { category: 'Other',            amount:  52, percentage:  3 },
    ],
  },
  saving_readiness_score: 4,
  investment_readiness_score: 3,
  analysis_period_months: 14,
  gap_analysis: [
    { category: 'Food & Dining',    stated: 120, actual: 420, delta_pct: 250, status: 'red'   },
    { category: 'Subscriptions',    stated:  45, actual: 143, delta_pct: 218, status: 'red'   },
    { category: 'Shopping',         stated:  80, actual: 198, delta_pct: 148, status: 'red'   },
    { category: 'Transport',        stated: 150, actual:  87, delta_pct: -42, status: 'green' },
    { category: 'Groceries',        stated: 220, actual: 195, delta_pct: -11, status: 'green' },
  ],
  readiness_narrative:
    "You're spending 42% more than you think — mostly on food and subscriptions. " +
    "With 14 months of consistent data, the pattern is clear: small daily decisions are compounding. " +
    "Build 3 months of expenses as a cushion before anything else.",
  investment_narrative:
    "Too early for investments. First, close the spending gap and clear the credit card balance. " +
    "Your zero-debt-loan position is a genuine advantage — protect it.",
};
