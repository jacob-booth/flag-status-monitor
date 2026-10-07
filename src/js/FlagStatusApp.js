/**
 * Flag Status Application
 * @fileoverview Main application class that orchestrates all components.
 */

import { UPDATE_INTERVALS, THEMES, CSS_CLASSES, STATE_OPTIONS } from './config/constants.js';
import { api, APIError } from './utils/api.js';
import { appStorage } from './utils/storage.js';
import { calculateHistoryStats, normalizeHistory } from './utils/history.js';
import { FlagDisplay } from './components/FlagDisplay.js';
import { NotificationCenter } from './components/NotificationCenter.js';
import { HistoryView } from './components/HistoryView.js';
import { SettingsModal } from './components/SettingsModal.js';
import { EtiquetteModal } from './components/EtiquetteModal.js';
import {
  getDetailedFlagInfo,
  getNearestFederalHoliday,
  getTodaysObservance,
  formatHolidayDate
} from './utils/flagInfo.js';

export class FlagStatusApp {
  constructor() {
    this.currentStatus = null;
    this.isOnline = navigator.onLine;
    this.updateInterval = null;
    this.retryTimeout = null;
    this.verificationInterval = null;

    this.flagDisplay = null;
    this.notifications = null;
    this.historyView = null;
    this.settingsModal = null;
    this.etiquetteModal = null;

    this.elements = {};

    this.preferences = appStorage.getUserPreferences();
    this.theme = appStorage.getTheme();
    this.selectedState = appStorage.getStatePreference();
    appStorage.clearLegacyStatusHistory();

    this.init();
  }

  async init() {
    try {
      this.setupDOM();
      this.populateStateOptions();
      this.initializeComponents();
      this.setupEventListeners();
      this.applyTheme();
      this.updateDateDisplay();
      this.dateInterval = setInterval(() => this.updateDateDisplay(), 60000);

      await this.loadInitialStatus();
      this.startUpdateCycle();
      this.handleLaunchAction();
    } catch (error) {
      console.error('FlagStatusApp initialization failed:', error);
      this.handleError('Failed to initialize application. Please refresh the page.');
    }
  }

  updateDateDisplay() {
    const dateElement = document.getElementById('current-date');
    if (!dateElement) return;

    const now = new Date();
    dateElement.textContent = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    }).format(now);
    dateElement.setAttribute('datetime', now.toISOString());
  }

  setupDOM() {
    this.elements = {
      flagContainer: document.getElementById('flag-container'),
      statusText: document.getElementById('status-text'),
      reason: document.getElementById('reason'),
      lastUpdated: document.getElementById('last-updated'),
      lastChecked: document.getElementById('last-checked'),
      source: document.getElementById('source'),
      loadingOverlay: document.getElementById('loading-overlay'),
      refreshBtn: document.getElementById('refresh-btn'),
      themeToggle: document.getElementById('theme-toggle'),
      notificationToggle: document.getElementById('notification-toggle'),
      settingsBtn: document.getElementById('settings-btn'),
      historyBtn: document.getElementById('history-btn'),
      etiquetteBtn: document.getElementById('etiquette-btn'),
      stateSelect: document.getElementById('state-select'),
      statChanges: document.getElementById('stat-changes'),
      statStreak: document.getElementById('stat-streak'),
      statHoliday: document.getElementById('stat-holiday'),
      healthPill: document.getElementById('health-pill'),
      healthPillText: document.getElementById('health-pill-text'),
      verificationPanel: document.getElementById('verification-panel'),
      verificationLabel: document.getElementById('verification-label'),
      verificationSummary: document.getElementById('verification-summary'),
      verificationAge: document.getElementById('verification-age'),
      orderWindow: document.getElementById('order-window'),
      sourceChecks: document.getElementById('source-checks'),
      sourceCheckCount: document.getElementById('source-check-count'),
      tributeBanner: document.getElementById('tribute-banner'),
      tributeMessage: document.getElementById('tribute-message'),
      tributeSource: document.getElementById('tribute-source')
    };

    const required = ['flagContainer', 'statusText', 'reason', 'lastUpdated', 'source'];
    const missing = required.filter((key) => !this.elements[key]);
    if (missing.length) {
      throw new Error(`Required element(s) not found: ${missing.join(', ')}`);
    }
  }

  populateStateOptions() {
    if (!this.elements.stateSelect) return;

    this.elements.stateSelect.innerHTML = STATE_OPTIONS.map(
      (option) => `<option value="${option.value}">${option.label}</option>`
    ).join('');
    this.elements.stateSelect.value = this.selectedState || 'US';
  }

  initializeComponents() {
    this.flagDisplay = new FlagDisplay(this.elements.flagContainer);
    this.notifications = new NotificationCenter();
    this.historyView = new HistoryView();
    this.updateNotificationButton();
  }

  setupEventListeners() {
    this.elements.refreshBtn?.addEventListener('click', () => this.refreshStatus());

    this.elements.stateSelect?.addEventListener('change', (event) => {
      this.selectedState = event.target.value;
      appStorage.setStatePreference(this.selectedState);
      this.refreshStatus();
    });

    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    this.elements.notificationToggle?.addEventListener('click', () => this.toggleNotifications());
    this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.elements.historyBtn?.addEventListener('click', () => this.openHistory());
    this.elements.etiquetteBtn?.addEventListener('click', () => this.showFlagEtiquette());

    document.getElementById('quick-refresh')?.addEventListener('click', () => this.refreshStatus());
    document.getElementById('quick-history')?.addEventListener('click', () => this.openHistory());
    document
      .getElementById('quick-notifications')
      ?.addEventListener('click', () => this.toggleNotifications());
    document
      .getElementById('quick-etiquette')
      ?.addEventListener('click', () => this.showFlagEtiquette());

    window.addEventListener('show-history', () => this.openHistory());

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifications.showInApp('success', 'Connection Restored', "You're back online!");
      this.refreshStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifications.showInApp(
        'warning',
        'Connection Lost',
        'Using cached data until connection is restored.'
      );
      this.updateConnectionStatus();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.preferences.autoRefresh) {
        this.refreshStatus();
      }
    });

    document.addEventListener('keydown', (event) => this.handleKeyboardShortcuts(event));

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme === THEMES.AUTO) this.applyTheme();
    });
  }

  async loadInitialStatus() {
    this.showLoading();

    try {
      const cachedStatus = appStorage.getLastStatus();
      if (cachedStatus) {
        await this.updateUI(cachedStatus, false);
      }
      await this.fetchAndUpdateStatus();
    } catch (error) {
      console.error('Failed to load initial status:', error);
      const cachedStatus = appStorage.getLastStatus();
      if (cachedStatus) {
        await this.updateUI(cachedStatus, false);
        this.notifications.showInApp(
          'warning',
          'Using Cached Data',
          'Unable to fetch the latest status.'
        );
      } else {
        this.handleError('Unable to load flag status.');
      }
    } finally {
      this.hideLoading();
    }
  }

  async fetchAndUpdateStatus() {
    try {
      const status =
        this.selectedState === 'US'
          ? await api.getStatus()
          : await api.getStatusForState(this.selectedState);

      await this.updateUI(status);
      appStorage.setLastStatus(status);

      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
      if (error instanceof APIError) {
        this.handleAPIError(error);
      } else {
        this.handleError('Network error — please check your connection.');
      }
      this.scheduleRetry();
    }
  }

  async updateUI(status, animate = true) {
    const previousStatus = this.currentStatus;
    this.currentStatus = status;

    await this.flagDisplay.updateStatus(status, animate);
    this.updateStatusText(status);
    this.updateVerification(status);
    this.updateTribute(status);
    this.updateEnhancedStatusDisplay(status);
    await this.updateHeroStats();

    if (previousStatus && previousStatus.status !== status.status) {
      this.notifications.notifyStatusChange(status.status, status.reason);
      window.dispatchEvent(
        new CustomEvent('flag-status-changed', { detail: { newStatus: status, previousStatus } })
      );
    }

    this.updatePageTitle(status);
  }

  updateStatusText(status) {
    const statusText = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';

    this.elements.statusText.textContent = statusText;
    this.elements.statusText.classList.remove('skeleton');
    this.elements.reason.textContent = status.reason || '';
    this.elements.reason.classList.remove('skeleton');
    this.elements.lastUpdated.textContent = this.formatDate(status.last_updated);
    this.elements.lastUpdated.setAttribute('datetime', status.last_updated || '');
    if (this.elements.lastChecked) {
      const checkedAt = status.last_checked || status.last_updated;
      this.elements.lastChecked.textContent = this.formatDate(checkedAt);
      this.elements.lastChecked.setAttribute('datetime', checkedAt || '');
    }
    this.elements.source.textContent = status.source || 'Source unavailable';
    if (status.source_url) {
      this.elements.source.href = status.source_url;
      this.elements.source.removeAttribute('aria-disabled');
    } else {
      this.elements.source.removeAttribute('href');
      this.elements.source.setAttribute('aria-disabled', 'true');
    }

    this.elements.statusText.className = 'status-card__status';
    this.elements.statusText.classList.add(
      status.status === 'half-staff' ? 'half-staff' : 'full-staff'
    );
    this.elements.statusText.setAttribute(
      'aria-label',
      `Current flag status: ${statusText}${status.reason ? `. Reason: ${status.reason}` : ''}`
    );

    this.updateConnectionStatus();
  }

  updateVerification(status) {
    const confidence = status.confidence || this.legacyConfidence(status);
    if (this.elements.verificationPanel) {
      this.elements.verificationPanel.dataset.level = confidence.level;
    }
    if (this.elements.verificationLabel) {
      this.elements.verificationLabel.textContent = confidence.label;
    }
    if (this.elements.verificationSummary) {
      this.elements.verificationSummary.textContent = confidence.summary;
    }

    if (this.elements.orderWindow) {
      this.elements.orderWindow.textContent =
        status.status === 'half-staff' && status.expires
          ? `Through ${this.formatEasternDate(status.expires)}`
          : 'No active federal order';
    }

    this.renderSourceChecks(status.checked_sources || []);
    this.renderVerificationAge(status);
    if (this.verificationInterval) clearInterval(this.verificationInterval);
    this.verificationInterval = setInterval(() => this.renderVerificationAge(status), 60000);
  }

  legacyConfidence(status) {
    if (status.verification === 'official-presidential-action') {
      return {
        level: 'official',
        label: 'Official order verified',
        summary: 'Matched to an official presidential action.'
      };
    }
    return {
      level: 'provider',
      label: 'Provider reported',
      summary: 'Showing the strongest currently available status signal.'
    };
  }

  renderVerificationAge(status) {
    const checkedAt = new Date(status.last_checked || status.last_updated);
    const ageMs = Date.now() - checkedAt.getTime();
    const valid = !Number.isNaN(ageMs);
    const freshness =
      !valid || ageMs > 8 * 60 * 60 * 1000 ? 'stale' : ageMs > 90 * 60 * 1000 ? 'delayed' : 'fresh';
    const label = valid ? this.formatRelativeAge(checkedAt) : 'Verification time unavailable';

    if (this.elements.verificationAge) {
      this.elements.verificationAge.textContent = label;
    }
    if (this.elements.healthPill) {
      this.elements.healthPill.dataset.freshness = freshness;
    }
    if (this.elements.healthPillText) {
      this.elements.healthPillText.textContent =
        freshness === 'fresh'
          ? 'Verified'
          : freshness === 'delayed'
            ? 'Check delayed'
            : 'Data stale';
    }
  }

  formatRelativeAge(date) {
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  renderSourceChecks(sources) {
    if (!this.elements.sourceChecks) return;
    const names = {
      'known-orders': 'Reviewed orders',
      'verified-schedule': 'Verified schedule',
      'white-house': 'White House',
      'breaking-news': 'Breaking reports',
      'halfstaff-org': 'HalfStaff.org'
    };
    const labels = {
      'active-order': 'Active order',
      clear: 'Clear',
      unavailable: 'Unavailable'
    };

    this.elements.sourceChecks.replaceChildren();
    sources.forEach((source) => {
      const result = source.result || (source.available ? 'clear' : 'unavailable');
      const item = document.createElement('li');
      item.className = 'source-checks__item';
      item.dataset.result = result;

      const indicator = document.createElement('span');
      indicator.className = 'source-checks__indicator';
      indicator.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'source-checks__name';
      name.textContent = names[source.name] || source.name;

      const resultLabel = document.createElement('span');
      resultLabel.className = 'source-checks__result';
      resultLabel.textContent = labels[result] || result;
      item.append(indicator, name, resultLabel);
      this.elements.sourceChecks.append(item);
    });

    if (this.elements.sourceCheckCount) {
      const responding = sources.filter(
        (source) =>
          (source.result || (source.available ? 'clear' : 'unavailable')) !== 'unavailable'
      ).length;
      this.elements.sourceCheckCount.textContent = `${responding}/${sources.length} responding`;
    }
  }

  updateConnectionStatus() {
    const indicator = document.querySelector('.connection-status');
    const text = document.querySelector('.connection-status__text');
    if (!indicator || !text) return;

    indicator.classList.toggle('offline', !this.isOnline);
    text.textContent = this.isOnline ? 'Connected' : 'Offline';
  }

  updateTribute(status) {
    const upcoming = status.upcoming_order;
    const recent = status.recent_order;
    const activeDollyOrder =
      status.status === 'half-staff' && status.reason?.toLowerCase().includes('dolly parton');
    const upcomingDollyOrder = upcoming?.reason?.toLowerCase().includes('dolly parton');
    const recentDollyOrder = recent?.reason?.toLowerCase().includes('dolly parton');
    const showTribute = activeDollyOrder || upcomingDollyOrder || recentDollyOrder;

    document.body.classList.toggle('tribute-dolly', Boolean(showTribute));
    if (!this.elements.tributeBanner) return;

    this.elements.tributeBanner.hidden = !showTribute;
    if (!showTribute) return;

    const order = activeDollyOrder ? status : upcomingDollyOrder ? upcoming : recent;
    if (this.elements.tributeMessage) {
      if (activeDollyOrder) {
        this.elements.tributeMessage.textContent = `The flag is lowered nationwide through ${this.formatEasternDate(order.expires)}.`;
      } else if (upcomingDollyOrder) {
        this.elements.tributeMessage.textContent = `The flag will be lowered nationwide from ${this.formatEasternDate(order.starts)} through ${this.formatEasternDate(order.expires)}.`;
      } else {
        this.elements.tributeMessage.textContent = `Flags were lowered nationwide from ${this.formatEasternDate(order.starts)} through ${this.formatEasternDate(order.expires)} in her memory.`;
      }
    }

    if (this.elements.tributeSource) {
      this.elements.tributeSource.href = order.source_url;
    }
  }

  formatEasternDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'the announced time';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    }).format(date);
  }

  updatePageTitle(status) {
    const statusText = status.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    document.title = `🇺🇸 ${statusText} | U.S. Flag Status Monitor`;
  }

  updateEnhancedStatusDisplay(status) {
    try {
      const flagInfo = getDetailedFlagInfo(status.status, status.reason);
      this.updateContextInfo(flagInfo);
      this.updateTodaysObservance();
      this.updateUpcomingHolidays();
      this.updateHistoricalNote();
    } catch (error) {
      console.error('Failed to update enhanced status display:', error);
    }
  }

  updateContextInfo(flagInfo) {
    const el = document.querySelector('.status-card__context');
    if (el && flagInfo.context) {
      el.textContent = flagInfo.context;
      el.style.display = 'block';
    }

    const flagCodeRef = document.getElementById('flag-code-ref');
    const sectionEl = document.querySelector('.flag-code-section');
    const textEl = document.querySelector('.flag-code-text');
    const noteEl = document.querySelector('.flag-code-note');
    if (flagCodeRef && flagInfo.flagCode) {
      sectionEl.textContent = flagInfo.flagCode.section;
      textEl.textContent = flagInfo.flagCode.text;
      noteEl.textContent = flagInfo.flagCode.note;
      flagCodeRef.style.display = 'block';
    }
  }

  updateTodaysObservance() {
    const section = document.getElementById('todays-observance');
    const textEl = document.querySelector('.observance-badge__text');
    const todays = getTodaysObservance();

    if (todays && section && textEl) {
      textEl.textContent = todays.name;
      section.style.display = 'block';
    } else if (section) {
      section.style.display = 'none';
    }
  }

  updateUpcomingHolidays() {
    const section = document.getElementById('upcoming-holiday');
    const nameEl = document.querySelector('.holiday-info__name');
    const dateEl = document.querySelector('.holiday-info__date');
    const countdownEl = document.querySelector('.holiday-info__countdown');
    const { upcoming } = getNearestFederalHoliday();

    if (upcoming && section && nameEl && dateEl && countdownEl) {
      nameEl.textContent = upcoming.name;
      dateEl.textContent = formatHolidayDate(upcoming.date);
      countdownEl.textContent =
        upcoming.daysUntil === 0
          ? 'Today'
          : upcoming.daysUntil === 1
            ? 'Tomorrow'
            : `In ${upcoming.daysUntil} days`;
      section.style.display = 'block';

      if (this.elements.statHoliday) {
        this.elements.statHoliday.textContent =
          upcoming.daysUntil === 0
            ? 'Today'
            : upcoming.daysUntil === 1
              ? '1 day'
              : `${upcoming.daysUntil} days`;
      }
    } else if (section) {
      section.style.display = 'none';
    }
  }

  updateHistoricalNote() {
    const section = document.getElementById('historical-note');
    const textEl = document.querySelector('.historical-note__text');
    const flagInfo = getDetailedFlagInfo(this.currentStatus?.status, this.currentStatus?.reason);

    if (flagInfo.historicalNote && section && textEl) {
      textEl.textContent = flagInfo.historicalNote;
      section.style.display = 'flex';
    } else if (section) {
      section.style.display = 'none';
    }
  }

  /** Populates the at-a-glance stat chips in the hero section. */
  async updateHeroStats() {
    try {
      const response = await api.getHistory();
      const stats = calculateHistoryStats(normalizeHistory(response.history));

      if (this.elements.statChanges) {
        this.elements.statChanges.textContent = stats.officialOrders;
      }
      if (this.elements.statStreak) {
        this.elements.statStreak.textContent =
          stats.currentRunDays === 0 ? 'Today' : `${stats.currentRunDays}d`;
      }
    } catch (error) {
      console.warn('Unable to load verified history stats:', error);
      if (this.elements.statChanges) this.elements.statChanges.textContent = '–';
      if (this.elements.statStreak) this.elements.statStreak.textContent = '–';
    }
  }

  formatDate(dateString) {
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(dateString)
      );
    } catch {
      return 'Unknown';
    }
  }

  startUpdateCycle() {
    this.stopUpdateCycle();
    if (!this.preferences.autoRefresh) return;

    this.updateInterval = setInterval(() => {
      if (this.isOnline) this.fetchAndUpdateStatus();
    }, this.getUpdateInterval());
  }

  stopUpdateCycle() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getUpdateInterval() {
    return this.currentStatus?.status === 'half-staff' || this.currentStatus?.upcoming_order
      ? UPDATE_INTERVALS.FAST
      : UPDATE_INTERVALS.NORMAL;
  }

  scheduleRetry() {
    if (this.retryTimeout) return;
    this.retryTimeout = setTimeout(() => this.fetchAndUpdateStatus(), 30000);
  }

  async refreshStatus() {
    if (!this.isOnline) {
      this.notifications.showInApp('warning', 'Offline', 'Cannot refresh while offline.');
      return;
    }

    this.showLoading();
    await this.fetchAndUpdateStatus();
    this.hideLoading();
  }

  toggleTheme() {
    const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.AUTO];
    const next = themes[(themes.indexOf(this.theme) + 1) % themes.length];
    this.setTheme(next);
    this.notifications.showInApp('info', 'Theme Changed', `Theme set to ${next}.`, {
      duration: 2000
    });
  }

  setTheme(theme) {
    this.theme = theme;
    appStorage.setTheme(theme);
    this.applyTheme();
  }

  applyTheme() {
    const isDark =
      this.theme === THEMES.DARK ||
      (this.theme === THEMES.AUTO && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.body.classList.toggle(CSS_CLASSES.DARK_THEME, isDark);

    if (this.elements.themeToggle) {
      this.elements.themeToggle.innerHTML = `<span aria-hidden="true">${this.getThemeIcon()}</span>`;
      this.elements.themeToggle.setAttribute(
        'aria-label',
        `Current theme: ${this.theme}. Click to change.`
      );
    }
  }

  getThemeIcon() {
    return { [THEMES.LIGHT]: '☀️', [THEMES.DARK]: '🌙', [THEMES.AUTO]: '🖥️' }[this.theme] || '🖥️';
  }

  async toggleNotifications() {
    const status = this.notifications.getStatus();
    await this.notifications.setEnabled(!status.subscribed);
    this.updateNotificationButton();
    this.settingsModal?.refresh();
  }

  updateNotificationButton() {
    if (!this.elements.notificationToggle) return;
    const status = this.notifications.getStatus();
    this.elements.notificationToggle.innerHTML = `<span aria-hidden="true">${status.subscribed ? '🔔' : '🔕'}</span>`;
    this.elements.notificationToggle.setAttribute(
      'aria-label',
      status.subscribed ? 'Disable notifications' : 'Enable notifications'
    );
    this.elements.notificationToggle.dataset.active = String(status.subscribed);
  }

  handleKeyboardShortcuts(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (!(event.ctrlKey || event.metaKey)) return;

    switch (event.key.toLowerCase()) {
      case 'r':
        event.preventDefault();
        this.refreshStatus();
        break;
      case 't':
        event.preventDefault();
        this.toggleTheme();
        break;
      case 'n':
        event.preventDefault();
        this.toggleNotifications();
        break;
      default:
        break;
    }
  }

  openSettings() {
    if (!this.settingsModal) {
      this.settingsModal = new SettingsModal({
        getState: () => ({
          theme: this.theme,
          notificationsEnabled: this.notifications.getStatus().subscribed,
          autoRefresh: this.preferences.autoRefresh
        }),
        onThemeChange: (theme) => this.setTheme(theme),
        onNotificationsChange: async (enabled) => {
          await this.notifications.setEnabled(enabled);
          this.updateNotificationButton();
        },
        onAutoRefreshChange: (enabled) => {
          this.preferences.autoRefresh = enabled;
          appStorage.setUserPreferences(this.preferences);
          this.startUpdateCycle();
        },
        onClearData: () => {
          appStorage.clearAll();
          this.notifications.showInApp(
            'success',
            'Data Cleared',
            'Local history and preferences were reset.'
          );
          this.settingsModal.hide();
          setTimeout(() => window.location.reload(), 600);
        }
      });
    }
    this.settingsModal.show();
  }

  showFlagEtiquette() {
    if (!this.etiquetteModal) {
      this.etiquetteModal = new EtiquetteModal();
    }
    this.etiquetteModal.show();
  }

  openHistory() {
    if (this.historyView) {
      this.historyView.show();
    } else {
      this.notifications.showInApp(
        'error',
        'History Unavailable',
        'History view is not available right now.'
      );
    }
  }

  showLoading() {
    this.elements.loadingOverlay?.classList.add('is-visible');
    this.elements.loadingOverlay?.setAttribute('aria-hidden', 'false');
    document.getElementById('main-content')?.setAttribute('aria-busy', 'true');
    this.flagDisplay?.showLoading();
  }

  hideLoading() {
    this.elements.loadingOverlay?.classList.remove('is-visible');
    this.elements.loadingOverlay?.setAttribute('aria-hidden', 'true');
    document.getElementById('main-content')?.setAttribute('aria-busy', 'false');
    this.flagDisplay?.hideLoading();
  }

  handleAPIError(error) {
    const messages = {
      404: 'Flag status service not found.',
      429: 'Too many requests — please wait a moment.',
      500: 'Server error — please try again later.',
      408: 'Request timed out — please check your connection.'
    };
    this.handleError(messages[error.status] || 'Unable to fetch flag status.');
  }

  handleError(message) {
    console.error('App error:', message);

    this.elements.statusText.textContent = 'Error';
    this.elements.statusText.className = 'status-card__status error';
    this.elements.reason.textContent = message;
    this.elements.lastUpdated.textContent = 'Unable to update';
    if (this.elements.lastChecked) this.elements.lastChecked.textContent = 'Verification failed';
    this.elements.source.textContent = 'Error';

    this.flagDisplay?.showError();
    this.notifications?.showInApp('error', 'Error', message);
    this.updateConnectionStatus();
  }

  /** Honors `?action=refresh` / `?action=history`, used by the PWA's app shortcuts. */
  handleLaunchAction() {
    const action = new URLSearchParams(window.location.search).get('action');
    if (action === 'refresh') this.refreshStatus();
    if (action === 'history') this.openHistory();
  }

  destroy() {
    this.stopUpdateCycle();
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (this.verificationInterval) clearInterval(this.verificationInterval);
    if (this.dateInterval) clearInterval(this.dateInterval);
    this.flagDisplay?.destroy();
  }
}
