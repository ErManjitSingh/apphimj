const {
  LEAD_SOURCE_KEYS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ALIASES,
  resolveLeadSourceKey,
  leadSourceLabel,
  normalizeLeadSourceKey,
} = require('../constants/leadSources');

const SOURCE_SHORT = { ...LEAD_SOURCE_LABELS };

function getLeadSourceShortLabel(source, sourceLabel) {
  const explicit = String(sourceLabel || '').trim();
  if (explicit) {
    const resolvedFromLabel = resolveLeadSourceKey(explicit, '');
    if (resolvedFromLabel && LEAD_SOURCE_KEYS.includes(resolvedFromLabel)) {
      return LEAD_SOURCE_LABELS[resolvedFromLabel];
    }
  }

  const key = resolveLeadSourceKey(source || '', '');
  if (key && SOURCE_SHORT[key]) return SOURCE_SHORT[key];
  if (explicit) return leadSourceLabel(explicit);
  return SOURCE_SHORT.website;
}

module.exports = {
  SOURCE_SHORT,
  getLeadSourceShortLabel,
  normalizeSourceKey: normalizeLeadSourceKey,
  LEAD_SOURCE_ALIASES,
  leadSourceLabel,
};
