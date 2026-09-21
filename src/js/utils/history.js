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

function uniqueOrderedCalendarDays(entries, now) {
  const days = new Set();

  entries
    .filter((entry) => entry.status === 'half-staff')
    .forEach((entry) => {
      const start = utcCalendarDay(entry.date);
      const end = utcCalendarDay(entry.ends || now);
      if (start === null || end === null || end < start) return;
      for (let day = start; day <= end; day += DAY_MS) days.add(day);
    });

  return days.size;
}

function currentRunStart(history, now) {
  const intervals = history
    .filter((entry) => entry.status === 'half-staff')
    .map((entry) => {
      const start = asDate(entry.date);
      const parsedEnd = asDate(entry.ends);
      const end =
        parsedEnd && /^\d{4}-\d{2}-\d{2}$/.test(entry.ends)
          ? new Date(parsedEnd.getTime() + DAY_MS)
          : parsedEnd || new Date(now.getTime() + 1);
      return start && end >= start ? { start, end } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  intervals.forEach((interval) => {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      if (interval.end > previous.end) previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  });

  const active = merged.find(({ start, end }) => start <= now && now < end);
  if (active) return active.start;

  const boundaries = [
    ...history.filter((entry) => entry.status === 'full-staff').map((entry) => asDate(entry.date)),
    ...merged.map((interval) => interval.end)
  ].filter((date) => date && date <= now);

  return boundaries.length
    ? new Date(Math.max(...boundaries.map((date) => date.getTime())))
    : asDate(history[0]?.date);
}

export function calculateHistoryStats(entries, now = new Date()) {
  const history = normalizeHistory(entries);
  const runStart = currentRunStart(history, now);
  return {
    verifiedRecords: history.length,
    orderedDays: uniqueOrderedCalendarDays(history, now),
    currentRunDays: runStart ? elapsedDaysSince(runStart, now) : 0,
    lastChangeDate: runStart?.toISOString() || null
  };
}
