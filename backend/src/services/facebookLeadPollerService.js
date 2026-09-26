/**
 * Backup poller for Meta Lead Ads when webhooks are delayed/missing.
 * Pulls recent form leads via Graph and ingests any not already in CRM.
 */
const {
  getConfig,
  isConfigured,
  ingestFacebookLeadgen,
  probePageTokenHealth,
} = require('./facebookLeadWebhookService');

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v21.0';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '183028372389367';
const POLL_MS = Math.max(
  15_000,
  Number(process.env.FACEBOOK_LEAD_POLL_MS || 30_000) || 30_000
);
const LOOKBACK_MS = Math.max(
  15 * 60_000,
  Number(process.env.FACEBOOK_LEAD_POLL_LOOKBACK_MS || 3 * 60 * 60_000) || 3 * 60 * 60_000
);
const PER_FORM_LIMIT = Math.min(
  50,
  Math.max(5, Number(process.env.FACEBOOK_LEAD_POLL_LIMIT || 15) || 15)
);

let pollTimer = null;
let polling = false;
let lastSummary = null;

async function graphGet(path, params = {}) {
  const { pageAccessToken } = getConfig();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  url.searchParams.set('access_token', pageAccessToken);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data?.error?.message || `HTTP ${res.status}`).replace(
      /EAA[A-Za-z0-9]+/g,
      '[TOKEN_REDACTED]'
    );
    const err = new Error(msg);
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

async function pollFacebookLeadsOnce() {
  if (polling) return { ok: false, reason: 'already_polling' };
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };

  polling = true;
  const started = Date.now();
  const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const stats = {
    forms: 0,
    scanned: 0,
    created: 0,
    duplicates: 0,
    errors: 0,
    tokenOk: false,
  };

  try {
    const health = await probePageTokenHealth();
    stats.tokenOk = Boolean(health.ok);
    if (!health.ok) {
      lastSummary = {
        at: new Date().toISOString(),
        ...stats,
        error: health.error,
        ms: Date.now() - started,
      };
      console.error('[facebookLeadPoller] token unhealthy:', health.error);
      return { ok: false, reason: 'token_unhealthy', ...stats, error: health.error };
    }

    const forms = await graphGet(`/${PAGE_ID}/leadgen_forms`, {
      fields: 'id,name,status',
      limit: '50',
    });
    const formList = Array.isArray(forms.data) ? forms.data : [];
    stats.forms = formList.length;

    for (const form of formList) {
      if (form.status && String(form.status).toUpperCase() === 'ARCHIVED') continue;
      let leads;
      try {
        leads = await graphGet(`/${form.id}/leads`, {
          fields: 'id,created_time,ad_id,adset_id,form_id',
          limit: String(PER_FORM_LIMIT),
        });
      } catch (err) {
        stats.errors += 1;
        console.error('[facebookLeadPoller] form leads failed', form.id, err.message);
        continue;
      }

      for (const lead of leads.data || []) {
        const created = lead.created_time ? new Date(lead.created_time).getTime() : 0;
        if (created && created < Date.now() - LOOKBACK_MS) continue;
        stats.scanned += 1;
        try {
          const result = await ingestFacebookLeadgen({
            leadgenId: String(lead.id),
            pageId: PAGE_ID,
            formId: String(lead.form_id || form.id || ''),
            adId: lead.ad_id ? String(lead.ad_id) : '',
            adgroupId: lead.adset_id ? String(lead.adset_id) : '',
            createdTime: lead.created_time || null,
          });
          if (result.duplicate) stats.duplicates += 1;
          else {
            stats.created += 1;
            console.log(
              '[facebookLeadPoller] ingested',
              lead.id,
              result.lead?.leadId || result.lead?._id
            );
          }
        } catch (err) {
          stats.errors += 1;
          console.error('[facebookLeadPoller] ingest failed', lead.id, err.message);
        }
      }
    }

    lastSummary = {
      at: new Date().toISOString(),
      sinceIso,
      ...stats,
      ms: Date.now() - started,
    };
    if (stats.created > 0 || stats.errors > 0) {
      console.log('[facebookLeadPoller]', JSON.stringify(lastSummary));
    }
    return { ok: true, ...stats };
  } catch (err) {
    lastSummary = {
      at: new Date().toISOString(),
      ...stats,
      error: err.message,
      ms: Date.now() - started,
    };
    console.error('[facebookLeadPoller] poll failed:', err.message);
    return { ok: false, ...stats, error: err.message };
  } finally {
    polling = false;
  }
}

function startFacebookLeadPoller() {
  if (!isConfigured()) {
    console.log('[facebookLeadPoller] Disabled — FACEBOOK_* env incomplete');
    return;
  }
  if (pollTimer) return;
  console.log(
    `[facebookLeadPoller] Starting (every ${Math.round(POLL_MS / 1000)}s, lookback ${Math.round(LOOKBACK_MS / 60000)}m)`
  );
  pollFacebookLeadsOnce().catch((err) =>
    console.error('[facebookLeadPoller] Initial poll failed:', err.message)
  );
  pollTimer = setInterval(() => {
    pollFacebookLeadsOnce().catch((err) =>
      console.error('[facebookLeadPoller] Scheduled poll failed:', err.message)
    );
  }, POLL_MS);
}

function getPollerStatus() {
  return {
    running: Boolean(pollTimer),
    pollMs: POLL_MS,
    lookbackMs: LOOKBACK_MS,
    pageId: PAGE_ID,
    lastSummary,
  };
}

module.exports = {
  pollFacebookLeadsOnce,
  startFacebookLeadPoller,
  getPollerStatus,
};
