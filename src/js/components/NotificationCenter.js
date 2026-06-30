/**
 * Notification Center
 * @fileoverview Single source of truth for in-app toasts, browser
 *   notifications, and push subscriptions. This replaces the previous
 *   NotificationManager + NotificationSystem pair, which independently
 *   registered the service worker and tracked push subscriptions —
 *   duplicated state that could drift out of sync.
 */
import { appStorage } from '../utils/storage.js';

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  flag: '🇺🇸'
};

const DEFAULT_DURATIONS = {
  success: 4000,
  warning: 6000,
  error: 8000,
  info: 5000,
  flag: 8000
};

export class NotificationCenter {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.swRegistration = null;
    this.pushSubscription = null;
    this.toasts = [];
    this.maxToasts = 4;
    this.preferences = appStorage.getNotificationPreferences();

    this.init();
  }

  async init() {
    this.ensureContainer();
    if (this.isSupported) {
      await this.registerServiceWorker();
      await this.hydratePushSubscription();
    }
  }

  ensureContainer() {
    this.container = document.querySelector('.notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(this.container);
    }
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.error('[NotificationCenter] Service worker registration failed:', error);
    }
  }

  async hydratePushSubscription() {
    if (!this.swRegistration || !('PushManager' in window)) return;
    try {
      this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('[NotificationCenter] Failed to read push subscription:', error);
    }
  }

  /** Request OS-level permission and, if granted, persist the preference. */
  async subscribe() {
    if (!this.isSupported) {
      this.showInApp('error', 'Not Supported', 'Your browser does not support notifications.');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
    } catch (error) {
      console.error('[NotificationCenter] Permission request failed:', error);
      this.showInApp('error', 'Permission Error', 'Could not request notification permission.');
      return false;
    }

    if (this.permission !== 'granted') {
      this.showInApp(
        'warning',
        'Notifications Blocked',
        'Enable notifications in your browser settings to receive updates.'
      );
      return false;
    }

    this.preferences.enabled = true;
    appStorage.setNotificationPreferences(this.preferences);
    this.showInApp(
      'success',
      'Notifications Enabled',
      "You'll be notified when the flag status changes."
    );
    return true;
  }

  async unsubscribe() {
    try {
      if (this.pushSubscription) {
        await this.pushSubscription.unsubscribe();
        this.pushSubscription = null;
      }
    } catch (error) {
      console.error('[NotificationCenter] Failed to unsubscribe:', error);
    }

    this.preferences.enabled = false;
    appStorage.setNotificationPreferences(this.preferences);
    this.showInApp('info', 'Notifications Disabled', "You won't receive status-change alerts.");
    return true;
  }

  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      subscribed: this.preferences.enabled && this.permission === 'granted'
    };
  }

  setEnabled(enabled) {
    return enabled ? this.subscribe() : this.unsubscribe();
  }

  /** Browser-level notification (only fires with permission + page hidden conditions met by the OS). */
  notifyBrowser(title, options = {}) {
    if (this.permission !== 'granted') return null;

    try {
      const notification = new Notification(title, {
        icon: './assets/icon-192x192.svg',
        tag: 'flag-status',
        renotify: true,
        ...options
      });
      setTimeout(() => notification.close(), 6000);
      return notification;
    } catch (error) {
      console.error('[NotificationCenter] Browser notification failed:', error);
      return null;
    }
  }

  /** Toast-style in-app notification. Returns the toast record so callers can remove it manually. */
  showInApp(type = 'info', title, message = '', options = {}) {
    const toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message,
      duration: options.duration ?? DEFAULT_DURATIONS[type] ?? 5000,
      actions: options.actions || [],
      persistent: options.persistent || false
    };

    this.toasts.unshift(toast);
    if (this.toasts.length > this.maxToasts) {
      const evicted = this.toasts.splice(this.maxToasts);
      evicted.forEach((t) => this.removeToastElement(t.id));
    }

    this.renderToast(toast);

    if (!toast.persistent && toast.duration > 0) {
      setTimeout(() => this.removeToast(toast.id), toast.duration);
    }

    return toast;
  }

  renderToast(toast) {
    const el = document.createElement('div');
    el.className = `notification notification--${toast.type}`;
    el.dataset.id = toast.id;
    el.setAttribute('role', 'status');

    el.innerHTML = `
      <div class="notification__content">
        <div class="notification__header">
          <span class="notification__icon" aria-hidden="true">${ICONS[toast.type] || ICONS.info}</span>
          <h4 class="notification__title">${toast.title}</h4>
          <button class="notification__close btn btn--icon btn--ghost" aria-label="Dismiss notification">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        ${toast.message ? `<p class="notification__message">${toast.message}</p>` : ''}
        ${
          toast.actions.length
            ? `<div class="notification__actions">
                ${toast.actions
                  .map(
                    (action) =>
                      `<button class="btn btn--sm btn--${action.style || 'secondary'}" data-action-id="${action.id}">${action.label}</button>`
                  )
                  .join('')}
              </div>`
            : ''
        }
        <div class="notification__progress"></div>
      </div>
    `;

    el.querySelector('.notification__close').addEventListener('click', () =>
      this.removeToast(toast.id)
    );

    toast.actions.forEach((action) => {
      el.querySelector(`[data-action-id="${action.id}"]`)?.addEventListener('click', () => {
        action.handler?.();
        if (!action.keepOpen) this.removeToast(toast.id);
      });
    });

    if (!toast.persistent && toast.duration > 0) {
      const progress = el.querySelector('.notification__progress');
      progress.style.animationDuration = `${toast.duration}ms`;
      progress.classList.add('notification__progress--active');
    }

    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('notification--show'));
  }

  removeToast(id) {
    this.removeToastElement(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  removeToastElement(id) {
    const el = this.container?.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('notification--hide');
    setTimeout(() => el.remove(), 300);
  }

  clearAll() {
    [...this.toasts].forEach((toast) => this.removeToast(toast.id));
  }

  /** High-level helper used whenever the flag status changes. */
  notifyStatusChange(status, reason = '') {
    const isHalfStaff = status === 'half-staff';
    const title = `Flag ${isHalfStaff ? 'Lowered to Half-Staff' : 'Raised to Full-Staff'}`;
    const message = reason || `The U.S. flag is now flying at ${status}.`;

    if (this.preferences.enabled) {
      this.notifyBrowser(title, { body: message, tag: 'flag-status-change' });
    }

    this.showInApp('flag', title, message, {
      duration: 8000,
      actions: [
        {
          id: 'view-history',
          label: 'View History',
          style: 'primary',
          handler: () => window.dispatchEvent(new CustomEvent('show-history'))
        },
        {
          id: 'share',
          label: 'Share',
          style: 'secondary',
          handler: () => this.shareStatus(status, reason)
        }
      ]
    });
  }

  async shareStatus(status, reason = '') {
    const text = `The U.S. flag is currently at ${status}. ${reason}`.trim();
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'U.S. Flag Status', text, url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    this.fallbackShare(`${text}\n\n${url}`);
  }

  fallbackShare(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() =>
          this.showInApp('success', 'Copied to Clipboard', 'Flag status copied to clipboard.')
        );
    } else {
      this.showInApp('info', 'Share', text, { persistent: true });
    }
  }
}
