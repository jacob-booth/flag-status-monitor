/**
 * API Utilities
 * @fileoverview Modern API client with retry logic, caching, and error handling
 */

import { API_CONFIG } from '../config/constants.js';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry wrapper for async functions
 * @param {Function} fn - Function to retry
 * @param {number} attempts - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<any>}
 */
async function withRetry(fn, attempts = API_CONFIG.RETRY_ATTEMPTS, delay = API_CONFIG.RETRY_DELAY) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Make HTTP request with modern fetch API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>}
 */
async function makeRequest(endpoint, options = {}) {
  const isGet = !options.method || options.method === 'GET';
  const cacheBuster = isGet ? `t=${Date.now()}` : '';
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_CONFIG.BASE_URL}${endpoint}${cacheBuster ? separator + cacheBuster : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      cache: isGet ? 'no-store' : options.cache,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }

    throw error;
  }
}

/**
 * Map HalfStaff.org widget response to app status format
 * @param {Object} data
 * @param {string} sourceUrl
 * @param {string} scope
 * @returns {Object}
 */
function mapHalfStaffResponse(data, sourceUrl, scope) {
  const isHalfStaff = data?.type && data.type !== 'none';
  const checkedAt = new Date().toISOString();
  return {
    status: isHalfStaff ? 'half-staff' : 'full-staff',
    last_updated: checkedAt,
    last_checked: checkedAt,
    source: 'HalfStaff.org',
    source_url: sourceUrl,
    reason: data?.title || data?.reason || (isHalfStaff ? '' : 'No active half-staff notices'),
    expires: data?.expires || null,
    verification: 'state-provider-signal',
    scope,
    confidence: {
      level: 'provider',
      label: 'State provider reported',
      summary:
        'State notices are reported directly by HalfStaff.org and are separate from federal status.'
    },
    checked_sources: [
      {
        name: 'halfstaff-org',
        result: isHalfStaff ? 'active-order' : 'clear',
        authoritative: false
      }
    ],
    upcoming_order: null,
    recent_order: null
  };
}

/**
 * API client with all endpoints
 */
export const api = {
  /**
   * Get current flag status
   * @returns {Promise<Object>}
   */
  async getStatus() {
    return withRetry(() => makeRequest(API_CONFIG.ENDPOINTS.STATUS));
  },

  /**
   * Get flag status for a specific state via HalfStaff.org
   * @param {string} state
   * @returns {Promise<Object>}
   */
  async getStatusForState(state) {
    const stateParam = state && state !== 'US' ? `?state=${encodeURIComponent(state)}` : '';
    const url = `https://halfstaff.org/wp-json/halfstaff/v1/widget${stateParam}`;
    const separator = url.includes('?') ? '&' : '?';

    const response = await fetch(`${url}${separator}t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new APIError(`HalfStaff API error: ${response.status}`, response.status);
    }

    const data = await response.json();
    return mapHalfStaffResponse(data, url, `state:${state}`);
  },

  /**
   * Get flag status history
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  async getHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `${API_CONFIG.ENDPOINTS.HISTORY}${queryString ? `?${queryString}` : ''}`;
    return withRetry(() => makeRequest(endpoint));
  }
};
