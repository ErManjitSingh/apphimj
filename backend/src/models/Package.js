const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    meals: { type: String, default: '' },
    accommodation: { type: String, default: '' },
    hotel: { type: String, default: '' },
    activities: { type: String, default: '' },
    transport: { type: String, default: '' },
  },
  { _id: true }
);

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    durationLabel: { type: String, default: '' },
    startingPrice: { type: Number, default: 0 },
    packageType: { type: String, default: 'domestic', trim: true },
    packageCode: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    itinerary: [itineraryDaySchema],
    slug: { type: String, default: '' },
    destinationName: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    sourceType: {
      type: String,
      enum: ['local', 'uno_clone', 'uno_catalog'],
      default: 'local',
    },
    sourcePackageId: { type: String, default: null },
    sourceSlug: { type: String, default: null },
    /** List-shaped snapshot used by /uno-packages (no heavy itinerary). */
    listData: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Full mapped package used by quotation builder (itinerary, hotels, cabs, gallery, raw). */
    fullData: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawUno: { type: mongoose.Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

packageSchema.index({ sourceType: 1, sourceSlug: 1 });
packageSchema.index({ sourceType: 1, sourcePackageId: 1 });
packageSchema.index({ name: 1 });
packageSchema.index({ destination: 1 });

module.exports = mongoose.model('Package', packageSchema);
