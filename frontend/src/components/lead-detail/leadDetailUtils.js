import { getLeadSourceShortLabel } from '../../lib/leadSourceLabels';

export function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'LD'
  );
}

export function formatSource(lead) {
  return getLeadSourceShortLabel(lead?.source || lead?.leadSource, lead?.sourceLabel);
}

export function computeLeadAge(createdAt) {
  if (!createdAt) return '—';
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function computeLeadScores(lead) {
  const smart = Number(lead?.smartScore) || 0;
  const response = Number(lead?.responseRate) || 0;
  const budget = Number(lead?.budget) || 0;
  const budgetScore = budget >= 70000 ? 90 : budget >= 50000 ? 80 : budget >= 30000 ? 70 : budget >= 15000 ? 55 : 40;
  const fuCount = lead?.followups?.length || lead?.followUps?.length || 0;
  const quoteCount = lead?.quotations?.length || 0;
  const engagementScore = Math.min(100, fuCount * 12 + quoteCount * 18 + (lead?.lastContactedAt ? 25 : 10));
  const responseScore = response || Math.min(90, engagementScore + 10);
  const statusMap = {
    converted: 100,
    negotiation: 72,
    quotation_sent: 65,
    follow_up: 55,
    contacted: 40,
    new: 25,
  };
  const conversionProbability = statusMap[lead?.status] ?? (smart || 50);
  const overall = smart || Math.round((budgetScore + engagementScore + responseScore + conversionProbability) / 4);

  return { overall, budgetScore, engagementScore, responseScore, conversionProbability };
}

export function deriveLeadTags(lead) {
  const tags = [];
  if (lead?.destination) tags.push(lead.destination.split(',')[0].trim());
  if (lead?.hotelCategory) tags.push(lead.hotelCategory);
  if (lead?.isHot || lead?.temperature === 'hot') tags.push('Hot');
  if (lead?.mealPreference) tags.push(lead.mealPreference);
  if (lead?.leadType === 'family' || (lead?.children > 0)) tags.push('Family');
  return [...new Set(tags)].slice(0, 6);
}

export function getUpcomingFollowUp(followups = []) {
  const pending = followups
    .filter((f) => f.status === 'pending' && f.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return pending[0] || null;
}

export const DETAIL_CARD =
  'rounded-[20px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]';

export const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'notes', label: 'Notes' },
  { id: 'documents', label: 'Documents' },
];

export function formatDetailMoney(amount) {
  if (amount === 0) return '₹0';
  if (!amount) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatCreatedOn(lead) {
  if (!lead?.createdAt) return '—';
  return new Date(lead.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTravelDateLabel(lead) {
  const start = lead?.travelDate || lead?.travelStartDate;
  if (!start) return '—';
  const label = new Date(start).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return lead?.flexibleDates ? `${label}` : label;
}

export function packageTypeLabel(lead) {
  if (lead?.packageName) return lead.packageName;
  const dest = lead?.destination || 'Himachal';
  const kids = Number(lead?.children || 0);
  const adults = Number(lead?.adults || lead?.travelers || 0);
  if (kids > 0 || adults >= 3) return `${dest} Family`;
  if (adults === 2) return `${dest} Couple`;
  return `${dest} Trip`;
}

export function travelersSummary(lead) {
  const adults = Number(lead?.adults ?? Math.max(0, (lead?.travelers || 0) - (lead?.children || 0)));
  const children = Number(lead?.children || 0);
  const pax = Number(lead?.travelers || adults + children);
  if (!pax && !adults) return { main: '—', sub: '' };
  const main = `${adults || pax} Adult${(adults || pax) === 1 ? '' : 's'}`;
  const bits = [];
  if (adults) bits.push(`${adults} Adult${adults === 1 ? '' : 's'}`);
  if (children) bits.push(`${children} Child${children === 1 ? '' : 'ren'}`);
  return { main, sub: bits.length ? `(${bits.join(', ')})` : '' };
}

export function scoreIntentLabel(score) {
  const n = Number(score) || 0;
  if (n >= 70) return 'High Intent';
  if (n >= 40) return 'Medium Intent';
  return 'Low Intent';
}

export function requirementItems(lead) {
  const raw = String(lead?.specialRequirements || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}
