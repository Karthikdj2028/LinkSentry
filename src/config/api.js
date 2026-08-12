/**
 * LinkSentry Central API Configuration
 *
 * Resolves the backend API base URL from the Vite environment:
 * - VITE_API_BASE_URL (from .env.local, .env.production, or environment variables)
 * - Fallback to local development FastAPI server (http://127.0.0.1:8000)
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health`,
  SCAN_URL: `${API_BASE_URL}/api/scan/url`,
  SCAN_MESSAGE: `${API_BASE_URL}/api/scan/message`,
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
