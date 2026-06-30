/**
 * Settings Modal Component
 * @fileoverview Lets users control theme, notification, and data preferences.
 *   Built on the shared Modal primitive to avoid duplicating dialog chrome.
 */
import { Modal } from './Modal.js';
import { THEMES } from '../config/constants.js';

export class SettingsModal {
  /**
   * @param {Object} options
   * @param {() => {theme: string, notificationsEnabled: boolean, autoRefresh: boolean}} options.getState
   * @param {(theme: string) => void} options.onThemeChange
   * @param {(enabled: boolean) => void} options.onNotificationsChange
   * @param {(enabled: boolean) => void} options.onAutoRefreshChange
   * @param {() => void} options.onClearData
   */
  constructor({
    getState,
    onThemeChange,
    onNotificationsChange,
    onAutoRefreshChange,
    onClearData
  }) {
    this.getState = getState;
    this.onThemeChange = onThemeChange;
    this.onNotificationsChange = onNotificationsChange;
    this.onAutoRefreshChange = onAutoRefreshChange;
    this.onClearData = onClearData;

    this.modal = new Modal({
      id: 'settings-modal',
      title: 'Settings',
      icon: '⚙️',
      bodyHTML: this.renderBody(),
      footerHTML: `
        <button type="button" class="btn btn--secondary" data-action="close">Done</button>
      `
    });

    this.bindEvents();
  }

  renderBody() {
    const state = this.getState();

    return `
      <div class="settings-group">
        <div class="settings-group__title">Appearance</div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">Theme</span>
            <span class="settings-row__hint">Light, dark, or follow your system</span>
          </div>
          <select id="settings-theme" aria-label="Choose theme">
            <option value="${THEMES.LIGHT}" ${state.theme === THEMES.LIGHT ? 'selected' : ''}>Light</option>
            <option value="${THEMES.DARK}" ${state.theme === THEMES.DARK ? 'selected' : ''}>Dark</option>
            <option value="${THEMES.AUTO}" ${state.theme === THEMES.AUTO ? 'selected' : ''}>Auto</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group__title">Updates</div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">Auto-refresh</span>
            <span class="settings-row__hint">Periodically re-check the flag status</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="settings-autorefresh" ${state.autoRefresh ? 'checked' : ''} />
            <span class="switch__track"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">Notifications</span>
            <span class="settings-row__hint">Get notified when the status changes</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="settings-notifications" ${state.notificationsEnabled ? 'checked' : ''} />
            <span class="switch__track"></span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group__title">Data</div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">Local history & preferences</span>
            <span class="settings-row__hint">Clears cached status history and resets settings</span>
          </div>
          <button type="button" class="btn btn--danger btn--sm" id="settings-clear-data">Clear</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const body = this.modal.bodyElement;

    body.querySelector('#settings-theme').addEventListener('change', (event) => {
      this.onThemeChange?.(event.target.value);
    });

    body.querySelector('#settings-autorefresh').addEventListener('change', (event) => {
      this.onAutoRefreshChange?.(event.target.checked);
    });

    body.querySelector('#settings-notifications').addEventListener('change', (event) => {
      this.onNotificationsChange?.(event.target.checked);
    });

    body.querySelector('#settings-clear-data').addEventListener('click', () => {
      this.onClearData?.();
    });

    this.modal.element.querySelector('[data-action="close"]').addEventListener('click', () => {
      this.modal.hide();
    });
  }

  /** Re-render the body to reflect external state changes (e.g. theme toggled via keyboard shortcut). */
  refresh() {
    this.modal.bodyElement.innerHTML = this.renderBody();
    this.bindEvents();
  }

  show() {
    this.refresh();
    this.modal.show();
  }

  hide() {
    this.modal.hide();
  }
}
