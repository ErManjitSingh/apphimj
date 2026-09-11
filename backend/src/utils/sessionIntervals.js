/**
 * Merge a set of (possibly overlapping) session intervals into their union,
 * so "how long was this person present" is never the sum of every device's
 * duration — two devices open 09:00-17:00 and 10:00-18:00 overlap into a
 * single 09:00-18:00 presence window (9h), not 16h.
 *
 * @param {Array<{loginAt: Date|string, logoutAt: Date|string|null}>} sessions
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {{ mergedIntervals: Array<{start: Date, end: Date}>, presenceMs: number }}
 */
function mergeSessionIntervals(sessions, rangeStart, rangeEnd) {
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const now = Date.now();

  const clipped = [];
  for (const session of sessions || []) {
    if (!session?.loginAt) continue;
    const startMs = new Date(session.loginAt).getTime();
    const rawEndMs = session.logoutAt ? new Date(session.logoutAt).getTime() : now;
    const endMs = Math.min(rawEndMs, rangeEndMs, now);
    const clampedStart = Math.max(startMs, rangeStartMs);
    if (!Number.isFinite(clampedStart) || !Number.isFinite(endMs) || clampedStart >= endMs) continue;
    clipped.push({ start: clampedStart, end: endMs });
  }

  clipped.sort((a, b) => a.start - b.start);

  const merged = [];
  for (const interval of clipped) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const presenceMs = merged.reduce((sum, i) => sum + (i.end - i.start), 0);
  const mergedIntervals = merged.map((i) => ({ start: new Date(i.start), end: new Date(i.end) }));

  return { mergedIntervals, presenceMs };
}

module.exports = { mergeSessionIntervals };
