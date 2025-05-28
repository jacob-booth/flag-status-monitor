/**
 * Application Constants
 * @fileoverview Central configuration for all application constants
 */

export const API_CONFIG = {
  BASE_URL: window.location.hostname === 'jacob-booth.github.io' 
    ? '/flag-status-monitor/api' 
    : '/api',
  ENDPOINTS: {
    STATUS: window.location.hostname === 'jacob-booth.github.io' ? '/status.json' : '/status',
    HISTORY: window.location.hostname === 'jacob-booth.github.io' ? '/history.json' : '/history',
    SUBSCRIBE: '/subscribe',
    ADMIN: '/admin'
  },
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

export const UPDATE_INTERVALS = {
  NORMAL: 3600000, // 1 hour
  FAST: 300000,    // 5 minutes (when status changes expected)
  SLOW: 21600000   // 6 hours (overnight)
};

export const ANIMATION_CONFIG = {
  FLAG_TRANSITION: 2000,
  WAVE_DURATION: 6000,
  LOADING_FADE: 300,
  STATUS_CHANGE: 1500
};

export const STORAGE_KEYS = {
  THEME: 'flag-monitor-theme',
  NOTIFICATIONS: 'flag-monitor-notifications',
  LAST_STATUS: 'flag-monitor-last-status',
  USER_PREFERENCES: 'flag-monitor-preferences'
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

export const FLAG_POSITIONS = {
  FULL_STAFF: 'full-staff',
  HALF_STAFF: 'half-staff'
};

export const NOTIFICATION_TYPES = {
  STATUS_CHANGE: 'status-change',
  ERROR: 'error',
  UPDATE: 'update'
};

export const CSS_CLASSES = {
  HALF_STAFF: 'half-staff',
  LOADING: 'loading',
  ERROR: 'error',
  DARK_THEME: 'dark-theme',
  HIDDEN: 'hidden',
  FADE_IN: 'fade-in',
  FADE_OUT: 'fade-out'
};

export const ARIA_LABELS = {
  FLAG: 'United States flag display',
  STATUS: 'Current flag status',
  LAST_UPDATED: 'Last update time',
  THEME_TOGGLE: 'Toggle dark mode',
  NOTIFICATION_TOGGLE: 'Toggle notifications',
  REFRESH: 'Refresh status'
}; 