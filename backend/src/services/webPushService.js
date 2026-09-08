const { webpush, isConfigured } = require('../config/webPush');
const PushSubscription = require('../models/PushSubscription');

/**
 * Send one notification to EVERY device this user has registered — the fan-out that makes
 * "User → many subscriptions" real. One query for all of a user's subscriptions (never N+1 across
 * users), then one webpush.sendNotification per device in parallel.
 *
 * A 410 (Gone) or 404 (Not Found) response is the push service's documented way of saying an
 * endpoint is dead (browser uninstalled, permission revoked, storage cleared, etc.) — that
 * subscription is deleted so a genuinely unreachable device never gets retried. Any other error
 * (e.g. transient network failure) is only logged, since it doesn't mean the endpoint is invalid.
 */
async function sendPushToUser(userId, { title, body, href, tag } = {}) {
  if (!isConfigured || !userId || !title) return;

  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title,
    body: body || '',
    href: href || '/',
    tag: tag || undefined,
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          console.error('[WebPush] send failed', sub.endpoint, err.statusCode || err.message);
        }
      }
    })
  );
}

module.exports = { sendPushToUser };
