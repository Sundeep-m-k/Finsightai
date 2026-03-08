/**
 * API request/response types for frontend ↔ ai-service.
 */

import type { UserProfile } from './profile';
import type { InsightResponse } from './insight';
import type { Source } from './insight';

/** POST /strategy */
export interface StrategyRequest {
  profile: UserProfile;
}

export type StrategyResponse = InsightResponse;

/** POST /chat */
export interface ChatRequest {
  message: string;
  session_id?: string; // optional; server creates if missing
  profile: UserProfile; // full profile sent each time so ai-service needs no backend call
}

export interface ChatResponse {
  message: string;
  sources?: Source[];
  session_id?: string;
}

/** GET /market/quote (optional) */
export interface QuoteRequest {
  symbol: string; // VOO | QQQ | BND | SPY | SCHD
}

export interface QuoteResponse {
  symbol: string;
  price: number;
  change_pct?: number;
  updated_at: string; // ISO
}
