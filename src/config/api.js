/**
 * LinkSentry Central API Configuration
 *
 * Priority:
 * 1. VITE_API_BASE_URL (from environment)
 * 2. Production Render Cloud URL (when running in production build)
 * 3. Development LAN PC URL (http://192.168.137.238:8000 for local dev)
 */

const rawEnvUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isProd = import.meta.env.PROD;

export const PRODUCTION_API_URL = 'https://linksentry-api.onrender.com';
export const LOCAL_API_URL = 'http://127.0.0.1:8000';
export const DEVELOPMENT_LAN_URL = 'http://192.168.137.238:8000';

export function getApiBaseUrl() {
  if (rawEnvUrl) return rawEnvUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return LOCAL_API_URL;
    }
  }
  return (isProd ? PRODUCTION_API_URL : DEVELOPMENT_LAN_URL).replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  HEALTH: `${LOCAL_API_URL}/api/health`,
  SCAN_URL: `${LOCAL_API_URL}/api/scan/url`,
  SCAN_MESSAGE: `${LOCAL_API_URL}/api/scan/message`,
};

export default {
  getApiBaseUrl,
  API_BASE_URL,
  PRODUCTION_API_URL,
  LOCAL_API_URL,
  DEVELOPMENT_LAN_URL,
  API_ENDPOINTS,
};