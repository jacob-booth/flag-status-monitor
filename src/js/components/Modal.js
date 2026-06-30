/**
 * Modal Base Component
 * @fileoverview Lightweight, accessible dialog primitive shared by Settings
 *   and Flag Etiquette. Handles show/hide animation, focus trapping basics,
 *   backdrop/escape dismissal, and body scroll locking so feature modals
 *   only need to provide their inner markup.
 */
export class Modal {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique element id for the modal root.
   * @param {string} options.title - Modal title text (rendered with an optional icon).
   * @param {string} [options.icon] - Emoji/icon shown before the title.
   * @param {string} options.bodyHTML - Inner HTML for the modal body.
   * @param {string} [options.footerHTML] - Inner HTML for the modal footer.
   * @param {boolean} [options.wide] - Use the wider modal container variant.
   */
  constructor({ id, title, icon = '', bodyHTML, footerHTML = '', wide = false }) {
    this.id = id;
    this.isVisible = false;
    this.element = this.createElement({ title, icon, bodyHTML, footerHTML, wide });
    document.body.appendChild(this.element);
    this.bindBaseEvents();
  }

  createElement({ title, icon, bodyHTML, footerHTML, wide }) {
    const modal = document.createElement('div');
    modal.id = this.id;
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal__backdrop" data-dismiss="true"></div>
      <div class="modal__container ${wide ? 'modal__container--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal__header">
          <h2 id="${this.id}-title" class="modal__title">
            ${icon ? `<span aria-hidden="true">${icon}</span>` : ''}
            ${title}
          </h2>
          <button type="button" class="btn btn--icon btn--ghost" data-dismiss="true" aria-label="Close dialog">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div class="modal__body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal__footer">${footerHTML}</div>` : ''}
      </div>
    `;
    return modal;
  }

  bindBaseEvents() {
    this.element.querySelectorAll('[data-dismiss]').forEach((el) => {
      el.addEventListener('click', () => this.hide());
    });

    this.handleKeydown = (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.handleKeydown);
  }

  get bodyElement() {
    return this.element.querySelector('.modal__body');
  }

  show() {
    this.isVisible = true;
    this.element.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.element.classList.add('modal--show');
    });

    const closeBtn = this.element.querySelector('[data-dismiss]');
    closeBtn?.focus();
  }

  hide() {
    this.isVisible = false;
    this.element.classList.remove('modal--show');
    document.body.style.overflow = '';

    setTimeout(() => {
      if (!this.isVisible) {
        this.element.style.display = 'none';
      }
    }, 250);
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.element.remove();
  }
}
