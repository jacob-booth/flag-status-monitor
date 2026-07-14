import { api } from '../utils/api.js';
import { calculateHistoryStats, normalizeHistory } from '../utils/history.js';

const escapeHTML = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]
  );

export class HistoryView {
  constructor() {
    this.isVisible = false;
    this.allHistory = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.activeFilter = 'all';
    this.previousFocus = null;
    this.previousBodyOverflow = '';
    this.createHistoryModal();
    this.setupEventListeners();
  }

  createHistoryModal() {
    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.className = 'history-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="history-modal__backdrop" aria-hidden="true"></div>
      <div class="history-modal__container" role="dialog" aria-labelledby="history-title" aria-modal="true">
        <div class="history-modal__header">
          <div>
            <p class="history-modal__eyebrow">Verified federal records only</p>
            <h2 id="history-title" class="history-modal__title">
              <span aria-hidden="true">📊</span>
              Flag Status History
            </h2>
          </div>
          <button class="history-modal__close btn btn--icon btn--ghost" aria-label="Close history">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div class="history-modal__content" tabindex="0">
          <div class="history-stats" aria-label="Verified history summary">
            <div class="history-stats__grid">
              <div class="history-stat">
                <div class="history-stat__value" data-stat="records">–</div>
                <div class="history-stat__label">Verified Records</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" data-stat="ordered-days">–</div>
                <div class="history-stat__label">Ordered Days</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" data-stat="current-run">–</div>
                <div class="history-stat__label">Current Run</div>
              </div>
              <div class="history-stat">
                <div class="history-stat__value" data-stat="last-change">–</div>
                <div class="history-stat__label">Last Change</div>
              </div>
            </div>
          </div>

          <div class="history-timeline">
            <div class="history-timeline__header">
              <div>
                <h3 class="history-timeline__title">Verified Records</h3>
                <p class="history-timeline__description" data-history-coverage>
                  Refreshes never create entries. Loading coverage…
                </p>
              </div>
              <div class="history-timeline__filters" aria-label="Filter history">
                <button class="btn btn--primary btn--sm" data-filter="all" aria-pressed="true">All</button>
                <button class="btn btn--secondary btn--sm" data-filter="half-staff" aria-pressed="false">Half-Staff</button>
                <button class="btn btn--secondary btn--sm" data-filter="full-staff" aria-pressed="false">Full-Staff</button>
              </div>
            </div>

            <div class="history-timeline__content" data-timeline>
              <div class="history-loading">
                <div class="loading-spinner" aria-hidden="true"></div>
                <p>Loading verified history…</p>
              </div>
            </div>
            <div class="history-pagination" data-pagination></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.scrollContainer = modal.querySelector('.history-modal__content');
  }

  setupEventListeners() {
    this.modal.querySelector('.history-modal__close').addEventListener('click', () => this.hide());
    this.modal
      .querySelector('.history-modal__backdrop')
      .addEventListener('click', () => this.hide());

    this.modal.querySelector('.history-timeline__filters').addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      this.activeFilter = button.dataset.filter;
      this.currentPage = 1;
      this.modal.querySelectorAll('[data-filter]').forEach((filterButton) => {
        const active = filterButton === button;
        filterButton.classList.toggle('btn--primary', active);
        filterButton.classList.toggle('btn--secondary', !active);
        filterButton.setAttribute('aria-pressed', String(active));
      });
      this.renderPage();
    });

    this.modal.querySelector('[data-pagination]').addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button) return;
      this.currentPage = Number(button.dataset.page);
      this.renderPage();
      this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    this.handleKeydown = (event) => {
      if (!this.isVisible) return;
      if (event.key === 'Escape') {
        this.hide();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [
        ...this.modal.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', this.handleKeydown);
  }

  async show() {
    this.isVisible = true;
    this.previousFocus = document.activeElement;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.modal.style.display = 'flex';
    this.modal.setAttribute('aria-hidden', 'false');
    this.scrollContainer.scrollTop = 0;
    requestAnimationFrame(() => this.modal.classList.add('history-modal--show'));
    this.modal.querySelector('.history-modal__close').focus();
    await this.loadHistory();
  }

  hide() {
    this.isVisible = false;
    this.modal.classList.remove('history-modal--show');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = this.previousBodyOverflow;
    setTimeout(() => {
      if (!this.isVisible) this.modal.style.display = 'none';
    }, 250);
    this.previousFocus?.focus?.();
  }

  async loadHistory() {
    const timeline = this.modal.querySelector('[data-timeline]');
    timeline.innerHTML = `
      <div class="history-loading">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading verified history…</p>
      </div>
    `;

    try {
      const response = await api.getHistory();
      this.allHistory = normalizeHistory(response.history);
      const oldest = this.allHistory.at(-1);
      this.modal.querySelector('[data-history-coverage]').textContent = oldest
        ? `Refreshes never create entries. Verified coverage begins ${this.formatDate(oldest.date, false)}.`
        : 'No verified history records have been published yet.';
      this.currentPage = 1;
      this.updateStats();
      this.renderPage();
    } catch (error) {
      console.error('Failed to load verified history:', error);
      this.showError('The verified history dataset could not be loaded.');
    }
  }

  get filteredHistory() {
    if (this.activeFilter === 'all') return this.allHistory;
    return this.allHistory.filter((entry) => entry.status === this.activeFilter);
  }

  updateStats() {
    const stats = calculateHistoryStats(this.allHistory);
    this.modal.querySelector('[data-stat="records"]').textContent = stats.verifiedRecords;
    this.modal.querySelector('[data-stat="ordered-days"]').textContent = stats.orderedDays;
    this.modal.querySelector('[data-stat="current-run"]').textContent =
      stats.currentRunDays === 0
        ? 'Today'
        : `${stats.currentRunDays} day${stats.currentRunDays === 1 ? '' : 's'}`;
    this.modal.querySelector('[data-stat="last-change"]').textContent = stats.lastChangeDate
      ? this.formatRelativeDate(stats.lastChangeDate)
      : 'No data';
  }

  renderPage() {
    const filtered = this.filteredHistory;
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.itemsPerPage));
    this.currentPage = Math.min(this.currentPage, totalPages);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.renderTimeline(filtered.slice(start, start + this.itemsPerPage));
    this.renderPagination(filtered.length);
  }

  renderTimeline(entries) {
    const container = this.modal.querySelector('[data-timeline]');
    if (!entries.length) {
      container.innerHTML = `
        <div class="history-empty">
          <span class="history-empty__icon" aria-hidden="true">📭</span>
          <h3 class="history-empty__title">No matching verified records</h3>
          <p class="history-empty__text">Try another filter.</p>
        </div>
      `;
      return;
    }

    const timelineHTML = entries
      .map((entry) => {
        const halfStaff = entry.status === 'half-staff';
        const source = escapeHTML(entry.source || 'Published status data');
        const sourceMarkup = entry.source_url
          ? `<a href="${escapeHTML(entry.source_url)}" target="_blank" rel="noopener noreferrer">${source}</a>`
          : source;
        const endMarkup =
          entry.end_label || entry.ends
            ? `<div class="timeline-item__duration">
              <span aria-hidden="true">🕒</span>
              ${escapeHTML(entry.end_label || `Through ${this.formatDate(entry.ends, false)}`)}
            </div>`
            : '';

        return `
          <article class="timeline-item timeline-item--${entry.status}">
            <div class="timeline-item__marker">
              <span class="timeline-item__icon" aria-hidden="true">${halfStaff ? '⬇️' : '⬆️'}</span>
            </div>
            <div class="timeline-item__content">
              <div class="timeline-item__header">
                <h4 class="timeline-item__title">Flag ${halfStaff ? 'Half-Staff' : 'Full-Staff'}</h4>
                <time class="timeline-item__date" datetime="${escapeHTML(entry.date)}">
                  ${escapeHTML(this.formatDate(entry.date))}
                </time>
              </div>
              ${entry.reason ? `<p class="timeline-item__reason">${escapeHTML(entry.reason)}</p>` : ''}
              <div class="timeline-item__meta"><span>Verified source:</span> ${sourceMarkup}</div>
              ${endMarkup}
            </div>
          </article>
        `;
      })
      .join('');

    container.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
  }

  renderPagination(total) {
    const container = this.modal.querySelector('[data-pagination]');
    const totalPages = Math.ceil(total / this.itemsPerPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    container.innerHTML = `
      <nav class="pagination" aria-label="History pages">
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        ${pages
          .map(
            (page) =>
              `<button class="btn ${page === this.currentPage ? 'btn--primary' : 'btn--secondary'} btn--sm" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`
          )
          .join('')}
        <button class="btn btn--secondary btn--sm" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>Next →</button>
      </nav>
    `;
  }

  formatDate(value, includeTime = true) {
    try {
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        ...(includeTime && !dateOnly ? { timeStyle: 'short' } : {})
      }).format(date);
    } catch {
      return value;
    }
  }

  formatRelativeDate(value) {
    const date = new Date(value);
    const days = Math.max(0, Math.floor((Date.now() - date) / 86400000));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return this.formatDate(value, false);
  }

  showError(message) {
    const container = this.modal.querySelector('[data-timeline]');
    container.innerHTML = `
      <div class="history-error">
        <span class="history-error__icon" aria-hidden="true">⚠️</span>
        <h3 class="history-error__title">Unable to Load History</h3>
        <p class="history-error__text">${escapeHTML(message)}</p>
        <button class="btn btn--primary" data-history-retry>Try Again</button>
      </div>
    `;
    container
      .querySelector('[data-history-retry]')
      .addEventListener('click', () => this.loadHistory());
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.modal.remove();
  }
}
