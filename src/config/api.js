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
export const DEVELOPMENT_LAN_URL = 'http://192.168.137.238:8000';

export const API_BASE_URL = (
  rawEnvUrl || (isProd ? PRODUCTION_API_URL : DEVELOPMENT_LAN_URL)
).replace(/\/+$/, '');

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health`,
  SCAN_URL: `${API_BASE_URL}/api/scan/url`,
  SCAN_MESSAGE: `${API_BASE_URL}/api/scan/message`,
};

export default {
  API_BASE_URL,
  PRODUCTION_API_URL,
  DEVELOPMENT_LAN_URL,
  API_ENDPOINTS,
};