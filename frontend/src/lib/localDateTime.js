/** Local calendar helpers — avoid UTC `toISOString().split('T')[0]` date bugs (IST mornings). */

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Today's date in the browser's local timezone as YYYY-MM-DD. */
export function localTodayInput(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** HH:mm from a Date in local timezone. */
export function localTimeInput(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '10:00';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Build an ISO string from local date + time fields (what the user typed).
 * Avoids Safari/Chrome treating `YYYY-MM-DDTHH:mm:ss` without offset differently.
 */
export function localDateTimeToIso(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr || '00:00').split(':').map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  const dt = new Date(
    y,
    (m || 1) - 1,
    d || 1,
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    0,
    0
  );
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** Parse `<input type="datetime-local">` value (YYYY-MM-DDTHH:mm) as local wall time → ISO. */
export function datetimeLocalToIso(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const [datePart, timePart = '00:00'] = raw.split('T');
  return localDateTimeToIso(datePart, timePart.slice(0, 5));
}
