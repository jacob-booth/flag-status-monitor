/**
 * History View Component
 * @fileoverview Lightweight history modal using local status history
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

  init() {
    this.createHistoryModal();
    this.setupEventListeners();
  }

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
          <div class="history-timeline__content" id="timeline-content">
            <div class="history-loading">
              <div class="loading-spinner"></div>
              <p>Loading history...</p>
            </div>
          </div>
          <div class="history-pagination" id="history-pagination"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  setupEventListeners() {
    const closeBtn = this.modal.querySelector('.history-modal__close');
    const backdrop = this.modal.querySelector('.history-modal__backdrop');

    closeBtn.addEventListener('click', () => this.hide());
    backdrop.addEventListener('click', () => this.hide());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  async show() {
    this.isVisible = true;
    this.modal.style.display = 'flex';
    requestAnimationFrame(() => {
      this.modal.classList.add('history-modal--show');
    });
    await this.loadHistory();

    const firstFocusable = this.modal.querySelector('.history-modal__close');
    firstFocusable.focus();
  }

  hide() {
    this.isVisible = false;
    this.modal.classList.remove('history-modal--show');
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  async loadHistory() {
    try {
      const localHistory = appStorage.getStatusHistory();
      if (localHistory && localHistory.length) {
        const total = localHistory.length;
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = localHistory.slice(start, start + this.itemsPerPage);

        this.historyData = pageItems;
        this.renderTimeline();
        this.renderPagination({ total });
        return;
      }

      const response = await api.getHistory({
        page: this.currentPage,
        per_page: this.itemsPerPage
      });

      this.historyData = response.history || [];
      this.renderTimeline();
      this.renderPagination(response);
    } catch (error) {
      console.error('Failed to load history:', error);
      this.showError('Failed to load history data');
    }
  }

  renderTimeline() {
    const container = document.getElementById('timeline-content');

    if (!this.historyData.length) {
      container.innerHTML = `
        <div class="history-empty">
          <span class="history-empty__icon" aria-hidden="true">📭</span>
          <h3 class="history-empty__title">No History Available</h3>
          <p class="history-empty__text">Flag status history will appear here once data is available.</p>
        </div>
      `;
      return;
    }

    const timelineHTML = this.historyData.map((entry) => {
      const isHalfStaff = entry.status === 'half-staff';
      const statusText = isHalfStaff ? 'Half-Staff' : 'Full-Staff';
      const statusClass = isHalfStaff ? 'half-staff' : 'full-staff';

      return `
        <div class="timeline-item timeline-item--${statusClass}" data-status="${entry.status}">
          <div class="timeline-item__content">
            <div class="timeline-item__header">
              <h4 class="timeline-item__title">Flag ${statusText}</h4>
              <time class="timeline-item__date" datetime="${entry.date}">
                ${this.formatDate(entry.date)}
              </time>
            </div>
            ${entry.reason ? `<p class="timeline-item__reason">${entry.reason}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
  }

  renderPagination(data) {
    const container = document.getElementById('history-pagination');
    const totalPages = Math.ceil((data.total || 0) / this.itemsPerPage);

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = '<div class="pagination">';

    if (this.currentPage > 1) {
      paginationHTML += `
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage - 1}">
          <span aria-hidden="true">←</span> Previous
        </button>
      `;
    }

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      const isActive = i === this.currentPage;
      paginationHTML += `
        <button class="btn ${isActive ? 'btn--primary' : 'btn--secondary'} btn--sm" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (this.currentPage < totalPages) {
      paginationHTML += `
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage + 1}">
          Next <span aria-hidden="true">→</span>
        </button>
      `;
    }

    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;

    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPage = parseInt(e.target.dataset.page, 10);
        this.loadHistory();
      });
    });
  }

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

  showError(message) {
    const container = document.getElementById('timeline-content');
    container.innerHTML = `
      <div class="history-error">
        <span class="history-error__icon" aria-hidden="true">⚠️</span>
        <h3 class="history-error__title">Unable to Load History</h3>
        <p class="history-error__text">${message}</p>
      </div>
    `;
  }
}
