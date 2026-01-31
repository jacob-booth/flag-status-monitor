/**
 * Storage Utilities
 * @fileoverview Safe localStorage wrapper with error handling and type safety
 */

import { STORAGE_KEYS } from '../config/constants.js';

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage wrapper
 */
export const storage = {
  /**
   * Get item from localStorage with JSON parsing
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any}
   */
  get(key, defaultValue = null) {
    if (!isStorageAvailable()) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get storage item "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage with JSON stringification
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    if (!isStorageAvailable()) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set storage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    if (!isStorageAvailable()) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove storage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Clear all localStorage
   * @returns {boolean} Success status
   */
  clear() {
    if (!isStorageAvailable()) return false;
    
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      return false;
    }
  },

  /**
   * Check if key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  has(key) {
    if (!isStorageAvailable()) return false;
    return localStorage.getItem(key) !== null;
  }
};

/**
 * Application-specific storage functions
 */
export const appStorage = {
  /**
   * Get user theme preference
   * @returns {string}
   */
  getTheme() {
    return storage.get(STORAGE_KEYS.THEME, 'auto');
  },

  /**
   * Set user theme preference
   * @param {string} theme - Theme name
   */
  setTheme(theme) {
    storage.set(STORAGE_KEYS.THEME, theme);
  },

  /**
   * Get notification preferences
   * @returns {Object}
   */
  getNotificationPreferences() {
    return storage.get(STORAGE_KEYS.NOTIFICATIONS, {
      enabled: false,
      statusChanges: true,
      errors: false,
      updates: false
    });
  },

  /**
   * Set notification preferences
   * @param {Object} preferences - Notification preferences
   */
  setNotificationPreferences(preferences) {
    storage.set(STORAGE_KEYS.NOTIFICATIONS, preferences);
  },

  /**
   * Get last known flag status
   * @returns {Object|null}
   */
  getLastStatus() {
    return storage.get(STORAGE_KEYS.LAST_STATUS);
  },

  /**
   * Set last known flag status
   * @param {Object} status - Flag status
   */
  setLastStatus(status) {
    storage.set(STORAGE_KEYS.LAST_STATUS, status);
  },

  /**
   * Get user preferences
   * @returns {Object}
   */
  getUserPreferences() {
    return storage.get(STORAGE_KEYS.USER_PREFERENCES, {
      animations: true,
      sounds: false,
      autoRefresh: true,
      compactMode: false
    });
  },

  /**
   * Set user preferences
   * @param {Object} preferences - User preferences
   */
  setUserPreferences(preferences) {
    storage.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  /**
   * Get state preference
   * @returns {string}
   */
  getStatePreference() {
    return storage.get(STORAGE_KEYS.STATE_PREFERENCE, 'US');
  },

  /**
   * Set state preference
   * @param {string} state
   */
  setStatePreference(state) {
    storage.set(STORAGE_KEYS.STATE_PREFERENCE, state);
  },

  /**
   * Get status history
   * @returns {Array}
   */
  getStatusHistory() {
    return storage.get(STORAGE_KEYS.STATUS_HISTORY, []);
  },

  /**
   * Add a status entry to history
   * @param {Object} status
   */
  addStatusHistory(status) {
    const history = storage.get(STORAGE_KEYS.STATUS_HISTORY, []);
    const entry = {
      date: status.last_updated || new Date().toISOString(),
      status: status.status,
      reason: status.reason || '',
      source: status.source || ''
    };

    const updated = [entry, ...history].slice(0, 200);
    storage.set(STORAGE_KEYS.STATUS_HISTORY, updated);
  },

  /**
   * Clear all app-specific storage
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      storage.remove(key);
    });
  }
}; 