/**
 * Shared org-timezone helpers (IST / Asia/Kolkata by default).
 * Extracted from attendanceService so other features (session tracking) can
 * reuse the exact same "what calendar day / what time is it in IST" logic
 * instead of re-deriving it with server-local Date math.
 *
 * This is also the single source of truth for the sales-executive daily
 * session window (start/end) — do not hard-code these hour/minute values
 * anywhere else; import them (or the helpers below) from here.
 */

const ORG_TZ = process.env.ATTENDANCE_TZ || 'Asia/Kolkata';

/** End of the daily session window — sales-executive sessions are forcibly
 * terminated (EOD) at this instant. Default 8:30 PM IST. */
const EOD_HOUR = Number(process.env.ATTENDANCE_EOD_HOUR ?? 20);
const EOD_MINUTE = Number(process.env.ATTENDANCE_EOD_MINUTE ?? 30);

/** Start of the daily session window — a NEW sales-executive login is rejected
 * before this instant. Does NOT affect an already-open session (a session may
 * legitimately cross midnight and run through the pre-window hours; only a
 * fresh login attempt is gated). Default 6:30 AM IST. */
const SESSION_START_HOUR = Number(process.env.ATTENDANCE_SESSION_START_HOUR ?? 6);
const SESSION_START_MINUTE = Number(process.env.ATTENDANCE_SESSION_START_MINUTE ?? 30);

/** Roles subject to the daily session window (both the login-start gate and the EOD cutoff). */
const SESSION_WINDOW_ROLES = ['sales_executive'];
/** Back-compat alias — some call sites predate the SESSION_WINDOW_ROLES name. */
const EOD_LOGOUT_ROLES = SESSION_WINDOW_ROLES;

function calendarParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORG_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return { y, m, d, key: `${y}-${m}-${d}` };
}

/** Start of calendar day in org timezone (stored as Date). */
function startOfCalendarDay(date = new Date()) {
  const { y, m, d } = calendarParts(date);
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

function endOfCalendarDay(date = new Date()) {
  const { y, m, d } = calendarParts(date);
  return new Date(`${y}-${m}-${d}T23:59:59.999+05:30`);
}

function timePartsInOrg(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ORG_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const minute = Number(parts.find((p) => p.type === 'minute').value);
  return { hour, minute };
}

/** Today's forced logout cutoff in org timezone (default 8:30 PM IST). */
function getForcedLogoutCutoff(date = new Date()) {
  const { y, m, d } = calendarParts(date);
  const hh = String(EOD_HOUR).padStart(2, '0');
  const mm = String(EOD_MINUTE).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+05:30`);
}

function isPastForcedLogoutTime(date = new Date()) {
  return date.getTime() >= getForcedLogoutCutoff(date).getTime();
}

/** Today's session-window start in org timezone (default 6:30 AM IST). */
function getSessionWindowStart(date = new Date()) {
  const { y, m, d } = calendarParts(date);
  const hh = String(SESSION_START_HOUR).padStart(2, '0');
  const mm = String(SESSION_START_MINUTE).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+05:30`);
}

/** True before today's session-window start — gates NEW logins only, never an
 * already-open session (that's just the EOD cutoff's job). */
function isBeforeSessionWindowStart(date = new Date()) {
  return date.getTime() < getSessionWindowStart(date).getTime();
}

/** "20:30" -> "8:30 PM" — used to keep user-facing messages in sync with the
 * actual configured cutoff instead of a separately hard-coded string. */
function formatClockLabel(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

module.exports = {
  ORG_TZ,
  EOD_HOUR,
  EOD_MINUTE,
  SESSION_START_HOUR,
  SESSION_START_MINUTE,
  SESSION_WINDOW_ROLES,
  EOD_LOGOUT_ROLES,
  calendarParts,
  startOfCalendarDay,
  endOfCalendarDay,
  timePartsInOrg,
  getForcedLogoutCutoff,
  isPastForcedLogoutTime,
  getSessionWindowStart,
  isBeforeSessionWindowStart,
  formatClockLabel,
};
