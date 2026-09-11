const { mergeSessionIntervals } = require('../../src/utils/sessionIntervals');

const d = (s) => new Date(`2026-01-15T${s}:00+05:30`);
const rangeStart = new Date('2026-01-15T00:00:00+05:30');
const rangeEnd = new Date('2026-01-15T23:59:59.999+05:30');

describe('mergeSessionIntervals', () => {
  test('TEST 1: single device, one session — presence equals its own duration', () => {
    const sessions = [{ loginAt: d('09:00'), logoutAt: d('17:00') }];
    const { presenceMs, mergedIntervals } = mergeSessionIntervals(sessions, rangeStart, rangeEnd);
    expect(presenceMs).toBe(8 * 60 * 60 * 1000);
    expect(mergedIntervals).toHaveLength(1);
  });

  test('TEST 2: two overlapping devices merge into their union, not the sum', () => {
    // Laptop 09:00-17:00 (8h), Mobile 10:00-18:00 (8h) — naive sum = 16h, correct union = 9h.
    const sessions = [
      { loginAt: d('09:00'), logoutAt: d('17:00') },
      { loginAt: d('10:00'), logoutAt: d('18:00') },
    ];
    const { presenceMs, mergedIntervals } = mergeSessionIntervals(sessions, rangeStart, rangeEnd);
    expect(presenceMs).toBe(9 * 60 * 60 * 1000);
    expect(presenceMs).toBeLessThan(16 * 60 * 60 * 1000);
    expect(mergedIntervals).toHaveLength(1);
    expect(mergedIntervals[0].start.getTime()).toBe(d('09:00').getTime());
    expect(mergedIntervals[0].end.getTime()).toBe(d('18:00').getTime());
  });

  test('TEST 3: three sessions, two overlapping + one separate — correct union total', () => {
    const sessions = [
      { loginAt: d('09:00'), logoutAt: d('17:00') },
      { loginAt: d('10:00'), logoutAt: d('18:00') },
      { loginAt: d('18:30'), logoutAt: d('20:00') },
    ];
    const { presenceMs, mergedIntervals } = mergeSessionIntervals(sessions, rangeStart, rangeEnd);
    // 09:00-18:00 (9h) + 18:30-20:00 (1h30m) = 10h30m
    expect(presenceMs).toBe((9 * 60 + 90) * 60 * 1000);
    expect(mergedIntervals).toHaveLength(2);
  });

  test('touching-but-not-overlapping intervals merge into one', () => {
    const sessions = [
      { loginAt: d('09:00'), logoutAt: d('12:00') },
      { loginAt: d('12:00'), logoutAt: d('15:00') },
    ];
    const { presenceMs, mergedIntervals } = mergeSessionIntervals(sessions, rangeStart, rangeEnd);
    expect(presenceMs).toBe(6 * 60 * 60 * 1000);
    expect(mergedIntervals).toHaveLength(1);
  });

  test('a session fully outside the query range is dropped', () => {
    const outOfRange = { loginAt: new Date('2026-01-10T09:00:00+05:30'), logoutAt: new Date('2026-01-10T17:00:00+05:30') };
    const inRange = { loginAt: d('09:00'), logoutAt: d('17:00') };
    const { mergedIntervals } = mergeSessionIntervals([outOfRange, inRange], rangeStart, rangeEnd);
    expect(mergedIntervals).toHaveLength(1);
  });

  test('a session crossing midnight is clipped to the queried day boundary', () => {
    // Login the previous day at 22:00, logout 02:00 the next day — only the portion
    // inside [rangeStart, rangeEnd] (00:00-02:00 of the queried day) should count.
    const crossingMidnight = {
      loginAt: new Date('2026-01-14T22:00:00+05:30'),
      logoutAt: new Date('2026-01-15T02:00:00+05:30'),
    };
    const { presenceMs, mergedIntervals } = mergeSessionIntervals([crossingMidnight], rangeStart, rangeEnd);
    expect(presenceMs).toBe(2 * 60 * 60 * 1000);
    expect(mergedIntervals[0].start.getTime()).toBe(rangeStart.getTime());
  });

  test('an open session (no logoutAt) is clipped to "now" or the range end, whichever is earlier', () => {
    const openSession = { loginAt: d('09:00'), logoutAt: null };
    const { presenceMs } = mergeSessionIntervals([openSession], rangeStart, rangeEnd);
    expect(presenceMs).toBeGreaterThanOrEqual(0);
    expect(presenceMs).toBeLessThanOrEqual(rangeEnd.getTime() - d('09:00').getTime());
  });
});
