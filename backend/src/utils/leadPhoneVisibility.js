/**
 * Lead phone visibility helpers.
 *
 * Phones are shown to admin and sales roles (sales_executive, sales_manager, team_leader).
 * Call-gating / XXXX masking is disabled — numbers stay visible on list, detail, dashboard,
 * export, and duplicate-check surfaces.
 */

const PHONE_PROTECTED_FIELDS = ['phone', 'alternatePhone', 'whatsapp'];

const PHONE_ALWAYS_VISIBLE_ROLES = new Set([
  'admin',
  'sales_executive',
  'sales_manager',
  'team_leader',
]);

function canViewerSeePhone(role) {
  if (!role) return true;
  return PHONE_ALWAYS_VISIBLE_ROLES.has(String(role));
}

/**
 * Mark leads as phone-visible. Kept for call-site compatibility; no longer queries CallNote.
 */
async function attachPhoneVisibility(leadOrList, options = {}) {
  const list = Array.isArray(leadOrList) ? leadOrList : [leadOrList].filter(Boolean);
  const visible = canViewerSeePhone(options.viewerRole);
  list.forEach((lead) => {
    lead.phoneVisible = visible;
    if (visible) {
      lead.phoneMasked = false;
    }
  });
  return leadOrList;
}

/**
 * Previously masked phone fields as 'XXXX' until first CallNote. Now a no-op for sales/admin.
 */
function maskLeadPhone(lead, options = {}) {
  if (!lead) return lead;
  if (canViewerSeePhone(options.viewerRole) || lead.phoneVisible !== false) {
    lead.phoneVisible = true;
    lead.phoneMasked = false;
    return lead;
  }
  const masked = { ...lead };
  PHONE_PROTECTED_FIELDS.forEach((field) => {
    if (masked[field]) masked[field] = 'XXXX';
  });
  masked.phoneMasked = true;
  return masked;
}

async function applyPhoneVisibilityGate(leadOrList, options = {}) {
  if (!leadOrList) return leadOrList;
  await attachPhoneVisibility(leadOrList, options);
  if (canViewerSeePhone(options.viewerRole)) {
    return leadOrList;
  }
  return Array.isArray(leadOrList)
    ? leadOrList.map((lead) => maskLeadPhone(lead, options))
    : maskLeadPhone(leadOrList, options);
}

module.exports = {
  PHONE_PROTECTED_FIELDS,
  PHONE_ALWAYS_VISIBLE_ROLES,
  canViewerSeePhone,
  attachPhoneVisibility,
  maskLeadPhone,
  applyPhoneVisibilityGate,
};
