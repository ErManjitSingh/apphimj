const { LEAD_SKILL_TYPES, GROUP_PAX_THRESHOLD } = require('../config/leadSkills');

const CORPORATE_KEYWORDS = [
  'corporate',
  'company',
  'business',
  'mice',
  'conference',
  'incentive',
  'hr ',
  ' ltd',
  ' pvt',
  ' private limited',
];

function normalizeLeadType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'fit') return 'fit';
  if (raw === 'group') return 'group';
  if (raw === 'corporate') return 'corporate';
  if (raw === 'family') return 'family';
  if (raw === 'honeymoon') return 'honeymoon';
  return null;
}

function detectLeadType(payload = {}) {
  const manual = normalizeLeadType(payload.leadType);
  if (manual) {
    return { leadType: manual, leadTypeSource: 'manual', confidence: 'high' };
  }

  const text = [
    payload.companyName,
    payload.notes,
    payload.specialRequirements,
    payload.requirements,
    payload.transportRequirement,
    payload.sourceLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (CORPORATE_KEYWORDS.some((kw) => text.includes(kw))) {
    return { leadType: 'corporate', leadTypeSource: 'auto', confidence: 'high' };
  }

  const adults = Number(payload.adults) || 0;
  const children = Number(payload.children) || 0;
  const travelers = Number(payload.travelers) || adults + children || 1;
  const pax = Math.max(travelers, adults + children);

  if (pax >= GROUP_PAX_THRESHOLD) {
    return { leadType: 'group', leadTypeSource: 'auto', confidence: 'high' };
  }

  if (Number(payload.budget) >= 500000 && pax >= 6) {
    return { leadType: 'group', leadTypeSource: 'auto', confidence: 'medium' };
  }

  return { leadType: 'fit', leadTypeSource: 'auto', confidence: 'default' };
}

function isValidLeadType(value) {
  return LEAD_SKILL_TYPES.includes(value);
}

module.exports = {
  detectLeadType,
  normalizeLeadType,
  isValidLeadType,
  LEAD_SKILL_TYPES,
};
