import { describe, expect, it } from 'vitest';
import {
  formatHolidayDate,
  getDetailedFlagInfo,
  getFederalHolidaysForYear,
  getFlagEtiquetteTips,
  getNearestFederalHoliday,
  getTodaysObservance
} from '../flagInfo.js';

describe('getNearestFederalHoliday', () => {
  it('finds the next upcoming and most recent past holiday relative to a fixed date', () => {
    const result = getNearestFederalHoliday(new Date('2025-07-01T00:00:00Z'));

    expect(result.upcoming).toMatchObject({ name: 'Independence Day', date: '2025-07-04' });
    expect(result.recent).toMatchObject({ name: 'Juneteenth', date: '2025-06-19' });
    expect(result.upcoming.daysUntil).toBeGreaterThanOrEqual(0);
  });
});

describe('getFederalHolidaysForYear', () => {
  it('computes movable holidays correctly for an arbitrary future year (2026)', () => {
    const holidays = getFederalHolidaysForYear(2026);
    const byName = Object.fromEntries(holidays.map((h) => [h.name, h.date]));

    expect(byName['Martin Luther King Jr. Day']).toBe('2026-01-19');
    expect(byName["Presidents' Day"]).toBe('2026-02-16');
    expect(byName['Memorial Day']).toBe('2026-05-25');
    expect(byName['Labor Day']).toBe('2026-09-07');
    expect(byName['Columbus Day']).toBe('2026-10-12');
    expect(byName['Thanksgiving Day']).toBe('2026-11-26');
  });

  it('shifts weekend fixed-date holidays to the nearest weekday', () => {
    // Independence Day 2026 falls on a Saturday, so it should be observed Friday.
    const holidays = getFederalHolidaysForYear(2026);
    const independenceDay = holidays.find((h) => h.name === 'Independence Day');
    expect(independenceDay.date).toBe('2026-07-03');
  });

  it('never returns a stale, hardcoded year regardless of the requested year', () => {
    expect(getFederalHolidaysForYear(2030).every((h) => h.date.startsWith('2030-'))).toBe(true);
  });
});

describe('getNearestFederalHoliday (year-agnostic)', () => {
  it('still finds upcoming/recent holidays well outside the original hardcoded 2025 dataset', () => {
    const result = getNearestFederalHoliday(new Date('2026-06-30T00:00:00Z'));
    expect(result.upcoming).not.toBeNull();
    expect(result.upcoming.date.startsWith('2026-')).toBe(true);
    expect(result.recent).not.toBeNull();
  });

  it('handles the turn of the year without losing track of nearby holidays', () => {
    const result = getNearestFederalHoliday(new Date('2026-12-30T00:00:00Z'));
    expect(result.upcoming).toMatchObject({ name: "New Year's Day", date: '2027-01-01' });
  });
});

describe('getTodaysObservance', () => {
  it('returns the matching federal holiday when the date matches exactly', () => {
    const observance = getTodaysObservance(new Date('2025-07-04T00:00:00Z'));
    expect(observance).toMatchObject({ name: 'Independence Day', category: 'federal' });
  });

  it('returns null on a day with no observance', () => {
    expect(getTodaysObservance(new Date('2025-03-03T00:00:00Z'))).toBeNull();
  });
});

describe('getDetailedFlagInfo', () => {
  it('builds half-staff context distinct from full-staff context', () => {
    const halfStaff = getDetailedFlagInfo(
      'half-staff',
      'Memorial Day observance',
      new Date('2025-05-26T00:00:00Z')
    );
    const fullStaff = getDetailedFlagInfo('full-staff', '', new Date('2025-03-03T00:00:00Z'));

    expect(halfStaff.flagCode.section).toBe('Section 7(m)');
    expect(fullStaff.flagCode.section).toBe('Section 6(a)');
    expect(halfStaff.context).not.toEqual(fullStaff.context);
  });
});

describe('formatHolidayDate', () => {
  it('renders a long, human-readable date', () => {
    expect(formatHolidayDate('2025-07-04')).toContain('July');
  });
});

describe('getFlagEtiquetteTips', () => {
  it('returns a non-empty list of distinct tips', () => {
    const tips = getFlagEtiquetteTips();
    expect(tips.length).toBeGreaterThan(3);
    expect(new Set(tips).size).toBe(tips.length);
  });
});
