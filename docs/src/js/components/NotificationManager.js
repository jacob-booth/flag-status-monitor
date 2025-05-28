/**
 * Notification Manager
 * @fileoverview Handles push notifications and in-app notifications
 */

import { NOTIFICATION_TYPES } from '../config/constants.js';
import { appStorage } from '../utils/storage.js';
import { api } from '../utils/api.js';

/**
 * Notification Manager Component
 * Handles all notification functionality
 */
export class NotificationManager {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.subscription = null;
    this.preferences = appStorage.getNotificationPreferences();
    
    this.init();
  }

  /**
   * Initialize notification manager
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return;
    }

    // Register service worker for push notifications
    await this.registerServiceWorker();
    
    // Setup existing subscription if available
    await this.setupExistingSubscription();
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      this.swRegistration = registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup existing push subscription
   */
  async setupExistingSubscription() {
    if (!this.swRegistration) return;

    try {
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      if (this.subscription && this.preferences.enabled) {
        // Verify subscription is still valid with server
        await this.verifySubscription();
      }
    } catch (error) {
      console.error('Failed to get existing subscription:', error);
    }
  }

  /**
   * Request notification permission
   * @returns {Promise<string>} Permission status
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Notifications not supported');
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   * @returns {Promise<boolean>} Success status
   */
  async subscribe() {
    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Create push subscription
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
        )
      });

      // Send subscription to server
      await api.subscribe(this.subscription);

      // Update preferences
      this.preferences.enabled = true;
      appStorage.setNotificationPreferences(this.preferences);

      this.showInAppNotification('Notifications enabled successfully!', 'success');
      return true;

    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      this.showInAppNotification('Failed to enable notifications', 'error');
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }

      // Update preferences
      this.preferences.enabled = false;
      appStorage.setNotificationPreferences(this.preferences);

      this.showInAppNotification('Notifications disabled', 'info');
      return true;

    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
      this.showInAppNotification('Failed to disable notifications', 'error');
      return false;
    }
  }

  /**
   * Verify subscription with server
   */
  async verifySubscription() {
    try {
      // This would typically ping the server to verify the subscription is still valid
      // For now, we'll just check if the subscription object is valid
      if (!this.subscription || this.subscription.expirationTime < Date.now()) {
        await this.unsubscribe();
      }
    } catch (error) {
      console.error('Failed to verify subscription:', error);
    }
  }

  /**
   * Show local notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   */
  showLocalNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/assets/icon-192.png',
      badge: '/assets/badge-72.png',
      tag: 'flag-status',
      renotify: true,
      requireInteraction: false,
      ...options
    };

    try {
      new Notification(title, defaultOptions);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Show in-app notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} duration - Duration in milliseconds
   */
  showInAppNotification(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <span class="notification__icon" aria-hidden="true">${this.getNotificationIcon(type)}</span>
        <span class="notification__message">${message}</span>
        <button class="notification__close" aria-label="Close notification">×</button>
      </div>
    `;

    // Add to container
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Setup close button
    const closeBtn = notification.querySelector('.notification__close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('notification--show');
    });
  }

  /**
   * Remove in-app notification
   * @param {HTMLElement} notification - Notification element
   */
  removeNotification(notification) {
    notification.classList.add('notification--hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Get icon for notification type
   * @param {string} type - Notification type
   * @returns {string} Icon character
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Handle flag status change notification
   * @param {Object} newStatus - New flag status
   * @param {Object} oldStatus - Previous flag status
   */
  handleStatusChange(newStatus, oldStatus) {
    if (!this.preferences.enabled || !this.preferences.statusChanges) {
      return;
    }

    const statusText = newStatus.status === 'half-staff' ? 'Half-Staff' : 'Full-Staff';
    const title = `Flag Status Changed`;
    const body = `Flag is now at ${statusText}${newStatus.reason ? `: ${newStatus.reason}` : ''}`;

    // Show local notification
    this.showLocalNotification(title, {
      body,
      data: {
        type: NOTIFICATION_TYPES.STATUS_CHANGE,
        status: newStatus
      }
    });

    // Show in-app notification
    this.showInAppNotification(body, 'info');
  }

  /**
   * Handle error notification
   * @param {string} message - Error message
   */
  handleError(message) {
    if (!this.preferences.enabled || !this.preferences.errors) {
      return;
    }

    this.showInAppNotification(message, 'error');
  }

  /**
   * Update notification preferences
   * @param {Object} newPreferences - New preferences
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    appStorage.setNotificationPreferences(this.preferences);

    // If notifications were disabled, unsubscribe
    if (!this.preferences.enabled && this.subscription) {
      this.unsubscribe();
    }
  }

  /**
   * Get current notification status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      subscribed: !!this.subscription,
      preferences: this.preferences
    };
  }

  /**
   * Convert VAPID key to Uint8Array
   * @param {string} base64String - Base64 encoded VAPID key
   * @returns {Uint8Array}
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
} 