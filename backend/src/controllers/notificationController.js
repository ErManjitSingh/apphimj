const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { formatNotification } = require('../utils/queryHelpers');
const { emitUnreadCount } = require('../services/notificationService');
const { publicKey: vapidPublicKey } = require('../config/webPush');

const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json(notifications.map(formatNotification));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ count });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification id');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true },
    { new: true }
  ).lean();

  if (!notification) throw new ApiError(404, 'Notification not found');

  try {
    await emitUnreadCount(req.user._id);
  } catch (err) {
    console.error('[notifications] emit unread failed:', err.message);
  }

  res.json(formatNotification(notification));
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  try {
    await emitUnreadCount(req.user._id);
  } catch (err) {
    console.error('[notifications] emit unread failed:', err.message);
  }
  res.json({ message: 'All notifications marked as read' });
});

/** Public by design — VAPID public keys are meant to be given to the browser's PushManager. */
const getPushPublicKey = asyncHandler(async (req, res) => {
  res.json({ publicKey: vapidPublicKey || null });
});

/**
 * Register (or re-register) this device/browser for push. Upsert by endpoint — the same browser
 * install always yields the same endpoint, so a second tab or a re-login on the same device
 * updates one row instead of creating a duplicate, and reassigns it to whoever is now logged in
 * (handles a shared device changing hands between users).
 */
const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ApiError(400, 'A valid push subscription (endpoint + keys) is required');
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: req.user._id,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ ok: true });
});

/** Called on logout so a signed-out device stops receiving this user's pushes. */
const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) throw new ApiError(400, 'endpoint is required');
  await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  res.json({ ok: true });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
};
