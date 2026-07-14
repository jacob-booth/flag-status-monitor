import { describe, expect, it } from 'vitest';
import { calculateHistoryStats, normalizeHistory, orderedCalendarDays } from '../history.js';

const verifiedHistory = [
  {
    id: 'lindsey-graham-2026',
    date: '2026-07-12T18:11:50Z',
    ends: '2026-07-18T22:00:00Z',
    status: 'half-staff',
    reason: 'Honoring Senator Lindsey Graham',
    source: 'The White House'
  },
  {
    id: 'charlie-kirk-2025',
    date: '2025-09-10',
    ends: '2025-09-14',
    status: 'half-staff',
    reason: 'Honoring Charlie Kirk',
    source: 'The White House'
  }
];

describe('normalizeHistory', () => {
  it('deduplicates records by verified event id and sorts newest first', () => {
    const duplicate = { ...verifiedHistory[0], reason: 'Duplicate refresh entry' };
    const normalized = normalizeHistory([verifiedHistory[1], duplicate, verifiedHistory[0]]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].id).toBe('lindsey-graham-2026');
  });

  it('rejects malformed and unsupported records', () => {
    expect(
      normalizeHistory([
        null,
        { status: 'unknown', date: '2026-01-01' },
        { status: 'full-staff', date: 'not-a-date' }
      ])
    ).toEqual([]);
  });
});

describe('verified history statistics', () => {
  it('counts ordered calendar days from actual start/end dates', () => {
    expect(orderedCalendarDays(verifiedHistory[0])).toBe(7);
    expect(orderedCalendarDays(verifiedHistory[1])).toBe(5);

    const stats = calculateHistoryStats(verifiedHistory, new Date('2026-07-14T18:11:50Z'));
    expect(stats.verifiedRecords).toBe(2);
    expect(stats.orderedDays).toBe(12);
    expect(stats.currentRunDays).toBe(2);
  });
});
