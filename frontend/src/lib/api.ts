/**
 * API layer: profile, strategy, chat. Backend (Person 2) + AI service (Person 3).
 */
import type { UserProfile, QuestionnaireSummary } from 'shared/schemas/profile';
import type { InsightResponse } from 'shared/schemas/insight';
import type { ChatResponse } from 'shared/schemas/api-types';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** Load mock profile from public JSON (for offline/sample flow). */
export async function getMockProfile(): Promise<UserProfile> {
  const res = await fetch('/mockProfile.json');
  if (!res.ok) throw new Error('Failed to load mock profile');
  return res.json();
}

async function getMockInsights(): Promise<InsightResponse> {
  const res = await fetch('/mockInsights.json');
  if (!res.ok) throw new Error('Failed to load mock insights');
  return res.json();
}

/** Submit questionnaire to backend; returns session_id. */
export async function submitOnboard(questionnaire: QuestionnaireSummary): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionnaire }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Onboard failed');
  const data = await res.json();
  return data.session_id;
}

/** Upload file to backend; returns profile. */
export async function uploadFile(file: File, sessionId: string): Promise<UserProfile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BACKEND_URL}/upload?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error((await res.text()) || 'Upload failed');
  const data = await res.json();
  return data.profile as UserProfile;
}

/** Use sample data on backend; returns profile. */
export async function uploadSample(sessionId: string): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_URL}/upload/sample?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error((await res.text()) || 'Upload sample failed');
  const data = await res.json();
  return data.profile as UserProfile;
}

/** Get profile from backend by session_id. */
export async function getProfileFromBackend(sessionId: string): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_URL}/profile?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error((await res.text()) || 'Get profile failed');
  return res.json();
}

/** Get current profile (mock or from backend using sessionId). */
export async function getProfile(sessionId?: string | null): Promise<UserProfile> {
  if (USE_MOCK) return getMockProfile();
  if (sessionId) return getProfileFromBackend(sessionId);
  return getMockProfile();
}

/** Get personalized strategy (mock or POST /strategy). Falls back to mock if AI service unreachable. */
export async function getStrategy(profile: UserProfile): Promise<InsightResponse> {
  if (USE_MOCK) return getMockInsights();
  try {
    const res = await fetch(`${AI_SERVICE_URL}/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) throw new Error(`Strategy failed: ${res.status}`);
    return res.json();
  } catch {
    // AI service unreachable (e.g. demo mode on Vercel without backend) — use mock insights
    return getMockInsights();
  }
}

/** Send chat message (always calls AI service when not in mock). */
export async function sendChat(
  message: string,
  profile: UserProfile,
  sessionId?: string
): Promise<ChatResponse> {
  if (USE_MOCK) {
    return {
      message: 'This is a mock reply. Set VITE_USE_MOCK=false and run the AI service for real answers.',
      sources: [],
      session_id: sessionId ?? 'mock-session',
    };
  }
  try {
    const res = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId || null, profile }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    return res.json();
  } catch {
    return {
      message: "The AI advisor isn't connected in demo mode. In the live version, you'd get a personalized response here based on your full financial profile.",
      sources: [],
      session_id: sessionId ?? 'demo-session',
    };
  }
}
