/**
 * Flag Status Application
 * @fileoverview Main application class that orchestrates all components
 */

import { UPDATE_INTERVALS, THEMES, CSS_CLASSES } from './config/constants.js';
import { api, APIError } from './utils/api.js';
import { appStorage } from './utils/storage.js';
import { FlagDisplay } from './components/FlagDisplay.js';
import { NotificationManager } from './components/NotificationManager.js';
import { HistoryView } from './components/HistoryView.js';
import { NotificationSystem } from './components/NotificationSystem.js';

/**
 * Main Flag Status Application
 * Orchestrates all components and manages application state
 */
export class FlagStatusApp {
  constructor() {
    // Core state
    this.currentStatus = null;
    this.isOnline = navigator.onLine;
    this.updateInterval = null;
    this.retryTimeout = null;
    
    // Components
    this.flagDisplay = null;
    this.notificationManager = null;
    this.historyView = null;
    this.notificationSystem = null;
    
    // DOM elements
    this.elements = {};
    
    // User preferences
    this.preferences = appStorage.getUserPreferences();
    this.theme = appStorage.getTheme();
    
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('🚀 FlagStatusApp: Starting initialization...');
    
    try {
      // Initialize date display first
      this.initializeDateDisplay();
      
      this.setupDOM();
      console.log('✅ FlagStatusApp: DOM setup complete');
      
      await this.initializeComponents();
      console.log('✅ FlagStatusApp: Components initialized');
      
      this.setupEventListeners();
      console.log('✅ FlagStatusApp: Event listeners setup complete');
      
      this.applyTheme();
      console.log('✅ FlagStatusApp: Theme applied');
      
      this.loadInitialStatus();
      console.log('✅ FlagStatusApp: Loading initial status...');
      
      this.startUpdateCycle();
      console.log('✅ FlagStatusApp: Update cycle started');
      
    } catch (error) {
      console.error('❌ FlagStatusApp: Initialization failed:', error);
      this.showError('Failed to initialize application');
    }
  }

  /**
   * Initialize and update the current date display
   */
  initializeDateDisplay() {
    const updateDate = () => {
      const dateElement = document.getElementById('current-date');
      if (dateElement) {
        const now = new Date();
        const options = { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: 'America/New_York'
        };
        const formattedDate = now.toLocaleDateString('en-US', options);
        dateElement.textContent = formattedDate;
        dateElement.setAttribute('datetime', now.toISOString());
      }
    };

    // Update immediately
    updateDate();
    
    // Update every minute
    setInterval(updateDate, 60000);
    
    // Store reference for potential cleanup
    this.dateUpdateInterval = setInterval(updateDate, 60000);
  }

  /**
   * Setup DOM elements
   */
  setupDOM() {
    this.elements = {
      flagContainer: document.getElementById('flag-container'),
      statusText: document.getElementById('status-text'),
      reason: document.getElementById('reason'),
      lastUpdated: document.getElementById('last-updated'),
      source: document.getElementById('source'),
      loadingOverlay: document.getElementById('loading-overlay'),
      refreshBtn: document.getElementById('refresh-btn'),
      themeToggle: document.getElementById('theme-toggle'),
      notificationToggle: document.getElementById('notification-toggle'),
      settingsBtn: document.getElementById('settings-btn'),
      historyBtn: document.getElementById('history-btn')
    };

    // Validate required elements
    const requiredElements = ['flagContainer', 'statusText', 'reason', 'lastUpdated', 'source'];
    for (const elementKey of requiredElements) {
      if (!this.elements[elementKey]) {
        throw new Error(`Required element not found: ${elementKey}`);
      }
    }
  }

  /**
   * Initialize components
   */
  async initializeComponents() {
    // Initialize flag display
    this.flagDisplay = new FlagDisplay(this.elements.flagContainer);
    
    // Initialize notification manager
    this.notificationManager = new NotificationManager();
    
    // Initialize history view
    this.historyView = new HistoryView();
    
    // Initialize notification system
    this.notificationSystem = new NotificationSystem();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh button
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => {
        this.refreshStatus();
      });
    }

    // Theme toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Notification toggle
    if (this.elements.notificationToggle) {
      this.elements.notificationToggle.addEventListener('click', () => {
        this.toggleNotifications();
      });
    }

    // Settings button
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => {
        this.openSettings();
      });
    }

    // History button
    if (this.elements.historyBtn) {
      this.elements.historyBtn.addEventListener('click', () => {
        this.openHistory();
      });
    }

    // Custom events for new components
    window.addEventListener('show-history', () => {
      this.openHistory();
    });

    window.addEventListener('flag-status-changed', (event) => {
      // This will be handled by the notification system automatically
      console.log('Flag status changed:', event.detail);
    });

    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notificationSystem.showInApp('success', 'Connection Restored', 'You\'re back online!');
      this.refreshStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notificationSystem.showInApp('warning', 'Connection Lost', 'Using cached data until connection is restored.');
    });

    // Visibility change (tab focus/blur)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshStatus();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Theme preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.theme === THEMES.AUTO) {
        this.applyTheme();
      }
    });
  }

  /**
   * Load initial status
   */
  async loadInitialStatus() {
    this.showLoading();
    
    try {
      // Try to load from cache first for faster initial render
      const cachedStatus = appStorage.getLastStatus();
      if (cachedStatus) {
        await this.updateUI(cachedStatus, false);
      }
      
      // Then fetch fresh data
      await this.fetchAndUpdateStatus();
      
    } catch (error) {
      console.error('Failed to load initial status:', error);
      
      // If we have cached data, use it
      const cachedStatus = appStorage.getLastStatus();
      if (cachedStatus) {
        await this.updateUI(cachedStatus, false);
        this.notificationSystem.showInApp('warning', 'Using Cached Data', 'Unable to fetch latest status - showing cached data');
      } else {
        this.handleError('Unable to load flag status');
      }
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Fetch and update status
   */
  async fetchAndUpdateStatus() {
    try {
      const status = await api.getStatus();
      await this.updateUI(status);
      
      // Cache the status
      appStorage.setLastStatus(status);
      
      // Clear any retry timeouts
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      
    } catch (error) {
      console.error('Failed to fetch status:', error);
      
      if (error instanceof APIError) {
        this.handleAPIError(error);
      } else {
        this.handleError('Network error - please check your connection');
      }
      
      // Schedule retry
      this.scheduleRetry();
    }
  }

  /**
   * Update UI with new status
   * @param {Object} status - Flag status data
   * @param {boolean} animate - Whether to animate changes
   */
  async updateUI(status, animate = true) {
    const previousStatus = this.currentStatus;
    this.currentStatus = status;

    // Update flag display
    await this.flagDisplay.updateStatus(status, animate);

    // Update text elements
    this.updateStatusText(status);

    // Handle status change notifications
    if (previousStatus && previousStatus.status !== status.status) {
      // Use both notification systems for compatibility
      this.notificationManager.handleStatusChange(status, previousStatus);
      this.notificationSystem.showFlagStatusChange(status.status, status.reason);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('flag-status-changed', {
        detail: { newStatus: status, previousStatus }
      }));
    }

    // Update page title
    this.updatePageTitle(status);
  }

  /**
   * Update status text elements
   * @param {Object} status - Flag status data
   */
  updateStatusText(status) {
    const statusText = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    
    this.elements.statusText.textContent = statusText;
    this.elements.reason.textContent = status.reason || '';
    this.elements.lastUpdated.textContent = this.formatDate(status.last_updated);
    this.elements.source.textContent = status.source || '';

    // Update status styling
    this.elements.statusText.className = 'status-card__status';
    if (status.status === 'half-staff') {
      this.elements.statusText.classList.add('half-staff');
    } else {
      this.elements.statusText.classList.add('full-staff');
    }

    // Update accessibility
    this.elements.statusText.setAttribute('aria-label', 
      `Current flag status: ${statusText}${status.reason ? `. Reason: ${status.reason}` : ''}`
    );

    // Update connection status
    this.updateConnectionStatus();
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus() {
    const connectionStatus = document.querySelector('.connection-status');
    const connectionText = document.querySelector('.connection-status__text');
    
    if (connectionStatus && connectionText) {
      if (this.isOnline) {
        connectionStatus.classList.remove('offline');
        connectionText.textContent = 'Connected';
      } else {
        connectionStatus.classList.add('offline');
        connectionText.textContent = 'Offline';
      }
    }
  }

  /**
   * Update page title with current status
   * @param {Object} status - Flag status data
   */
  updatePageTitle(status) {
    const statusText = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    document.title = `🇺🇸 Flag Status: ${statusText} | U.S. Flag Monitor`;
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      console.error('Failed to format date:', error);
      return 'Unknown';
    }
  }

  /**
   * Start update cycle
   */
  startUpdateCycle() {
    this.stopUpdateCycle(); // Clear any existing interval
    
    const interval = this.getUpdateInterval();
    this.updateInterval = setInterval(() => {
      if (this.isOnline) {
        this.fetchAndUpdateStatus();
      }
    }, interval);
  }

  /**
   * Stop update cycle
   */
  stopUpdateCycle() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get appropriate update interval
   * @returns {number} Interval in milliseconds
   */
  getUpdateInterval() {
    const hour = new Date().getHours();
    
    // Use faster updates during business hours
    if (hour >= 8 && hour <= 18) {
      return UPDATE_INTERVALS.NORMAL;
    }
    
    // Slower updates overnight
    return UPDATE_INTERVALS.SLOW;
  }

  /**
   * Schedule retry after error
   */
  scheduleRetry() {
    if (this.retryTimeout) return;
    
    this.retryTimeout = setTimeout(() => {
      this.fetchAndUpdateStatus();
    }, 30000); // Retry after 30 seconds
  }

  /**
   * Refresh status manually
   */
  async refreshStatus() {
    if (!this.isOnline) {
      this.notificationSystem.showInApp('warning', 'Offline', 'Cannot refresh - you are offline');
      return;
    }

    this.showLoading();
    await this.fetchAndUpdateStatus();
    this.hideLoading();
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.AUTO];
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    
    this.theme = themes[nextIndex];
    appStorage.setTheme(this.theme);
    this.applyTheme();
    
    this.notificationSystem.showInApp('info', 'Theme Changed', `Theme changed to ${this.theme}`, { duration: 2000 });
  }

  /**
   * Apply current theme
   */
  applyTheme() {
    const body = document.body;
    body.classList.remove(CSS_CLASSES.DARK_THEME);
    
    let isDark = false;
    
    if (this.theme === THEMES.DARK) {
      isDark = true;
    } else if (this.theme === THEMES.AUTO) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDark) {
      body.classList.add(CSS_CLASSES.DARK_THEME);
    }

    // Update theme toggle button
    if (this.elements.themeToggle) {
      const icon = this.getThemeIcon();
      this.elements.themeToggle.innerHTML = icon;
      this.elements.themeToggle.setAttribute('aria-label', `Current theme: ${this.theme}. Click to change.`);
    }
  }

  /**
   * Get theme icon
   * @returns {string} Theme icon
   */
  getThemeIcon() {
    const icons = {
      [THEMES.LIGHT]: '☀️',
      [THEMES.DARK]: '🌙',
      [THEMES.AUTO]: '🔄'
    };
    return icons[this.theme] || icons[THEMES.AUTO];
  }

  /**
   * Toggle notifications
   */
  async toggleNotifications() {
    const status = this.notificationManager.getStatus();
    
    if (status.subscribed) {
      await this.notificationManager.unsubscribe();
    } else {
      await this.notificationManager.subscribe();
    }
    
    this.updateNotificationButton();
  }

  /**
   * Update notification button
   */
  updateNotificationButton() {
    if (!this.elements.notificationToggle) return;
    
    const status = this.notificationManager.getStatus();
    const icon = status.subscribed ? '🔔' : '🔕';
    const label = status.subscribed ? 'Disable notifications' : 'Enable notifications';
    
    this.elements.notificationToggle.innerHTML = icon;
    this.elements.notificationToggle.setAttribute('aria-label', label);
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyboardShortcuts(e) {
    // Only handle shortcuts when not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'r':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.refreshStatus();
        }
        break;
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleTheme();
        }
        break;
      case 'n':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleNotifications();
        }
        break;
    }
  }

  /**
   * Open settings modal
   */
  openSettings() {
    // This would open a settings modal
    console.log('Opening settings...');
    this.notificationSystem.showInApp('info', 'Settings', 'Settings panel coming soon!');
  }

  /**
   * Open history view
   */
  openHistory() {
    if (this.historyView) {
      this.historyView.show();
    } else {
      this.notificationSystem.showInApp('error', 'History Unavailable', 'History view is not available at this time.');
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'flex';
    }
    this.flagDisplay?.showLoading();
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'none';
    }
    this.flagDisplay?.hideLoading();
  }

  /**
   * Handle API errors
   * @param {APIError} error - API error
   */
  handleAPIError(error) {
    let message = 'Unable to fetch flag status';
    
    switch (error.status) {
      case 404:
        message = 'Flag status service not found';
        break;
      case 429:
        message = 'Too many requests - please wait a moment';
        break;
      case 500:
        message = 'Server error - please try again later';
        break;
      case 408:
        message = 'Request timeout - please check your connection';
        break;
    }
    
    this.handleError(message);
  }

  /**
   * Handle general errors
   * @param {string} message - Error message
   */
  handleError(message) {
    console.error('App error:', message);
    
    this.elements.statusText.textContent = 'Error';
    this.elements.statusText.className = 'status-card__status error';
    this.elements.reason.textContent = message;
    this.elements.lastUpdated.textContent = 'Unable to update';
    this.elements.source.textContent = 'Error';
    
    this.flagDisplay?.showError();
    this.notificationSystem?.showInApp('error', 'Error', message);
    this.updateConnectionStatus();
  }

  /**
   * Destroy the application
   */
  destroy() {
    this.stopUpdateCycle();
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    this.flagDisplay?.destroy();
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
  }
} 