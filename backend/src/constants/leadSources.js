/**
 * Canonical lead sources — keep FE/BE labels in sync via leadSourceLabels.
 */
const LEAD_SOURCE_KEYS = [
  'website',
  'website_2',
  'referral',
  'portal_lead',
  'call_lead',
];

/** Legacy keys still stored on old rows / accepted on write for migration */
const LEGACY_LEAD_SOURCE_KEYS = [
  'dpw',
  'dpw_wa',
  'dpw_call',
  'dpw2',
  'dpw2_wa',
  'dpw2_call',
  'organic',
  'google_ads',
  'facebook_ads',
  'whatsapp',
  'social',
  'phone',
  'walk-in',
  'other',
  'potal_lead',
];

const LEAD_SOURCE_ENUM = [...LEAD_SOURCE_KEYS, ...LEGACY_LEAD_SOURCE_KEYS];

const LEAD_SOURCE_LABELS = {
  website: 'Website',
  website_2: 'Website 2',
  referral: 'Referral',
  portal_lead: 'Portal Lead',
  call_lead: 'Call Lead',
  // legacy → display
  dpw: 'Website',
  dpw_wa: 'Website',
  dpw_call: 'Call Lead',
  dpw2: 'Website 2',
  dpw2_wa: 'Website 2',
  dpw2_call: 'Call Lead',
  organic: 'Website',
  google_ads: 'Website',
  facebook_ads: 'Portal Lead',
  whatsapp: 'Website',
  social: 'Website 2',
  phone: 'Call Lead',
  'walk-in': 'Call Lead',
  other: 'Website',
  potal_lead: 'Portal Lead',
};

/** Map any wizard / ingest / legacy value → canonical storage key */
const LEAD_SOURCE_ALIASES = {
  website: 'website',
  dpw: 'website',
  google_ads: 'website',
  google: 'website',
  'google ads': 'website',
  organic: 'website',
  other: 'website',
  dpw_wa: 'website',
  'dpw wa': 'website',
  google_whatsapp: 'website',
  landing_whatsapp: 'website',
  whatsapp: 'website',
  wa: 'website',

  website_2: 'website_2',
  website2: 'website_2',
  'website 2': 'website_2',
  dpw2: 'website_2',
  social: 'website_2',
  dpw2_wa: 'website_2',
  'dpw2 wa': 'website_2',

  referral: 'referral',

  portal_lead: 'portal_lead',
  potal_lead: 'portal_lead',
  'portal lead': 'portal_lead',
  'potal lead': 'portal_lead',
  portal: 'portal_lead',
  facebook_ads: 'portal_lead',
  facebook: 'portal_lead',
  fb: 'portal_lead',
  instagram: 'portal_lead',
  ig: 'portal_lead',
  meta: 'portal_lead',
  facebook_whatsapp: 'portal_lead',
  fb_wa: 'portal_lead',
  fb_whatsapp: 'portal_lead',
  ctwa: 'portal_lead',
  meta_whatsapp: 'portal_lead',

  call_lead: 'call_lead',
  'call lead': 'call_lead',
  phone: 'call_lead',
  call: 'call_lead',
  dpw_call: 'call_lead',
  'dpw call': 'call_lead',
  dpwcall: 'call_lead',
  google_call: 'call_lead',
  dpw2_call: 'call_lead',
  'dpw2 call': 'call_lead',
  dpw2call: 'call_lead',
  facebook_call: 'call_lead',
  fb_call: 'call_lead',
  'walk-in': 'call_lead',
  walk_in: 'call_lead',
  walkin: 'call_lead',
};

function normalizeLeadSourceKey(raw) {
  if (raw == null || raw === '') return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_');
}

function resolveLeadSourceKey(raw, fallback = 'website') {
  const key = normalizeLeadSourceKey(raw);
  if (!key) return fallback;
  if (LEAD_SOURCE_ALIASES[key]) return LEAD_SOURCE_ALIASES[key];
  const spaced = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (LEAD_SOURCE_ALIASES[spaced]) return LEAD_SOURCE_ALIASES[spaced];
  if (LEAD_SOURCE_KEYS.includes(key)) return key;
  return fallback;
}

function leadSourceLabel(key) {
  const resolved = resolveLeadSourceKey(key, key);
  return LEAD_SOURCE_LABELS[resolved] || LEAD_SOURCE_LABELS[key] || 'Website';
}

const LEAD_SOURCE_OPTIONS = LEAD_SOURCE_KEYS.map((value) => ({
  value,
  label: LEAD_SOURCE_LABELS[value],
}));

function expandLeadSourceFilter(raw) {
  if (!raw) return raw;
  const canonical = resolveLeadSourceKey(raw, '');
  const keys = new Set([String(raw).trim()]);
  if (canonical) keys.add(canonical);
  for (const stored of LEAD_SOURCE_ENUM) {
    if (resolveLeadSourceKey(stored, '') === canonical) keys.add(stored);
  }
  const list = [...keys].filter(Boolean);
  return list.length <= 1 ? list[0] : { $in: list };
}

module.exports = {
  LEAD_SOURCE_KEYS,
  LEGACY_LEAD_SOURCE_KEYS,
  LEAD_SOURCE_ENUM,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ALIASES,
  LEAD_SOURCE_OPTIONS,
  normalizeLeadSourceKey,
  resolveLeadSourceKey,
  leadSourceLabel,
  expandLeadSourceFilter,
};
