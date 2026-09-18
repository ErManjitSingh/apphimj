const mongoose = require('mongoose');

const mealRateSchema = new mongoose.Schema(
  {
    ep: { type: Number, default: 0 },
    cp: { type: Number, default: 0 },
    map: { type: Number, default: 0 },
    ap: { type: Number, default: 0 },
  },
  { _id: false }
);

const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    maxOccupancy: { type: Number, default: 2 },
    baseRate: { type: Number, default: 0 },
    bedType: { type: String, trim: true, default: '' },
    mealPlan: { type: String, trim: true, default: '' },
    rates: {
      ep: { type: Number, default: 0 },
      cp: { type: Number, default: 0 },
      map: { type: Number, default: 0 },
      ap: { type: Number, default: 0 },
      onSeason: { type: mealRateSchema, default: () => ({}) },
      offSeason: { type: mealRateSchema, default: () => ({}) },
    },
    extraBedRate: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    sourceRoomId: { type: String, default: null },
  },
  { _id: false }
);

const contractRateSchema = new mongoose.Schema(
  {
    season: { type: String, trim: true, default: 'standard' },
    roomType: { type: String, trim: true, default: '' },
    rate: { type: Number, default: 0 },
    mealPlan: { type: String, trim: true, default: '' },
    validFrom: Date,
    validTo: Date,
  },
  { _id: false }
);

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    destination: { type: String, trim: true, index: true },
    category: { type: String, default: '4 Star' },
    starRating: { type: Number, default: 0 },
    location: { type: String, required: true },
    address: { type: String, trim: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    roomTypes: [roomTypeSchema],
    roomType: { type: String, default: 'Standard' },
    mealPlan: { type: String, default: 'CP (Breakfast)' },
    price: { type: Number, default: 0 },
    absolutePerNight: { type: Number, default: 0 },
    coverImage: { type: String, default: '' },
    images: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    contractRates: [contractRateSchema],
    specialNotes: { type: String, trim: true, default: '' },
    sourceHotelId: { type: String, default: null, index: true },
    sourceSlug: { type: String, default: null, index: true },
    sourceType: {
      type: String,
      enum: ['local', 'catalog_import', 'manual'],
      default: 'local',
      index: true,
    },
    packageRefs: { type: [String], default: [] },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hotelSchema.index({ name: 'text', destination: 'text', location: 'text' });
hotelSchema.index({ name: 1, location: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
