import { beforeEach, describe, expect, it } from 'vitest';
import { appStorage, storage } from '../storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('round-trips JSON values', () => {
    storage.set('key', { a: 1 });
    expect(storage.get('key')).toEqual({ a: 1 });
  });

  it('returns the default value when the key is missing', () => {
    expect(storage.get('missing', 'fallback')).toBe('fallback');
  });

  it('removes keys', () => {
    storage.set('key', 1);
    storage.remove('key');
    expect(storage.has('key')).toBe(false);
  });
});

describe('appStorage', () => {
  it('defaults theme to auto', () => {
    expect(appStorage.getTheme()).toBe('auto');
  });

  it('removes legacy browser-generated history', () => {
    storage.set('flag-monitor-status-history', [{ status: 'full-staff' }]);
    appStorage.clearLegacyStatusHistory();
    expect(storage.has('flag-monitor-status-history')).toBe(false);
  });

  it('clearAll resets every namespaced key', () => {
    appStorage.setTheme('dark');
    appStorage.clearAll();
    expect(appStorage.getTheme()).toBe('auto');
  });
});
