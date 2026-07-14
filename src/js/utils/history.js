const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function utcCalendarDay(value) {
  const date = asDate(value);
  return date ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : null;
}

export function normalizeHistory(entries = []) {
  const seen = new Set();

  return entries
    .filter((entry) => entry && ['half-staff', 'full-staff'].includes(entry.status))
    .map((entry) => ({
      ...entry,
      date: entry.starts || entry.date,
      ends: entry.ends || entry.expires || null
    }))
    .filter((entry) => asDate(entry.date))
    .filter((entry) => {
      const fingerprint =
        entry.id || `${entry.status}|${entry.date}|${entry.reason || ''}|${entry.source || ''}`;
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .sort((a, b) => asDate(b.date) - asDate(a.date));
}

export function orderedCalendarDays(entry, now = new Date()) {
  if (entry.status !== 'half-staff') return 0;
  const start = utcCalendarDay(entry.date);
  const end = utcCalendarDay(entry.ends || now);
  if (start === null || end === null || end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
}

export function elapsedDaysSince(value, now = new Date()) {
  const start = asDate(value);
  if (!start) return 0;
  return Math.max(0, Math.floor((now - start) / DAY_MS));
}

export function calculateHistoryStats(entries, now = new Date()) {
  const history = normalizeHistory(entries);
  return {
    verifiedRecords: history.length,
    orderedDays: history.reduce((total, entry) => total + orderedCalendarDays(entry, now), 0),
    currentRunDays: history.length ? elapsedDaysSince(history[0].date, now) : 0,
    lastChangeDate: history[0]?.date || null
  };
}
