// API configuration for backend endpoints
// Each Lambda has its own Function URL, so each endpoint can have a separate base.
// VITE_API_URL is the share Lambda URL; VITE_DONATE_API_URL is the donate Lambda URL;
// VITE_EXPORT_API_URL is the export Lambda URL; VITE_EMAIL_SIGNUP_API_URL is the email-signup Lambda URL.
// All default to '/api' for local development with netlify dev.

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DONATE_API_URL = import.meta.env.VITE_DONATE_API_URL || '/api';
const EXPORT_API_URL = import.meta.env.VITE_EXPORT_API_URL || '/api';
const EMAIL_SIGNUP_API_URL = import.meta.env.VITE_EMAIL_SIGNUP_API_URL || '/api';

export const endpoints = {
  share: `${API_BASE_URL}/share`,
  donate: `${DONATE_API_URL}/donate`,
  export: `${EXPORT_API_URL}/export`,
  emailSignup: `${EMAIL_SIGNUP_API_URL}/email-signup`,
};

export const apiUrlsConfigured = {
  emailSignup: Boolean(import.meta.env.VITE_EMAIL_SIGNUP_API_URL),
};

export default { API_BASE_URL, endpoints };
