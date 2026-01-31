/**
 * History View Component
 * @fileoverview Beautiful history view with timeline and charts
 */

import { api } from '../utils/api.js';
import { appStorage } from '../utils/storage.js';

export class HistoryView {
  constructor() {
    this.isVisible = false;
    this.historyData = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.init();
  }

  /**
   * Initialize the history view
   */
  init() {
    this.createHistoryModal();
    this.setupEventListeners();
  }

  /**
   * Create the history modal structure
   */
  createHistoryModal() {
    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.className = 'history-modal';
    modal.innerHTML = `
      <div class="history-modal__backdrop" aria-hidden="true"></div>
      <div class="history-modal__container" role="dialog" aria-labelledby="history-title" aria-modal="true">
        <div class="history-modal__header">
          <h2 id="history-title" class="history-modal__title">
            <span aria-hidden="true">📊</span>
            Flag Status History
          </h2>
          <button class="history-modal__close btn btn--icon btn--ghost" aria-label="Close history">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        
        <div class="history-modal__content">
          <!-- Stats Overview -->
          <div class="history-stats">
            <div class="history-stats__grid">
              <div class="history-stat">
                <div class="history-stat__value" id="total-changes">-</div>
                <div class="history-stat__label">Total Changes</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" id="half-staff-days">-</div>
                <div class="history-stat__label">Half-Staff Days</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" id="current-streak">-</div>
                <div class="history-stat__label">Current Streak</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" id="last-change">-</div>
                <div class="history-stat__label">Last Change</div>
              </div>
            </div>
          </div>

          <!-- Timeline View -->
          <div class="history-timeline">
            <div class="history-timeline__header">
              <h3 class="history-timeline__title">Recent Changes</h3>
              <div class="history-timeline__filters">
                <button class="btn btn--secondary btn--sm" data-filter="all">All</button>
                <button class="btn btn--secondary btn--sm" data-filter="half-staff">Half-Staff</button>
                <button class="btn btn--secondary btn--sm" data-filter="full-staff">Full-Staff</button>
              </div>
            </div>
            
            <div class="history-timeline__content" id="timeline-content">
              <div class="history-loading">
                <div class="loading-spinner"></div>
                <p>Loading history...</p>
              </div>
            </div>
            
            <div class="history-pagination" id="history-pagination">
              <!-- Pagination will be inserted here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close modal events
    const closeBtn = this.modal.querySelector('.history-modal__close');
    const backdrop = this.modal.querySelector('.history-modal__backdrop');
    
    closeBtn.addEventListener('click', () => this.hide());
    backdrop.addEventListener('click', () => this.hide());
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Filter buttons
    const filterBtns = this.modal.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.applyFilter(filter);
        
        // Update active state
        filterBtns.forEach(b => b.classList.remove('btn--primary'));
        e.target.classList.add('btn--primary');
      });
    });
  }

  /**
   * Show the history modal
   */
  async show() {
    this.isVisible = true;
    this.modal.style.display = 'flex';
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal.classList.add('history-modal--show');
    });

    // Load history data
    await this.loadHistory();
    
    // Focus management for accessibility
    const firstFocusable = this.modal.querySelector('.history-modal__close');
    firstFocusable.focus();
  }

  /**
   * Hide the history modal
   */
  hide() {
    this.isVisible = false;
    this.modal.classList.remove('history-modal--show');
    
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  /**
   * Load history data from API
   */
  async loadHistory() {
    try {
      const localHistory = appStorage.getStatusHistory();
      if (localHistory && localHistory.length) {
        const total = localHistory.length;
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = localHistory.slice(start, start + this.itemsPerPage);

        this.historyData = pageItems;
        this.updateStats({ history: localHistory });
        this.renderTimeline();
        this.renderPagination({ total });
        return;
      }

      const response = await api.getHistory({
        page: this.currentPage,
        per_page: this.itemsPerPage
      });
      
      this.historyData = response.history || [];
      this.updateStats(response);
      this.renderTimeline();
      this.renderPagination(response);
      
    } catch (error) {
      console.error('Failed to load history:', error);
      this.showError('Failed to load history data');
    }
  }

  /**
   * Update statistics display
   */
  updateStats(data) {
    const stats = this.calculateStats(data.history || []);
    
    document.getElementById('total-changes').textContent = stats.totalChanges;
    document.getElementById('half-staff-days').textContent = stats.halfStaffDays;
    document.getElementById('current-streak').textContent = stats.currentStreak;
    document.getElementById('last-change').textContent = stats.lastChange;
  }

  /**
   * Calculate statistics from history data
   */
  calculateStats(history) {
    const totalChanges = history.length;
    const halfStaffDays = history.filter(h => h.status === 'half-staff').length;
    
    // Calculate current streak
    let currentStreak = 0;
    if (history.length > 0) {
      const currentStatus = history[0].status;
      for (const entry of history) {
        if (entry.status === currentStatus) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Last change date
    const lastChange = history.length > 0 
      ? this.formatRelativeDate(history[0].date)
      : 'No data';

    return {
      totalChanges,
      halfStaffDays,
      currentStreak: `${currentStreak} days`,
      lastChange
    };
  }

  /**
   * Render the timeline
   */
  renderTimeline() {
    const container = document.getElementById('timeline-content');
    
    if (this.historyData.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <span class="history-empty__icon" aria-hidden="true">📭</span>
          <h3 class="history-empty__title">No History Available</h3>
          <p class="history-empty__text">Flag status history will appear here once data is available.</p>
        </div>
      `;
      return;
    }

    const timelineHTML = this.historyData.map((entry, index) => {
      const isHalfStaff = entry.status === 'half-staff';
      const statusIcon = isHalfStaff ? '🇺🇸' : '🇺🇸';
      const statusText = isHalfStaff ? 'Half-Staff' : 'Full-Staff';
      const statusClass = isHalfStaff ? 'half-staff' : 'full-staff';
      
      return `
        <div class="timeline-item timeline-item--${statusClass}" data-status="${entry.status}">
          <div class="timeline-item__marker">
            <span class="timeline-item__icon" aria-hidden="true">${statusIcon}</span>
          </div>
          <div class="timeline-item__content">
            <div class="timeline-item__header">
              <h4 class="timeline-item__title">Flag ${statusText}</h4>
              <time class="timeline-item__date" datetime="${entry.date}">
                ${this.formatDate(entry.date)}
              </time>
            </div>
            ${entry.reason ? `
              <p class="timeline-item__reason">${entry.reason}</p>
            ` : ''}
            ${entry.duration ? `
              <div class="timeline-item__duration">
                <span aria-hidden="true">⏱️</span>
                Duration: ${entry.duration}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
  }

  /**
   * Render pagination
   */
  renderPagination(data) {
    const container = document.getElementById('history-pagination');
    const totalPages = Math.ceil((data.total || 0) / this.itemsPerPage);
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage - 1}">
          <span aria-hidden="true">←</span> Previous
        </button>
      `;
    }

    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      const isActive = i === this.currentPage;
      paginationHTML += `
        <button class="btn ${isActive ? 'btn--primary' : 'btn--secondary'} btn--sm" 
                data-page="${i}" ${isActive ? 'aria-current="page"' : ''}>
          ${i}
        </button>
      `;
    }

    // Next button
    if (this.currentPage < totalPages) {
      paginationHTML += `
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage + 1}">
          Next <span aria-hidden="true">→</span>
        </button>
      `;
    }

    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;

    // Add pagination event listeners
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPage = parseInt(e.target.dataset.page);
        this.loadHistory();
      });
    });
  }

  /**
   * Apply filter to timeline
   */
  applyFilter(filter) {
    const items = this.modal.querySelectorAll('.timeline-item');
    
    items.forEach(item => {
      const status = item.dataset.status;
      const shouldShow = filter === 'all' || status === filter;
      
      item.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Format relative date
   */
  formatRelativeDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('timeline-content');
    container.innerHTML = `
      <div class="history-error">
        <span class="history-error__icon" aria-hidden="true">⚠️</span>
        <h3 class="history-error__title">Unable to Load History</h3>
        <p class="history-error__text">${message}</p>
        <button class="btn btn--primary" onclick="this.loadHistory()">
          <span aria-hidden="true">🔄</span>
          Try Again
        </button>
      </div>
    `;
  }
} 