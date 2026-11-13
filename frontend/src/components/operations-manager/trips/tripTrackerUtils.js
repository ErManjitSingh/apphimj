export function sortTrips(trips, sortBy = 'departure') {
  const rows = [...(trips || [])];
  if (sortBy === 'customer') {
    return rows.sort((a, b) => String(a.customerName).localeCompare(String(b.customerName)));
  }
  if (sortBy === 'destination') {
    return rows.sort((a, b) => String(a.destination).localeCompare(String(b.destination)));
  }
  return rows.sort((a, b) => new Date(a.travelDate || 0) - new Date(b.travelDate || 0));
}

export function formatTripDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTripDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  }).toUpperCase();
}

function parseLocalDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateRangeLabel(from, to) {
  const fmt = (d) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!from && !to) return 'All dates';
  const start = parseLocalDateInput(from);
  const end = parseLocalDateInput(to);
  if (start && end) {
    if (start.getTime() === end.getTime()) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return 'All dates';
}

const TONE_STYLES = {
  green: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    footer: 'bg-emerald-50 border-emerald-100',
    footerText: 'text-emerald-700',
    bookingPill: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  },
  blue: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    footer: 'bg-sky-50 border-sky-100',
    footerText: 'text-sky-700',
    bookingPill: 'bg-sky-50 text-sky-800 border-sky-100',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    footer: 'bg-amber-50 border-amber-100',
    footerText: 'text-amber-700',
    bookingPill: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  emerald: {
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    footer: 'bg-teal-50 border-teal-100',
    footerText: 'text-teal-700',
    bookingPill: 'bg-teal-50 text-teal-800 border-teal-100',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    footer: 'bg-slate-50 border-slate-100',
    footerText: 'text-slate-700',
    bookingPill: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    footer: 'bg-rose-50 border-rose-100',
    footerText: 'text-rose-700',
    bookingPill: 'bg-rose-50 text-rose-800 border-rose-100',
  },
  orange: {
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    footer: 'bg-orange-50 border-orange-100',
    footerText: 'text-orange-700',
    bookingPill: 'bg-orange-50 text-orange-800 border-orange-100',
  },
};

export function getTripToneStyles(tone = 'slate') {
  return TONE_STYLES[tone] || TONE_STYLES.slate;
}
