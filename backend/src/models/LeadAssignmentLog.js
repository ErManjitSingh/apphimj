const mongoose = require('mongoose');

const ASSIGNMENT_TYPES = [
  'destination_match',
  'fallback_queue',
  'skill_match',
  'sales_manager_queue',
  'manual',
  'self',
  'unassigned',
];

const leadAssignmentLogSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    leadDestination: { type: String, trim: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    destinationName: { type: String, trim: true },
    leadType: { type: String, enum: ['fit', 'group', 'corporate', 'family', 'honeymoon'], index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String, trim: true },
    assignmentType: { type: String, enum: ASSIGNMENT_TYPES, required: true, index: true },
    success: { type: Boolean, default: true },
    reason: { type: String, trim: true, default: '' },
    ruleSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leadAssignmentLogSchema.index({ createdAt: -1 });
leadAssignmentLogSchema.index({ branchId: 1, createdAt: -1 });

module.exports = mongoose.model('LeadAssignmentLog', leadAssignmentLogSchema);
module.exports.ASSIGNMENT_TYPES = ASSIGNMENT_TYPES;
