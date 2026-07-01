/**
 * Domain-wide constants. Centralized so they never drift between web and api.
 */

export const DEFAULT_STUDY_GOAL_MINUTES = 120;

export const DEFAULT_WEEK_STARTS_ON = 1; // Monday

export const SESSION_COOKIE_NAME = 'studyflow_session';

export const API_BASE_PATH = '/api';
export const API_VERSION = 'v1';
export const API_PREFIX = `${API_BASE_PATH}/${API_VERSION}`;

export const PAGINATION_DEFAULTS = {
  limit: 20,
  maxLimit: 100,
} as const;

export const RATE_LIMITS = {
  global: { windowMs: 60_000, max: 300 },
  auth: { windowMs: 60_000, max: 20 },
  upload: { windowMs: 60_000, max: 30 },
} as const;

export const STUDYFLOW_NAME = 'StudyFlow';
export const STUDYFLOW_TAGLINE = 'Your personal learning operating system.';
