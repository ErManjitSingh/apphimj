const mongoose = require('mongoose');

/**
 * Lightweight pointer-events for the handful of activities that have no other
 * persistent record: ActivityLog auto-deletes after 24h (see that model's TTL
 * index), and LeadActivity is scoped to a single lead. This collection never
 * duplicates full business records — just enough to render one timeline row.
 */
const EXEC_ACTIVITY_TYPES = [
  'login',
  'logout',
  'lead_viewed',
  'leads_list_opened',
  'module_opened',
  'booking_created',
  'booking_updated',
];

const executiveActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    type: { type: String, enum: EXEC_ACTIVITY_TYPES, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    module: { type: String, default: null },
    ip: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('ExecutiveActivityLog', executiveActivityLogSchema);
module.exports.EXEC_ACTIVITY_TYPES = EXEC_ACTIVITY_TYPES;
