/**
 * Notification System
 * @fileoverview Modern notification system with push notifications and in-app alerts
 */

import { appStorage } from '../utils/storage.js';

export class NotificationSystem {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.notifications = [];
    this.maxNotifications = 5;
    this.init();
  }

  /**
   * Initialize the notification system
   */
  async init() {
    this.createNotificationContainer();
    this.loadPreferences();
    
    if (this.isSupported) {
      await this.registerServiceWorker();
      this.setupPushNotifications();
    }
    
    this.setupEventListeners();
  }

  /**
   * Create notification container in DOM
   */
  createNotificationContainer() {
    if (document.getElementById('notification-container')) return;
    
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    
    document.body.appendChild(container);
    this.container = container;
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        console.log('Service Worker registered successfully');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup push notifications
   */
  async setupPushNotifications() {
    if (!this.swRegistration) return;

    try {
      // Check if push messaging is supported
      if ('PushManager' in window) {
        const subscription = await this.swRegistration.pushManager.getSubscription();
        if (subscription) {
          this.pushSubscription = subscription;
        }
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported) {
      this.showInApp('error', 'Notifications not supported', 'Your browser doesn\'t support notifications.');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        this.showInApp('success', 'Notifications Enabled', 'You\'ll now receive flag status updates!');
        this.savePreferences();
        return true;
      } else {
        this.showInApp('warning', 'Notifications Blocked', 'Enable notifications in your browser settings to receive updates.');
        return false;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      this.showInApp('error', 'Permission Error', 'Failed to request notification permission.');
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    if (!this.swRegistration || !('PushManager' in window)) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.getVapidPublicKey())
      });

      this.pushSubscription = subscription;
      
      // Send subscription to server (if you have a backend)
      await this.sendSubscriptionToServer(subscription);
      
      this.showInApp('success', 'Push Notifications Active', 'You\'ll receive updates even when the app is closed!');
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      this.showInApp('error', 'Push Setup Failed', 'Could not set up push notifications.');
      return false;
    }
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return this.showInApp('info', title, options.body || '');
    }

    const defaultOptions = {
      icon: '/assets/icon-192x192.svg',
      badge: '/assets/favicon-32x32.svg',
      tag: 'flag-status',
      renotify: true,
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) options.onClick();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      return notification;
    } catch (error) {
      console.error('Browser notification failed:', error);
      return this.showInApp('info', title, options.body || '');
    }
  }

  /**
   * Show in-app notification
   */
  showInApp(type = 'info', title, message, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      timestamp: new Date(),
      duration: options.duration || this.getDefaultDuration(type),
      actions: options.actions || [],
      persistent: options.persistent || false
    };

    this.notifications.unshift(notification);
    
    // Limit number of notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.renderNotification(notification);
    
    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }

    return notification;
  }

  /**
   * Render notification in DOM
   */
  renderNotification(notification) {
    const element = document.createElement('div');
    element.className = `notification notification--${notification.type}`;
    element.setAttribute('data-id', notification.id);
    element.setAttribute('role', 'alert');
    
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      flag: '🇺🇸'
    };

    element.innerHTML = `
      <div class="notification__content">
        <div class="notification__header">
          <span class="notification__icon" aria-hidden="true">${iconMap[notification.type] || iconMap.info}</span>
          <h4 class="notification__title">${notification.title}</h4>
          <button class="notification__close btn btn--icon btn--ghost" aria-label="Close notification">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        ${notification.message ? `
          <p class="notification__message">${notification.message}</p>
        ` : ''}
        ${notification.actions.length > 0 ? `
          <div class="notification__actions">
            ${notification.actions.map(action => `
              <button class="btn btn--sm btn--${action.style || 'secondary'}" data-action="${action.id}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
        <div class="notification__progress"></div>
      </div>
    `;

    // Add event listeners
    const closeBtn = element.querySelector('.notification__close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification.id);
    });

    // Action buttons
    const actionBtns = element.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionId = e.target.dataset.action;
        const action = notification.actions.find(a => a.id === actionId);
        if (action && action.handler) {
          action.handler();
        }
        if (!action.keepOpen) {
          this.removeNotification(notification.id);
        }
      });
    });

    // Animate progress bar for timed notifications
    if (!notification.persistent && notification.duration > 0) {
      const progressBar = element.querySelector('.notification__progress');
      progressBar.style.animationDuration = `${notification.duration}ms`;
      progressBar.classList.add('notification__progress--active');
    }

    // Add to container with animation
    this.container.appendChild(element);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      element.classList.add('notification--show');
    });
  }

  /**
   * Remove notification
   */
  removeNotification(id) {
    const element = this.container.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('notification--hide');
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 300);
    }

    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach(notification => {
      this.removeNotification(notification.id);
    });
  }

  /**
   * Show flag status change notification
   */
  showFlagStatusChange(status, reason = '') {
    const isHalfStaff = status === 'half-staff';
    const title = `Flag ${isHalfStaff ? 'Lowered to Half-Staff' : 'Raised to Full-Staff'}`;
    const message = reason || `The U.S. flag is now flying at ${status}.`;
    
    const browserOptions = {
      body: message,
      icon: '/assets/icon-192x192.svg',
      tag: 'flag-status-change',
      data: { status, reason },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/assets/icon-72x72.svg'
        }
      ]
    };

    // Show browser notification
    this.showBrowserNotification(title, browserOptions);

    // Show in-app notification with actions
    this.showInApp('flag', title, message, {
      duration: 8000,
      actions: [
        {
          id: 'view-history',
          label: 'View History',
          style: 'primary',
          handler: () => {
            // Trigger history view
            window.dispatchEvent(new CustomEvent('show-history'));
          }
        },
        {
          id: 'share',
          label: 'Share',
          style: 'secondary',
          handler: () => {
            this.shareStatus(status, reason);
          }
        }
      ]
    });
  }

  /**
   * Share flag status
   */
  async shareStatus(status, reason = '') {
    const text = `The U.S. flag is currently at ${status}. ${reason}`.trim();
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'U.S. Flag Status',
          text,
          url
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.fallbackShare(text, url);
        }
      }
    } else {
      this.fallbackShare(text, url);
    }
  }

  /**
   * Fallback share method
   */
  fallbackShare(text, url) {
    const shareText = `${text}\n\n${url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showInApp('success', 'Copied to Clipboard', 'Flag status copied to clipboard!');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showInApp('success', 'Copied to Clipboard', 'Flag status copied to clipboard!');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for visibility change to show missed notifications
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.hasMissedNotifications()) {
        this.showMissedNotifications();
      }
    });

    // Listen for custom events
    window.addEventListener('flag-status-changed', (event) => {
      this.showFlagStatusChange(event.detail.status, event.detail.reason);
    });
  }

  /**
   * Get default duration based on notification type
   */
  getDefaultDuration(type) {
    const durations = {
      error: 8000,
      warning: 6000,
      success: 4000,
      info: 5000,
      flag: 8000
    };
    return durations[type] || 5000;
  }

  /**
   * Load user preferences
   */
  loadPreferences() {
    this.preferences = appStorage.get('notification-preferences', {
      browser: true,
      push: true,
      sound: true,
      flagChanges: true,
      maintenance: false
    });
  }

  /**
   * Save user preferences
   */
  savePreferences() {
    appStorage.set('notification-preferences', this.preferences);
  }

  /**
   * Update preferences
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
  }

  /**
   * Check if user has missed notifications
   */
  hasMissedNotifications() {
    const lastSeen = appStorage.get('last-seen', 0);
    const lastUpdate = appStorage.get('last-flag-update', 0);
    return lastUpdate > lastSeen;
  }

  /**
   * Show missed notifications summary
   */
  showMissedNotifications() {
    const missedCount = this.getMissedNotificationCount();
    if (missedCount > 0) {
      this.showInApp('info', 'Welcome Back!', `You missed ${missedCount} flag status update${missedCount > 1 ? 's' : ''}.`, {
        actions: [
          {
            id: 'view-history',
            label: 'View History',
            style: 'primary',
            handler: () => {
              window.dispatchEvent(new CustomEvent('show-history'));
            }
          }
        ]
      });
    }
    
    appStorage.set('last-seen', Date.now());
  }

  /**
   * Get missed notification count
   */
  getMissedNotificationCount() {
    // This would typically come from your API
    return Math.floor(Math.random() * 3); // Mock data
  }

  /**
   * Utility: Convert VAPID key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get VAPID public key (replace with your actual key)
   */
  getVapidPublicKey() {
    // Replace with your actual VAPID public key
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f53NlqKOYWXvTBHBxbndzsxI-ENcxEJSfVd7c0_TJPe7-ZlMV';
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    // This would send the subscription to your backend
    console.log('Push subscription:', subscription);
    // Example:
    // await fetch('/api/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });
  }
} 