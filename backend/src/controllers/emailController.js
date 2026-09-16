const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { queueLeadEmail, getLeadEmailHistory, assertCanAccessLead } = require('../services/emailSendService');
const { getEmailDashboardStats } = require('../services/emailStatsService');
const { isEmailConfigured } = require('../services/emailService');
const { pollInboxOnce, isInboxConfigured } = require('../services/emailInboxService');
const { listMailboxMessages, getMailboxMessage } = require('../services/emailMailboxService');
const {
  cacheService,
  mailboxListKey,
  MAILBOX_LIST_TTL_MS,
  invalidateMailboxCache,
} = require('../services/emailMailboxCache');
const { wantsFreshData } = require('../services/dashboardCacheService');
const channels = require('../config/channels');

const sendLeadEmail = asyncHandler(async (req, res) => {
  if (!channels.email) {
    throw new ApiError(410, 'Email is not connected on this CRM');
  }
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to send emails');
  }

  const result = await queueLeadEmail({
    req,
    leadId: req.params.id,
    payload: req.body,
  });

  res.status(202).json(result);
});

const listLeadEmailHistory = asyncHandler(async (req, res) => {
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to view email history');
  }

  await assertCanAccessLead(req, req.params.id);

  const history = await getLeadEmailHistory(req.params.id, {
    branchId: req.branchId,
    limit: Number(req.query.limit) || 30,
  });

  res.json(history);
});

const getEmailStats = asyncHandler(async (req, res) => {
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to view email stats');
  }

  const userId = req.user.role === 'sales_executive' ? req.user._id : null;
  const stats = await getEmailDashboardStats({ branchId: req.branchId, userId });
  res.json({ ...stats, configured: isEmailConfigured() });
});

const syncEmailReplies = asyncHandler(async (req, res) => {
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to sync email replies');
  }
  if (!isInboxConfigured()) {
    throw new ApiError(503, 'Email inbox is not configured for reply tracking');
  }
  const result = await pollInboxOnce();
  await invalidateMailboxCache();
  res.json({
    ok: result.ok !== false,
    message: result.imported
      ? `Synced ${result.imported} new reply(ies)`
      : 'Inbox synced — no new replies matched to leads',
    ...result,
  });
});

const getMailbox = asyncHandler(async (req, res) => {
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to view emails');
  }

  const params = {
    folder: req.query.folder || 'inbox',
    search: req.query.search || '',
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 50, 100),
  };

  const cacheKey = mailboxListKey(req.user._id, req.branchId, params);
  if (wantsFreshData(req)) {
    await cacheService.invalidate(cacheKey);
  }

  const data = await cacheService.getOrSet(
    cacheKey,
    () => listMailboxMessages(req, params),
    MAILBOX_LIST_TTL_MS
  );

  res.json({ ...data, configured: isEmailConfigured() });
});

const getMailboxMessageDetail = asyncHandler(async (req, res) => {
  if (!req.permissions?.email?.send) {
    throw new ApiError(403, 'You do not have permission to view emails');
  }

  const data = await getMailboxMessage(req, {
    type: req.params.type,
    id: req.params.id,
  });

  res.json(data);
});

module.exports = { sendLeadEmail, listLeadEmailHistory, getEmailStats, syncEmailReplies, getMailbox, getMailboxMessageDetail };
