const User = require('../models/User');
const Branch = require('../models/Branch');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Quotation = require('../models/Quotation');
const Booking = require('../models/Booking');
const Attendance = require('../models/Attendance');
const ActivityLog = require('../models/ActivityLog');
const LeadActivity = require('../models/LeadActivity');
const AuditLog = require('../models/AuditLog');
const CallNote = require('../models/CallNote');
const ExecutiveActivityLog = require('../models/ExecutiveActivityLog');
const UserSession = require('../models/UserSession');
const LeadEscalation = require('../models/LeadEscalation');
const LeadMergeLog = require('../models/LeadMergeLog');
const LeadTransferLog = require('../models/LeadTransferLog');
const LeadNote = require('../models/LeadNote');
const EmailLog = require('../models/EmailLog');
const EmailReply = require('../models/EmailReply');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const TripTask = require('../models/TripTask');
const TripDocument = require('../models/TripDocument');
const SupportTicket = require('../models/SupportTicket');
const Voucher = require('../models/Voucher');
const Package = require('../models/Package');

async function safeIndex(collection, spec, options) {
  try {
    await collection.createIndex(spec, options);
  } catch (err) {
    const conflict =
      err.code === 85 ||
      err.code === 86 ||
      /same name as the requested index/i.test(err.message);
    if (!conflict) throw err;
    const name =
      options?.name ||
      Object.entries(spec)
        .map(([key, value]) => `${key}_${value}`)
        .join('_');
    await collection.dropIndex(name).catch(() => {});
    await collection.createIndex(spec, options);
  }
}

async function ensureIndexes() {
  await Promise.all([
    safeIndex(User.collection, { email: 1 }, { unique: true, background: true }),
    safeIndex(Branch.collection, { code: 1 }, { unique: true, background: true }),
    safeIndex(User.collection, { role: 1, status: 1 }, { background: true }),
    safeIndex(User.collection, { branchId: 1, role: 1, status: 1 }, { background: true }),

    safeIndex(Lead.collection, { phone: 1 }, { background: true }),
    safeIndex(Lead.collection, { whatsapp: 1 }, { background: true, sparse: true }),
    safeIndex(Lead.collection, { branchId: 1, status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, leadScore: 1, budget: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, 'reactivation.isReactivated': 1, 'reactivation.stage': 1, updatedAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { assignedTo: 1, status: 1 }, { background: true }),
    safeIndex(Lead.collection, { destination: 1 }, { background: true }),
    safeIndex(Lead.collection, { createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { name: 'text', email: 'text', destination: 'text' }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, temperature: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, agingBucket: 1 }, { background: true }),
    safeIndex(Lead.collection, { alternatePhone: 1 }, { background: true, sparse: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, assignedTo: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, source: 1, status: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, slaBreached: 1, createdAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, assignedTo: 1, status: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, assignedTo: 1, isHot: 1, status: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, channel: 1, updatedAt: -1 }, { background: true }),
    safeIndex(Lead.collection, { budget: -1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, budget: -1 }, { background: true }),
    safeIndex(Lead.collection, { nextFollowUp: 1 }, { background: true, sparse: true }),
    safeIndex(Lead.collection, { branchId: 1, isDeleted: 1, nextFollowUp: 1 }, { background: true, sparse: true }),
    safeIndex(Lead.collection, { email: 1 }, { background: true, sparse: true }),
    safeIndex(LeadNote.collection, { lead: 1, createdAt: -1 }, { background: true }),
    safeIndex(LeadActivity.collection, { leadId: 1, createdAt: -1 }, { background: true }),
    safeIndex(LeadActivity.collection, { actorId: 1, createdAt: -1 }, { background: true }),
    safeIndex(AuditLog.collection, { entityType: 1, entityId: 1, createdAt: -1 }, { background: true }),
    safeIndex(CallNote.collection, { leadId: 1, createdAt: -1 }, { background: true }),
    safeIndex(CallNote.collection, { userId: 1, createdAt: -1 }, { background: true }),
    safeIndex(CallNote.collection, { branchId: 1, createdAt: -1 }, { background: true }),
    safeIndex(CallNote.collection, { branchId: 1, userId: 1, createdAt: -1 }, { background: true }),
    // Covers the "Connected" lead-list filter's CallNote.distinct('leadId', { outcome: {$in:[...]} })
    // as an index-only scan instead of a collection scan.
    safeIndex(CallNote.collection, { outcome: 1, leadId: 1 }, { background: true }),
    safeIndex(ExecutiveActivityLog.collection, { userId: 1, createdAt: -1 }, { background: true }),
    safeIndex(ExecutiveActivityLog.collection, { branchId: 1, createdAt: -1 }, { background: true }),
    safeIndex(ExecutiveActivityLog.collection, { branchId: 1, userId: 1, createdAt: -1 }, { background: true }),
    safeIndex(LeadEscalation.collection, { followUpId: 1, level: 1 }, { unique: true, background: true }),
    safeIndex(LeadMergeLog.collection, { targetLeadId: 1, createdAt: -1 }, { background: true }),
    safeIndex(LeadTransferLog.collection, { leadId: 1, createdAt: -1 }, { background: true }),

    safeIndex(FollowUp.collection, { scheduledAt: 1, status: 1 }, { background: true }),
    safeIndex(FollowUp.collection, { branchId: 1, status: 1, scheduledAt: 1 }, { background: true }),
    safeIndex(FollowUp.collection, { lead: 1, scheduledAt: -1 }, { background: true }),
    safeIndex(FollowUp.collection, { assignedTo: 1, status: 1, scheduledAt: 1 }, { background: true }),

    safeIndex(Quotation.collection, { lead: 1, status: 1 }, { background: true }),
    safeIndex(Quotation.collection, { branchId: 1, status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Quotation.collection, { status: 1, createdAt: -1 }, { background: true }),

    safeIndex(Booking.collection, { travelDate: 1, status: 1 }, { background: true }),
    safeIndex(Booking.collection, { branchId: 1, status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Booking.collection, { status: 1, createdAt: -1 }, { background: true }),
    safeIndex(Booking.collection, { branchId: 1, status: 1, travelDate: 1 }, { background: true }),
    safeIndex(Booking.collection, { branchId: 1, archivedAt: 1, createdAt: -1 }, { background: true }),
    safeIndex(TripTask.collection, { booking: 1, status: 1 }, { background: true }),
    safeIndex(TripTask.collection, { branchId: 1, status: 1, dueDate: 1 }, { background: true }),
    safeIndex(TripDocument.collection, { booking: 1, type: 1 }, { background: true }),
    safeIndex(SupportTicket.collection, { status: 1, updatedAt: -1 }, { background: true }),
    safeIndex(Voucher.collection, { booking: 1, type: 1 }, { background: true }),

    safeIndex(Attendance.collection, { userId: 1, date: 1 }, { unique: true, background: true }),
    safeIndex(ActivityLog.collection, { branchId: 1, createdAt: -1 }, { background: true }),
    safeIndex(ActivityLog.collection, { createdAt: 1 }, { expireAfterSeconds: 86400, background: true }),
    safeIndex(Attendance.collection, { date: 1, workMode: 1 }, { background: true }),
    safeIndex(Attendance.collection, { date: 1, status: 1 }, { background: true }),

    safeIndex(EmailLog.collection, { branchId: 1, leadId: 1, status: 1, sentAt: -1 }, { background: true }),
    safeIndex(EmailLog.collection, { branchId: 1, sentBy: 1, status: 1, sentAt: -1 }, { background: true }),
    safeIndex(EmailLog.collection, { branchId: 1, status: 1, sentAt: -1 }, { background: true }),
    safeIndex(EmailLog.collection, { branchId: 1, status: 1, createdAt: -1 }, { background: true }),
    safeIndex(EmailReply.collection, { branchId: 1, leadId: 1, receivedAt: -1 }, { background: true }),
    safeIndex(EmailReply.collection, { branchId: 1, receivedAt: -1 }, { background: true }),
    safeIndex(WhatsAppMessage.collection, { lead: 1, timestamp: -1 }, { background: true }),
    safeIndex(WhatsAppMessage.collection, { lead: 1, direction: 1, status: 1 }, { background: true }),
    safeIndex(Payment.collection, { branchId: 1, status: 1, paidAt: -1 }, { background: true }),
    safeIndex(Notification.collection, { user: 1, read: 1, createdAt: -1 }, { background: true }),
    safeIndex(Notification.collection, { user: 1, type: 1, 'meta.followUpId': 1 }, { background: true }),
    safeIndex(PushSubscription.collection, { user: 1 }, { background: true }),
    safeIndex(PushSubscription.collection, { endpoint: 1 }, { unique: true, background: true }),
    safeIndex(Quotation.collection, { createdByExecutive: 1, branchId: 1, status: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, status: 1, firstContactAt: 1, createdAt: 1 }, { background: true }),
    safeIndex(Lead.collection, { branchId: 1, assignedTo: 1, isDeleted: 1, priority: 1 }, { background: true }),
    safeIndex(FollowUp.collection, { status: 1, scheduledAt: 1 }, { background: true }),

    safeIndex(UserSession.collection, { userId: 1, loginAt: -1 }, { background: true }),
    safeIndex(UserSession.collection, { status: 1, lastActivityAt: 1 }, { background: true }),
    safeIndex(UserSession.collection, { status: 1, disconnectSignalAt: 1 }, { background: true }),
    safeIndex(UserSession.collection, { role: 1, status: 1, loginAt: 1 }, { background: true }),
    safeIndex(UserSession.collection, { branchId: 1, loginAt: -1 }, { background: true }),

    safeIndex(Package.collection, { sourceType: 1, sourceSlug: 1 }, { background: true }),
    safeIndex(Package.collection, { sourceType: 1, sourcePackageId: 1 }, { background: true }),
    safeIndex(Package.collection, { name: 1 }, { background: true }),
    safeIndex(Package.collection, { destination: 1 }, { background: true }),
  ]);

  console.log('[MongoDB] Performance indexes ensured');
}

module.exports = { ensureIndexes };
