const mongoose = require('mongoose');

/** `manual` is the only source implemented today — the field exists so future
 * ad-platform syncs (Meta/Google/LinkedIn) can write rows without a schema change. */
const MARKETING_SPEND_SOURCES = ['manual', 'meta_ads', 'google_ads', 'linkedin_ads'];

const marketingSpendSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    channel: { type: String, required: true, trim: true, maxlength: 80 },
    campaign: { type: String, trim: true, maxlength: 120, default: '' },
    amount: { type: Number, required: true, min: 0.01 },
    spendDate: { type: Date, required: true },
    source: { type: String, enum: MARKETING_SPEND_SOURCES, default: 'manual' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

marketingSpendSchema.index({ branchId: 1, isDeleted: 1, spendDate: -1 });
marketingSpendSchema.index({ isDeleted: 1, spendDate: -1 });
marketingSpendSchema.index({ channel: 1, isDeleted: 1 });

module.exports = mongoose.model('MarketingSpend', marketingSpendSchema);
module.exports.MARKETING_SPEND_SOURCES = MARKETING_SPEND_SOURCES;
