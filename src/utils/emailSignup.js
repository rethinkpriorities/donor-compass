import { endpoints, apiUrlsConfigured } from '../config/api';
import { getOrCreateSessionId } from './session';

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Submit an email signup. When the API URL is not configured (local dev without
 * netlify), logs to console and resolves as a no-op success so the UI flow can
 * be tested without a live backend.
 */
export async function submitEmailSignup({ email, quizState }) {
  const trimmed = email.trim();

  if (!apiUrlsConfigured.emailSignup) {
    console.log('[email-signup] API URL not configured; skipping POST. Payload:', {
      email: trimmed,
      quizState,
    });
    return { success: true, id: null, skipped: true };
  }

  const sessionId = getOrCreateSessionId();

  const response = await fetch(endpoints.emailSignup, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: trimmed, sessionId, quizState }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to submit email');
  }

  return response.json();
}
