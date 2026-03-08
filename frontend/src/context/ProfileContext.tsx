import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserProfile, QuestionnaireSummary } from 'shared/schemas/profile';

const defaultProfile: UserProfile = {
  questionnaire: {
    primary_goal: 'investing',
    income_monthly: 2400,
    expenses_monthly: 2100,
    loan_balance: 28000,
    credit_card_balance: 1200,
    risk_tolerance: 'medium',
    months_until_graduation: 18,
  },
  behavioral: {
    flags: ['spending_gap', 'no_emergency_fund'],
    avg_monthly_spending: 2150,
    savings_rate_pct: 10.4,
    said_vs_actual_gap_pct: 22,
    expense_breakdown: [],
  },
  saving_readiness_score: 5,
  investment_readiness_score: 4,
  analysis_period_months: 6,
};

const STORAGE_KEY = 'finscope_session_id';

const ProfileContext = createContext<{
  profile: UserProfile;
  setProfile: (p: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  setQuestionnaire: (q: QuestionnaireSummary) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
} | null>(null);

function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [sessionId, setSessionIdState] = useState<string | null>(getStoredSessionId);

  const setProfile = useCallback((p: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setProfileState(p);
  }, []);

  const setQuestionnaire = useCallback((q: QuestionnaireSummary) => {
    setProfileState((prev) => ({ ...prev, questionnaire: q }));
  }, []);

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, setQuestionnaire, sessionId, setSessionId }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
