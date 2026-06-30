/**
 * Flag Etiquette Modal Component
 * @fileoverview Surfaces the official tips from utils/flagInfo.js. Previously
 *   the "Flag Etiquette" quick action had no handler at all — this fixes that
 *   dead button and gives the data a real home in the UI.
 */
import { Modal } from './Modal.js';
import { getFlagEtiquetteTips } from '../utils/flagInfo.js';

export class EtiquetteModal {
  constructor() {
    this.modal = new Modal({
      id: 'etiquette-modal',
      title: 'U.S. Flag Etiquette',
      icon: '📖',
      wide: true,
      bodyHTML: this.renderBody()
    });
  }

  renderBody() {
    const tips = getFlagEtiquetteTips();
    return `
      <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
        Key guidance from the U.S. Flag Code for displaying and handling the flag with respect.
      </p>
      <div class="etiquette-list">
        ${tips
          .map(
            (tip, index) => `
          <div class="etiquette-item">
            <span class="etiquette-item__index" aria-hidden="true">${index + 1}</span>
            <span>${tip}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  show() {
    this.modal.show();
  }

  hide() {
    this.modal.hide();
  }
}
