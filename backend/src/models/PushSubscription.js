const mongoose = require('mongoose');

/**
 * One document per device/browser Web Push registration — a user can have many (see
 * services/webPushService.js sendPushToUser). `endpoint` is the browser-assigned push URL,
 * naturally unique per device+browser install, so it's the upsert/idempotency key: re-subscribing
 * (multiple tabs, re-login, a shared device changing hands) updates the same row instead of
 * creating a duplicate, and reassigns `user` to whoever is currently authenticated on it.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, trim: true, default: '' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
