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
  USER_PREFERENCES: 'flag-monitor-preferences',
  STATE_PREFERENCE: 'flag-monitor-state-preference',
  STATUS_HISTORY: 'flag-monitor-status-history'
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

export const STATE_OPTIONS = [
  { value: 'US', label: 'United States (Federal)' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
];

export const ARIA_LABELS = {
  FLAG: 'United States flag display',
  STATUS: 'Current flag status',
  LAST_UPDATED: 'Last update time',
  THEME_TOGGLE: 'Toggle dark mode',
  NOTIFICATION_TOGGLE: 'Toggle notifications',
  REFRESH: 'Refresh status'
}; 