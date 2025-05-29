/**
 * Main Application Entry Point
 * @fileoverview Initializes the Flag Status Monitor application
 */

import { FlagStatusApp } from './FlagStatusApp.js';

/**
 * Initialize the application when DOM is ready
 */
function initializeApp() {
  try {
    // Create and start the application
    window.flagApp = new FlagStatusApp();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      if (window.flagApp && window.flagApp.notificationSystem) {
        window.flagApp.notificationSystem.showInApp('error', 'Unexpected Error', 'An unexpected error occurred');
      }
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (window.flagApp && window.flagApp.notificationSystem) {
        window.flagApp.notificationSystem.showInApp('error', 'Unexpected Error', 'An unexpected error occurred');
      }
    });

    console.log('🇺🇸 Flag Status Monitor v2.0 initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize Flag Status Monitor:', error);
    
    // Fallback error display
    const errorElement = document.createElement('div');
    errorElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: system-ui, sans-serif;
    `;
    errorElement.textContent = 'Failed to initialize Flag Status Monitor. Please refresh the page.';
    document.body.appendChild(errorElement);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
} 