/**
 * LinkSentry Central API Configuration
 *
 * Priority:
 * 1. VITE_API_BASE_URL
 * 2. LAN FastAPI backend for local development
 */

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredBaseUrl || 'http://192.168.29.123:8000'
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