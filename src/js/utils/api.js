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
 * Simple in-memory cache for API responses
 */
class APICache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, data, ttl = 300000) { // 5 minutes default TTL
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.timestamps.get(key);
    if (Date.now() > expiry) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

const cache = new APICache();

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * @param {boolean} useCache - Whether to use cache
 * @returns {Promise<any>}
 */
async function makeRequest(endpoint, options = {}, useCache = true) {
  const isGet = !options.method || options.method === 'GET';
  const cacheBuster = isGet ? `t=${Date.now()}` : '';
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_CONFIG.BASE_URL}${endpoint}${cacheBuster ? separator + cacheBuster : ''}`;
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  console.log('[API] Making request to:', url);
  
  // Check cache first for GET requests
  if (useCache && (!options.method || options.method === 'GET')) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[API] Returning cached response for:', url);
      return cached;
    }
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  try {
    console.log('[API] Fetching:', url);
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
    console.log('[API] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    
    const data = await response.json();
    console.log('[API] Response data:', data);
    
    // Cache successful GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      cache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[API] Request failed:', error);
    
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }
    
    throw error;
  }
}

/**
 * Map HalfStaff.org widget response to app status format
 * @param {Object} data
 * @returns {Object}
 */
function mapHalfStaffResponse(data) {
  const isHalfStaff = data?.type && data.type !== 'none';
  return {
    status: isHalfStaff ? 'half-staff' : 'full-staff',
    last_updated: new Date().toISOString(),
    source: 'HalfStaff.org',
    reason: data?.title || data?.reason || (isHalfStaff ? '' : 'No active half-staff notices'),
    expires: null
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
    console.log('[API] Fetching flag status...');
    try {
      const result = await withRetry(() => makeRequest(API_CONFIG.ENDPOINTS.STATUS));
      console.log('[API] Flag status received:', result);
      return result;
    } catch (error) {
      console.error('[API] Failed to get flag status:', error);
      throw error;
    }
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
    return mapHalfStaffResponse(data);
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
  },

  /**
   * Subscribe to push notifications
   * @param {Object} subscription - Push subscription object
   * @returns {Promise<Object>}
   */
  async subscribe(subscription) {
    return withRetry(() => makeRequest(API_CONFIG.ENDPOINTS.SUBSCRIBE, {
      method: 'POST',
      body: JSON.stringify(subscription)
    }), false);
  },

  /**
   * Admin endpoints
   */
  admin: {
    /**
     * Update flag status (admin only)
     * @param {Object} status - New status data
     * @param {string} token - Admin token
     * @returns {Promise<Object>}
     */
    async updateStatus(status, token) {
      return withRetry(() => makeRequest(`${API_CONFIG.ENDPOINTS.ADMIN}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(status)
      }), false);
    },

    /**
     * Get admin dashboard data
     * @param {string} token - Admin token
     * @returns {Promise<Object>}
     */
    async getDashboard(token) {
      return withRetry(() => makeRequest(`${API_CONFIG.ENDPOINTS.ADMIN}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }));
    }
  },

  /**
   * Clear API cache
   */
  clearCache() {
    cache.clear();
  }
}; 