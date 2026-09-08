export function formatDurationMs(ms = 0) {
  const totalMinutes = Math.round((ms || 0) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatTime(at) {
  if (!at) return '—';
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(at) {
  if (!at) return '—';
  return new Date(at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
