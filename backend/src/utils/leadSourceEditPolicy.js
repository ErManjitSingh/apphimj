const ApiError = require('./apiError');
const { resolveLeadSourceKey, leadSourceLabel } = require('../constants/leadSources');

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function currentSourceKey(lead = {}) {
  return (
    resolveLeadSourceKey(lead.source, lead.sourceLabel || lead.leadSource) ||
    String(lead.source || lead.leadSource || '').trim().toLowerCase()
  );
}

function incomingSourceKey(body = {}, data = {}) {
  if (data.source) return String(data.source).trim().toLowerCase();
  const raw = body.leadSource || body.source || '';
  return resolveLeadSourceKey(raw, body.sourceLabel) || String(raw).trim().toLowerCase();
}

/**
 * On lead update: only admin may change source / leadSource.
 * Sales executives may set source when creating a lead; assigned queries stay locked.
 */
function applyLeadSourceEditPolicy(user, lead, body, data) {
  if (!data || !lead || user?.role === 'admin' || user?.role === 'super_admin') return;

  const touched =
    hasOwn(body, 'source') || hasOwn(body, 'leadSource') || hasOwn(body, 'sourceLabel');
  if (!touched) return;

  const prevKey = currentSourceKey(lead);
  const nextKey = incomingSourceKey(body, data);

  if (nextKey && prevKey && nextKey !== prevKey) {
    throw new ApiError(
      403,
      'Only admin can change lead source. Ask admin to update it if this query was assigned to you.'
    );
  }

  delete data.source;
  delete data.leadSource;
  delete data.sourceLabel;
}

function sourceFieldsForRestore(sourceKey, sourceLabelHint = '') {
  const key = resolveLeadSourceKey(sourceKey, sourceLabelHint) || sourceKey;
  return {
    source: key,
    leadSource: key,
    sourceLabel: sourceLabelHint || leadSourceLabel(key) || key,
  };
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

/**
 * On lead update: only admin may change primary client phone.
 * Alternate phone can still be added/updated by sales / managers.
 */
function applyPrimaryPhoneEditPolicy(user, lead, body, data) {
  if (!data || !lead || user?.role === 'admin' || user?.role === 'super_admin') return;

  const touched = hasOwn(body, 'phone') || data.phone != null;
  if (!touched) return;

  const prev = phoneDigits(lead.phone);
  const next = phoneDigits(data.phone ?? body.phone);
  if (next && prev && next !== prev) {
    throw new ApiError(
      403,
      'Only admin can change the primary contact number. You can add another number in Alternate phone.'
    );
  }

  delete data.phone;
}

module.exports = {
  applyLeadSourceEditPolicy,
  applyPrimaryPhoneEditPolicy,
  sourceFieldsForRestore,
  currentSourceKey,
};
