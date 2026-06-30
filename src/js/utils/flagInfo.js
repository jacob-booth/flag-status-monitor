/**
 * Flag Information Utility
 * @fileoverview Provides comprehensive flag status context, federal holidays, and historical information
 */

/** Formats a year/month/day (month is 0-indexed) as an ISO date string. */
function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Returns the date of the nth occurrence of `weekday` (0=Sun..6=Sat) in `month` of `year`. */
function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return toISODate(year, month, day);
}

/** Returns the date of the last occurrence of `weekday` (0=Sun..6=Sat) in `month` of `year`. */
function lastWeekdayOfMonth(year, month, weekday) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const last = new Date(year, month, lastDay);
  const offset = (last.getDay() - weekday + 7) % 7;
  return toISODate(year, month, lastDay - offset);
}

/** A fixed-date holiday observed on the nearest weekday if it falls on a weekend (federal convention). */
function fixedDateObserved(year, month, day) {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  if (dow === 0) return toISODate(year, month, day + 1); // Sunday -> Monday
  if (dow === 6) return toISODate(year, month, day - 1); // Saturday -> Friday
  return toISODate(year, month, day);
}

/**
 * Builds the U.S. federal holiday calendar for a given year using the
 * actual scheduling rules (nth-weekday-of-month, weekend shifting, etc.)
 * instead of a hardcoded list, so the calendar stays correct every year.
 */
export function getFederalHolidaysForYear(year) {
  return [
    { date: fixedDateObserved(year, 0, 1), name: "New Year's Day", type: 'federal' },
    {
      date: nthWeekdayOfMonth(year, 0, 1, 3),
      name: 'Martin Luther King Jr. Day',
      type: 'federal'
    },
    { date: nthWeekdayOfMonth(year, 1, 1, 3), name: "Presidents' Day", type: 'federal' },
    {
      date: lastWeekdayOfMonth(year, 4, 1),
      name: 'Memorial Day',
      type: 'federal',
      halfStaff: true
    },
    { date: fixedDateObserved(year, 5, 19), name: 'Juneteenth', type: 'federal' },
    { date: fixedDateObserved(year, 6, 4), name: 'Independence Day', type: 'federal' },
    { date: nthWeekdayOfMonth(year, 8, 1, 1), name: 'Labor Day', type: 'federal' },
    { date: nthWeekdayOfMonth(year, 9, 1, 2), name: 'Columbus Day', type: 'federal' },
    { date: fixedDateObserved(year, 10, 11), name: 'Veterans Day', type: 'federal' },
    { date: nthWeekdayOfMonth(year, 10, 4, 4), name: 'Thanksgiving Day', type: 'federal' },
    { date: fixedDateObserved(year, 11, 25), name: 'Christmas Day', type: 'federal' }
  ];
}

/**
 * Builds the special observance calendar for a given year. These are not
 * federal holidays, but they're days the U.S. Flag Code calls out by name
 * (e.g. half-staff remembrances and celebratory observances).
 */
export function getSpecialObservancesForYear(year) {
  return [
    {
      date: toISODate(year, 8, 11),
      name: 'Patriot Day',
      type: 'remembrance',
      halfStaff: true
    },
    {
      date: toISODate(year, 11, 7),
      name: 'Pearl Harbor Remembrance Day',
      type: 'remembrance',
      halfStaff: true
    },
    {
      date: toISODate(year, 4, 15),
      name: 'Peace Officers Memorial Day',
      type: 'remembrance',
      halfStaff: true
    },
    { date: toISODate(year, 3, 28), name: 'Workers Memorial Day', type: 'remembrance' },
    { date: toISODate(year, 5, 14), name: 'Flag Day', type: 'celebration' },
    { date: toISODate(year, 8, 17), name: 'Constitution Day', type: 'celebration' }
  ];
}

/**
 * Half-staff periods and reasons
 */
export const HALF_STAFF_PERIODS = {
  memorial_day: {
    description: 'Memorial Day observance - honoring fallen service members',
    duration: 'Until noon, then raised to full-staff',
    tradition: 'Established by Presidential Proclamation'
  },
  patriot_day: {
    description: 'September 11th Remembrance - honoring victims of terrorist attacks',
    duration: 'Sunrise to sunset',
    tradition: 'Presidential Proclamation since 2001'
  },
  pearl_harbor: {
    description: 'Pearl Harbor Remembrance Day - honoring victims of December 7, 1941',
    duration: 'Sunrise to sunset',
    tradition: 'Presidential Proclamation'
  },
  peace_officers: {
    description: 'Peace Officers Memorial Day - honoring fallen law enforcement',
    duration: 'Sunrise to sunset',
    tradition: 'Presidential Proclamation'
  },
  presidential_death: {
    description: 'Death of current or former President',
    duration: '30 days',
    tradition: 'U.S. Flag Code Section 7(m)'
  },
  vice_presidential_death: {
    description: 'Death of current or former Vice President',
    duration: '10 days',
    tradition: 'U.S. Flag Code Section 7(m)'
  }
};

/**
 * Get the nearest federal holiday
 * @param {Date} currentDate - Current date
 * @returns {Object} Nearest holiday information
 */
export function getNearestFederalHoliday(currentDate = new Date()) {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  // Pull from the surrounding years too so "nearest" stays correct right
  // at the start/end of the calendar (e.g. looking for the next holiday
  // on December 30th, or the most recent one on January 2nd).
  const allDates = [year - 1, year, year + 1]
    .flatMap((y) => [...getFederalHolidaysForYear(y), ...getSpecialObservancesForYear(y)])
    .map((holiday) => ({
      ...holiday,
      dateObj: new Date(holiday.date + 'T00:00:00')
    }))
    .sort((a, b) => a.dateObj - b.dateObj);

  // Find next upcoming holiday
  const upcoming = allDates.find((holiday) => holiday.dateObj >= today);

  // Find most recent past holiday
  const recent = allDates.reverse().find((holiday) => holiday.dateObj < today);

  const result = {
    upcoming: upcoming
      ? {
          name: upcoming.name,
          date: upcoming.date,
          type: upcoming.type,
          daysUntil: Math.ceil((upcoming.dateObj - today) / (1000 * 60 * 60 * 24)),
          halfStaff: upcoming.halfStaff || false
        }
      : null,
    recent: recent
      ? {
          name: recent.name,
          date: recent.date,
          type: recent.type,
          daysAgo: Math.ceil((today - recent.dateObj) / (1000 * 60 * 60 * 24)),
          halfStaff: recent.halfStaff || false
        }
      : null
  };

  return result;
}

/**
 * Check if today is a special observance day
 * @param {Date} currentDate - Current date
 * @returns {Object|null} Today's observance or null
 */
export function getTodaysObservance(currentDate = new Date()) {
  const today = currentDate.toISOString().split('T')[0];
  const year = currentDate.getFullYear();

  const todayHoliday = getFederalHolidaysForYear(year).find((holiday) => holiday.date === today);
  if (todayHoliday) return { ...todayHoliday, category: 'federal' };

  const todayObservance = getSpecialObservancesForYear(year).find((obs) => obs.date === today);
  if (todayObservance) return { ...todayObservance, category: 'observance' };

  return null;
}

/**
 * Get detailed flag status information
 * @param {string} status - Current flag status ('full-staff' or 'half-staff')
 * @param {string} reason - Reason for current status
 * @param {Date} currentDate - Current date
 * @returns {Object} Comprehensive flag information
 */
export function getDetailedFlagInfo(status, reason = '', currentDate = new Date()) {
  const holidays = getNearestFederalHoliday(currentDate);
  const todaysObservance = getTodaysObservance(currentDate);

  const info = {
    status,
    reason,
    todaysObservance,
    holidays,
    context: generateStatusContext(status, reason, todaysObservance, holidays),
    flagCode: getFlagCodeReference(status),
    historicalNote: getHistoricalNote(currentDate),
    nextSignificantDate: getNextSignificantDate(holidays)
  };

  return info;
}

/**
 * Generate contextual information about the flag status
 * @param {string} status - Flag status
 * @param {string} reason - Reason
 * @param {Object} todaysObservance - Today's observance
 * @param {Object} holidays - Holiday information
 * @returns {string} Context description
 */
function generateStatusContext(status, reason, todaysObservance, holidays) {
  if (status === 'half-staff') {
    if (todaysObservance) {
      if (todaysObservance.halfStaff) {
        return `Flying at half-staff in observance of ${todaysObservance.name}. This is a ${todaysObservance.type === 'federal' ? 'federal holiday' : 'day of remembrance'} when flags are traditionally lowered to honor those we remember.`;
      }
    }

    if (reason.toLowerCase().includes('memorial')) {
      return `Flying at half-staff for Memorial Day observance. According to tradition, flags fly at half-staff until noon, then are raised to full-staff for the remainder of the day.`;
    }

    if (reason.toLowerCase().includes('death') || reason.toLowerCase().includes('passing')) {
      return `Flying at half-staff by Presidential Proclamation. This typically occurs following the death of prominent government officials or in response to national tragedies.`;
    }

    return `Flying at half-staff as directed by Presidential Proclamation or in accordance with the U.S. Flag Code.`;
  }

  // Full-staff context
  if (todaysObservance && !todaysObservance.halfStaff) {
    return `Flying at full-staff in celebration of ${todaysObservance.name}. This ${todaysObservance.type === 'federal' ? 'federal holiday' : 'observance day'} celebrates our nation's values and history.`;
  }

  if (holidays.upcoming && holidays.upcoming.daysUntil <= 7) {
    return `Flying at full-staff during normal operations. ${holidays.upcoming.name} is approaching in ${holidays.upcoming.daysUntil} day${holidays.upcoming.daysUntil !== 1 ? 's' : ''}.`;
  }

  return 'Flying at full-staff during normal operations, as prescribed by the U.S. Flag Code for daily display.';
}

/**
 * Get relevant U.S. Flag Code reference
 * @param {string} status - Flag status
 * @returns {Object} Flag code reference
 */
function getFlagCodeReference(status) {
  if (status === 'half-staff') {
    return {
      section: 'Section 7(m)',
      text: 'The flag shall be displayed at half-staff upon Presidential Proclamation or as directed by appropriate authority.',
      note: 'Half-staff means lowering the flag to one-half the distance between the top and bottom of the staff.'
    };
  }

  return {
    section: 'Section 6(a)',
    text: 'It is the universal custom to display the flag only from sunrise to sunset on buildings and on stationary flagstaffs in the open.',
    note: 'The flag should be displayed daily on or near the main administration building of every public institution.'
  };
}

/**
 * Get historical note for the current date
 * @param {Date} currentDate - Current date
 * @returns {string|null} Historical note
 */
function getHistoricalNote(currentDate) {
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  const historicalNotes = {
    '6-14':
      'Today is Flag Day, commemorating the adoption of the Stars and Stripes as the official flag of the United States on June 14, 1777.',
    '7-4':
      'Today is Independence Day, celebrating the Declaration of Independence and the birth of the United States of America in 1776.',
    '9-11':
      'Today is Patriot Day, a day of remembrance for the victims of the September 11, 2001 terrorist attacks.',
    '12-7':
      'Today is Pearl Harbor Remembrance Day, honoring the 2,400+ Americans who died in the attack on Pearl Harbor in 1941.',
    '5-30':
      'Originally known as Decoration Day, Memorial Day began after the Civil War to honor fallen soldiers.',
    '11-11':
      'Veterans Day honors all American veterans, living and deceased, who served in the U.S. Armed Forces.'
  };

  const key = `${month}-${day}`;
  return historicalNotes[key] || null;
}

/**
 * Get the next significant date for flag observance
 * @param {Object} holidays - Holiday information
 * @returns {Object|null} Next significant date
 */
function getNextSignificantDate(holidays) {
  if (holidays.upcoming) {
    return {
      date: holidays.upcoming.date,
      name: holidays.upcoming.name,
      daysUntil: holidays.upcoming.daysUntil,
      significance: holidays.upcoming.halfStaff
        ? 'Flag will fly at half-staff'
        : 'Federal holiday - flag display encouraged'
    };
  }

  return null;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatHolidayDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Get flag etiquette tips
 * @returns {Array} Array of etiquette tips
 */
export function getFlagEtiquetteTips() {
  return [
    'The flag should be displayed from sunrise to sunset, unless properly illuminated during darkness.',
    'When displayed with other flags, the U.S. flag should be at the same height or higher.',
    'The flag should never touch the ground, floor, water, or anything beneath it.',
    'During the Pledge of Allegiance, civilians should face the flag and place their right hand over their heart.',
    'The flag should be folded in a triangle when not displayed, with only the blue field visible.',
    'On Memorial Day, the flag flies at half-staff until noon, then at full-staff for the remainder of the day.'
  ];
}
