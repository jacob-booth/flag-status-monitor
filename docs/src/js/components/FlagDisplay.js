/**
 * Flag Display Component
 * @fileoverview Modern flag display with animations and accessibility
 */

import { ANIMATION_CONFIG, CSS_CLASSES, FLAG_POSITIONS, ARIA_LABELS } from '../config/constants.js';

/**
 * Flag Display Component
 * Handles flag rendering, animations, and accessibility
 */
export class FlagDisplay {
  /**
   * @param {HTMLElement} container - Container element for the flag
   */
  constructor(container) {
    this.container = container;
    this.flagElement = null;
    this.currentStatus = null;
    this.isAnimating = false;
    this.animationQueue = [];
    
    this.init();
  }

  /**
   * Initialize the flag display
   */
  init() {
    this.createFlagStructure();
    this.setupAccessibility();
    this.setupEventListeners();
  }

  /**
   * Create the flag HTML structure
   */
  createFlagStructure() {
    this.container.innerHTML = `
      <div class="flag-container" role="img" aria-label="${ARIA_LABELS.FLAG}">
        <div class="pole" aria-hidden="true"></div>
        <div class="flag" id="flag" aria-describedby="flag-status">
          <div class="stripes" aria-hidden="true">
            ${Array.from({ length: 13 }, () => '<div class="stripe"></div>').join('')}
          </div>
          <div class="union" aria-hidden="true">
            <div class="stars" aria-hidden="true">
              ${this.createStars()}
            </div>
          </div>
        </div>
        <div class="flag-shadow" aria-hidden="true"></div>
      </div>
    `;
    
    this.flagElement = this.container.querySelector('.flag');
  }

  /**
   * Create stars for the flag union
   * @returns {string} HTML for stars
   */
  createStars() {
    const stars = [];
    
    // 50 stars arranged in 9 rows (alternating 6 and 5 stars)
    // Rows 1, 3, 5, 7, 9: 6 stars each
    // Rows 2, 4, 6, 8: 5 stars each
    const starRows = [
      { count: 6, offset: 0 },    // Row 1
      { count: 5, offset: 0.5 },  // Row 2 (offset for staggered pattern)
      { count: 6, offset: 0 },    // Row 3
      { count: 5, offset: 0.5 },  // Row 4
      { count: 6, offset: 0 },    // Row 5
      { count: 5, offset: 0.5 },  // Row 6
      { count: 6, offset: 0 },    // Row 7
      { count: 5, offset: 0.5 },  // Row 8
      { count: 6, offset: 0 }     // Row 9
    ];
    
    starRows.forEach((row, rowIndex) => {
      for (let i = 0; i < row.count; i++) {
        const left = ((i + row.offset) * (100 / 6)) + (100 / 12); // Center the stars
        const top = (rowIndex * (100 / 9)) + (100 / 18); // Distribute vertically
        
        stars.push(`
          <div class="star" style="
            position: absolute;
            left: ${left}%;
            top: ${top}%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 0.4rem;
            line-height: 1;
            text-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
          " aria-hidden="true">★</div>
        `);
      }
    });
    
    return stars.join('');
  }

  /**
   * Setup accessibility attributes
   */
  setupAccessibility() {
    const flagContainer = this.container.querySelector('.flag-container');
    flagContainer.setAttribute('tabindex', '0');
    flagContainer.setAttribute('role', 'img');
    
    // Add live region for status announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('class', 'sr-only');
    liveRegion.setAttribute('id', 'flag-status-live');
    this.container.appendChild(liveRegion);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Animation end handler
    this.flagElement.addEventListener('transitionend', (e) => {
      if (e.target === this.flagElement && e.propertyName === 'top') {
        this.isAnimating = false;
        this.processAnimationQueue();
      }
    });

    // Keyboard navigation
    const flagContainer = this.container.querySelector('.flag-container');
    flagContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.announceStatus();
      }
    });

    // Reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', () => {
      this.updateAnimationPreferences();
    });
  }

  /**
   * Update flag status with animation
   * @param {Object} status - Flag status data
   * @param {boolean} animate - Whether to animate the change
   */
  async updateStatus(status, animate = true) {
    if (this.isAnimating) {
      this.animationQueue.push({ status, animate });
      return;
    }

    const previousStatus = this.currentStatus;
    this.currentStatus = status;

    // Update accessibility
    this.updateAccessibility(status);

    // Animate flag position if status changed
    if (previousStatus && previousStatus.status !== status.status && animate) {
      await this.animateStatusChange(status);
    } else {
      this.setFlagPosition(status.status);
    }

    // Announce status change to screen readers
    if (previousStatus && previousStatus.status !== status.status) {
      this.announceStatusChange(status);
    }
  }

  /**
   * Animate flag status change
   * @param {Object} status - New flag status
   */
  async animateStatusChange(status) {
    this.isAnimating = true;
    
    // Add transition class
    this.flagElement.classList.add('transitioning');
    
    // Set transition duration based on user preferences
    const duration = this.getAnimationDuration();
    this.flagElement.style.transition = `top ${duration}ms ease-in-out`;
    
    // Update position
    this.setFlagPosition(status.status);
    
    // Wait for animation to complete
    return new Promise((resolve) => {
      setTimeout(() => {
        this.flagElement.classList.remove('transitioning');
        this.flagElement.style.transition = '';
        this.isAnimating = false;
        resolve();
      }, duration);
    });
  }

  /**
   * Set flag position without animation
   * @param {string} status - Flag status
   */
  setFlagPosition(status) {
    if (status === FLAG_POSITIONS.HALF_STAFF) {
      this.flagElement.classList.add(CSS_CLASSES.HALF_STAFF);
    } else {
      this.flagElement.classList.remove(CSS_CLASSES.HALF_STAFF);
    }
  }

  /**
   * Process queued animations
   */
  processAnimationQueue() {
    if (this.animationQueue.length > 0) {
      const { status, animate } = this.animationQueue.shift();
      this.updateStatus(status, animate);
    }
  }

  /**
   * Update accessibility attributes
   * @param {Object} status - Flag status data
   */
  updateAccessibility(status) {
    const flagContainer = this.container.querySelector('.flag-container');
    const statusText = status.status === FLAG_POSITIONS.HALF_STAFF ? 'Half-Staff' : 'Full-Staff';
    
    flagContainer.setAttribute('aria-label', 
      `${ARIA_LABELS.FLAG} - Currently at ${statusText}. ${status.reason || ''}`
    );
  }

  /**
   * Announce status to screen readers
   */
  announceStatus() {
    if (!this.currentStatus) return;
    
    const liveRegion = document.getElementById('flag-status-live');
    const statusText = this.currentStatus.status === FLAG_POSITIONS.HALF_STAFF ? 'Half-Staff' : 'Full-Staff';
    
    liveRegion.textContent = `Flag is currently at ${statusText}. ${this.currentStatus.reason || ''}`;
  }

  /**
   * Announce status change to screen readers
   * @param {Object} status - New flag status
   */
  announceStatusChange(status) {
    const liveRegion = document.getElementById('flag-status-live');
    const statusText = status.status === FLAG_POSITIONS.HALF_STAFF ? 'Half-Staff' : 'Full-Staff';
    
    liveRegion.textContent = `Flag status changed to ${statusText}. ${status.reason || ''}`;
  }

  /**
   * Get animation duration based on user preferences
   * @returns {number} Duration in milliseconds
   */
  getAnimationDuration() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return prefersReducedMotion ? 0 : ANIMATION_CONFIG.FLAG_TRANSITION;
  }

  /**
   * Update animation preferences
   */
  updateAnimationPreferences() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      this.flagElement.style.animation = 'none';
    } else {
      this.flagElement.style.animation = '';
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.flagElement.classList.add(CSS_CLASSES.LOADING);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.flagElement.classList.remove(CSS_CLASSES.LOADING);
  }

  /**
   * Show error state
   */
  showError() {
    this.flagElement.classList.add(CSS_CLASSES.ERROR);
  }

  /**
   * Hide error state
   */
  hideError() {
    this.flagElement.classList.remove(CSS_CLASSES.ERROR);
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.flagElement) {
      this.flagElement.removeEventListener('transitionend', this.handleTransitionEnd);
    }
    
    this.animationQueue = [];
    this.currentStatus = null;
    this.isAnimating = false;
  }
} 