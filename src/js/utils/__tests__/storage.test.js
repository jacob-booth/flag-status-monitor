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

  it('persists status history capped at 200 entries, newest first', () => {
    for (let i = 0; i < 5; i++) {
      appStorage.addStatusHistory({
        status: 'full-staff',
        last_updated: `2025-01-0${i + 1}T00:00:00Z`
      });
    }
    const history = appStorage.getStatusHistory();
    expect(history).toHaveLength(5);
    expect(history[0].date).toBe('2025-01-05T00:00:00Z');
  });

  it('clearAll resets every namespaced key', () => {
    appStorage.setTheme('dark');
    appStorage.clearAll();
    expect(appStorage.getTheme()).toBe('auto');
  });
});
