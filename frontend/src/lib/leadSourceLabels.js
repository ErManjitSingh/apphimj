/** Short labels for lead source — keep in sync with backend leadSources + leadSourceLabels */

export const LEAD_SOURCE_KEYS = [
  'website',
  'website_2',
  'referral',
  'portal_lead',
  'call_lead',
  'whatsapp',
];

const SOURCE_SHORT = {
  website: 'Website',
  website_2: 'Website 2',
  referral: 'Referral',
  portal_lead: 'Portal Lead',
  call_lead: 'Call Lead',
  whatsapp: 'WhatsApp',
  dpw: 'Website',
  dpw_wa: 'WhatsApp',
  dpw_call: 'Call Lead',
  dpw2: 'Website 2',
  dpw2_wa: 'WhatsApp',
  dpw2_call: 'Call Lead',
  organic: 'Website',
  google_ads: 'Website',
  facebook_ads: 'Website 2',
  social: 'Website 2',
  phone: 'Call Lead',
  'walk-in': 'Call Lead',
  other: 'Website',
  potal_lead: 'Portal Lead',
};

const ALIASES = {
  website: 'website',
  dpw: 'website',
  google_ads: 'website',
  google: 'website',
  organic: 'website',
  other: 'website',
  website_2: 'website_2',
  website2: 'website_2',
  'website 2': 'website_2',
  dpw2: 'website_2',
  social: 'website_2',
  facebook_ads: 'website_2',
  facebook: 'website_2',
  meta: 'website_2',
  instagram: 'website_2',
  referral: 'referral',
  portal_lead: 'portal_lead',
  potal_lead: 'portal_lead',
  'portal lead': 'portal_lead',
  'potal lead': 'portal_lead',
  portal: 'portal_lead',
  call_lead: 'call_lead',
  'call lead': 'call_lead',
  phone: 'call_lead',
  call: 'call_lead',
  dpw_call: 'call_lead',
  dpw2_call: 'call_lead',
  'walk-in': 'call_lead',
  walk_in: 'call_lead',
  whatsapp: 'whatsapp',
  wa: 'whatsapp',
  'whats app': 'whatsapp',
  dpw_wa: 'whatsapp',
  dpw2_wa: 'whatsapp',
  ctwa: 'whatsapp',
  facebook_whatsapp: 'whatsapp',
  meta_whatsapp: 'whatsapp',
};

function normalizeSourceKey(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function resolveKey(raw) {
  const key = normalizeSourceKey(raw);
  if (!key) return '';
  if (ALIASES[key]) return ALIASES[key];
  if (LEAD_SOURCE_KEYS.includes(key)) return key;
  const spaced = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (ALIASES[spaced]) return ALIASES[spaced];
  if (ALIASES[spaced.replace(/ /g, '_')]) return ALIASES[spaced.replace(/ /g, '_')];
  return '';
}

/** Canonical source key or '' */
export function resolveLeadSourceKey(source, sourceLabel) {
  return resolveKey(sourceLabel) || resolveKey(source) || '';
}

/**
 * Channel for UI icons: whatsapp | call | form | other
 */
export function getLeadSourceChannel(source, sourceLabel) {
  const key = resolveLeadSourceKey(source, sourceLabel);
  if (key === 'whatsapp') return 'whatsapp';
  if (key === 'call_lead') return 'call';
  if (key === 'website' || key === 'website_2' || key === 'portal_lead') return 'form';

  const blob = `${source || ''} ${sourceLabel || ''}`.toLowerCase();
  if (/(^|[\s_])wa([\s_]|$)|whatsapp|ctwa/.test(blob)) return 'whatsapp';
  if (/\bcall\b|phone|walk[\s_-]?in/.test(blob)) return 'call';
  if (/website|portal|facebook|instagram|form|google/.test(blob)) return 'form';
  return 'other';
}

export function getLeadSourceShortLabel(source, sourceLabel) {
  const explicit = String(sourceLabel || '').trim();
  if (explicit) {
    const fromLabel = resolveKey(explicit);
    if (fromLabel && SOURCE_SHORT[fromLabel]) return SOURCE_SHORT[fromLabel];
  }

  const key = resolveKey(source);
  if (key && SOURCE_SHORT[key]) return SOURCE_SHORT[key];

  const label = explicit.toLowerCase();
  if (label.includes('whatsapp') || label === 'wa') return 'WhatsApp';
  if (label.includes('website 2') || label.includes('website_2')) return 'Website 2';
  if (label.includes('website')) return 'Website';
  if (label.includes('portal') || label.includes('potal')) return 'Portal Lead';
  if (label.includes('call')) return 'Call Lead';
  if (label.includes('referral')) return 'Referral';

  return SOURCE_SHORT.website;
}

export const LEAD_SOURCE_FILTER_OPTIONS = [
  { value: '', label: 'All sources' },
  ...LEAD_SOURCE_KEYS.map((value) => ({ value, label: SOURCE_SHORT[value] })),
];

export { SOURCE_SHORT };
