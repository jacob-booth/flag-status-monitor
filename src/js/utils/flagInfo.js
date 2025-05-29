/**
 * Flag Information Utility
 * @fileoverview Provides comprehensive flag status context, federal holidays, and historical information
 */

/**
 * Federal Holidays for 2025
 */
export const FEDERAL_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'federal' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'federal' },
  { date: '2025-02-17', name: 'Presidents\' Day', type: 'federal' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'federal', halfStaff: true },
  { date: '2025-06-19', name: 'Juneteenth', type: 'federal' },
  { date: '2025-07-04', name: 'Independence Day', type: 'federal' },
  { date: '2025-09-01', name: 'Labor Day', type: 'federal' },
  { date: '2025-10-13', name: 'Columbus Day', type: 'federal' },
  { date: '2025-11-11', name: 'Veterans Day', type: 'federal' },
  { date: '2025-11-27', name: 'Thanksgiving Day', type: 'federal' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'federal' }
];

/**
 * Special Observance Days that may affect flag status
 */
export const SPECIAL_OBSERVANCES = [
  { date: '2025-09-11', name: 'Patriot Day', type: 'remembrance', halfStaff: true },
  { date: '2025-12-07', name: 'Pearl Harbor Remembrance Day', type: 'remembrance', halfStaff: true },
  { date: '2025-05-15', name: 'Peace Officers Memorial Day', type: 'remembrance', halfStaff: true },
  { date: '2025-04-28', name: 'Workers Memorial Day', type: 'remembrance' },
  { date: '2025-06-14', name: 'Flag Day', type: 'celebration' },
  { date: '2025-09-17', name: 'Constitution Day', type: 'celebration' }
];

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
  
  const allDates = [...FEDERAL_HOLIDAYS_2025, ...SPECIAL_OBSERVANCES]
    .map(holiday => ({
      ...holiday,
      dateObj: new Date(holiday.date + 'T00:00:00')
    }))
    .sort((a, b) => a.dateObj - b.dateObj);
  
  // Find next upcoming holiday
  const upcoming = allDates.find(holiday => holiday.dateObj >= today);
  
  // Find most recent past holiday
  const recent = allDates.reverse().find(holiday => holiday.dateObj < today);
  
  const result = {
    upcoming: upcoming ? {
      name: upcoming.name,
      date: upcoming.date,
      type: upcoming.type,
      daysUntil: Math.ceil((upcoming.dateObj - today) / (1000 * 60 * 60 * 24)),
      halfStaff: upcoming.halfStaff || false
    } : null,
    recent: recent ? {
      name: recent.name,
      date: recent.date,
      type: recent.type,
      daysAgo: Math.ceil((today - recent.dateObj) / (1000 * 60 * 60 * 24)),
      halfStaff: recent.halfStaff || false
    } : null
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
  
  const todayHoliday = FEDERAL_HOLIDAYS_2025.find(holiday => holiday.date === today);
  if (todayHoliday) return { ...todayHoliday, category: 'federal' };
  
  const todayObservance = SPECIAL_OBSERVANCES.find(obs => obs.date === today);
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
    flagCode: getFlagCodeReference(status, todaysObservance),
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
 * @param {Object} todaysObservance - Today's observance
 * @returns {Object} Flag code reference
 */
function getFlagCodeReference(status, todaysObservance) {
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
    '6-14': 'Today is Flag Day, commemorating the adoption of the Stars and Stripes as the official flag of the United States on June 14, 1777.',
    '7-4': 'Today is Independence Day, celebrating the Declaration of Independence and the birth of the United States of America in 1776.',
    '9-11': 'Today is Patriot Day, a day of remembrance for the victims of the September 11, 2001 terrorist attacks.',
    '12-7': 'Today is Pearl Harbor Remembrance Day, honoring the 2,400+ Americans who died in the attack on Pearl Harbor in 1941.',
    '5-30': 'Originally known as Decoration Day, Memorial Day began after the Civil War to honor fallen soldiers.',
    '11-11': 'Veterans Day honors all American veterans, living and deceased, who served in the U.S. Armed Forces.'
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
      significance: holidays.upcoming.halfStaff ? 
        'Flag will fly at half-staff' : 
        'Federal holiday - flag display encouraged'
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