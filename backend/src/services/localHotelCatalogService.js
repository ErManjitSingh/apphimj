const Hotel = require('../models/Hotel');
const Package = require('../models/Package');

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function normalizeKey(name = '', location = '') {
  return `${String(name).trim().toLowerCase()}|${String(location).trim().toLowerCase()}`;
}

function starCategory(starRating) {
  const stars = Math.round(toNumber(starRating, 0));
  if (stars >= 1 && stars <= 5) return `${stars} Star`;
  return 'Hotel';
}

function collectHotelCandidates(pkg = {}) {
  const destination =
    pkg.destinationName ||
    pkg.destination ||
    pkg.fullData?.destinationName ||
    pkg.fullData?.destination ||
    '';
  const full = pkg.fullData && typeof pkg.fullData === 'object' ? pkg.fullData : {};
  const candidates = [];

  const pushMeta = (meta, extra = {}) => {
    if (!meta || typeof meta !== 'object') return;
    const name = String(meta.name || meta.hotel_name || '').trim();
    if (!name) return;
    const location =
      String(meta.location || meta.city || meta.area || destination || 'India').trim() || 'India';
    const images = uniqueStrings([
      ...(Array.isArray(meta.images) ? meta.images : []),
      meta.image,
      meta.image_url,
      meta.featured_image,
      meta.thumbnail,
      meta.cover_image,
    ]);
    const price = toNumber(
      meta.absolutePerNight ??
        meta.includedRate ??
        meta.startingPrice ??
        meta.starting_price ??
        meta.price ??
        meta.price_delta,
      0
    );
    candidates.push({
      name,
      location,
      destination: String(destination || location).trim() || location,
      category: starCategory(meta.starRating || meta.star_rating || meta.stars),
      starRating: toNumber(meta.starRating || meta.star_rating || meta.stars, 0),
      roomType: String(meta.tierName || meta.room_type || meta.roomType || 'Standard').trim() || 'Standard',
      mealPlan: String(meta.meals || meta.mealPlan || meta.meal_plan || 'MAP').trim() || 'MAP',
      price,
      absolutePerNight: price,
      coverImage: images[0] || '',
      images,
      amenities: Array.isArray(meta.amenities) ? meta.amenities.filter(Boolean) : [],
      sourceHotelId: String(meta.hotelId || meta.hotel_id || meta.id || '').trim() || null,
      sourceSlug: String(meta.slug || meta.hotel_slug || '').trim() || null,
      packageId: pkg._id ? String(pkg._id) : null,
      packageName: pkg.name || full.name || '',
      packageSlug: pkg.slug || full.slug || '',
      ...extra,
    });
  };

  const itinerary = Array.isArray(full.itinerary)
    ? full.itinerary
    : Array.isArray(pkg.itinerary)
      ? pkg.itinerary
      : [];

  for (const day of itinerary) {
    if (day?.hotelMeta) pushMeta(day.hotelMeta);
    if (Array.isArray(day?.hotelOptions)) {
      for (const option of day.hotelOptions) pushMeta(option);
    }
  }

  const stays = Array.isArray(full.stays)
    ? full.stays
    : Array.isArray(full._apiRaw?.dayOptions?.stays)
      ? full._apiRaw.dayOptions.stays
      : [];

  for (const stay of stays) {
    if (stay?.hotel || stay?.hotel_name || stay?.name) {
      pushMeta({
        name: stay.hotel_name || stay.hotel || stay.name,
        city: stay.destination_city || stay.city,
        location: stay.location || stay.destination_city || stay.city,
        images: stay.images || [],
        image: stay.image || stay.featured_image,
        star_rating: stay.star_rating || stay.star_category,
        meals: stay.meal_plan || stay.meals,
        starting_price: stay.starting_price,
        room_type: stay.default_room_type_name,
        slug: stay.hotel_slug || stay.slug,
        hotel_id: stay.hotel_id || stay.id,
        amenities: stay.amenities,
      });
    }
    if (Array.isArray(stay?.hotel_options)) {
      for (const option of stay.hotel_options) pushMeta(option);
    }
  }

  return candidates;
}

function mergeCandidate(a, b) {
  return {
    ...a,
    ...b,
    images: uniqueStrings([...(a.images || []), ...(b.images || [])]),
    amenities: uniqueStrings([...(a.amenities || []), ...(b.amenities || [])]),
    price: Math.max(toNumber(a.price), toNumber(b.price)),
    absolutePerNight: Math.max(toNumber(a.absolutePerNight), toNumber(b.absolutePerNight)),
    starRating: Math.max(toNumber(a.starRating), toNumber(b.starRating)),
    coverImage: a.coverImage || b.coverImage || '',
    sourceHotelId: a.sourceHotelId || b.sourceHotelId,
    sourceSlug: a.sourceSlug || b.sourceSlug,
    packageRefs: uniqueStrings([
      ...(a.packageRefs || []),
      ...(b.packageRefs || []),
      a.packageSlug,
      b.packageSlug,
      a.packageName,
      b.packageName,
    ]),
  };
}

function buildHotelDoc(candidate) {
  const images = uniqueStrings(candidate.images || []);
  const price = toNumber(candidate.price || candidate.absolutePerNight, 0);
  return {
    name: candidate.name,
    destination: candidate.destination || candidate.location,
    location: candidate.location || candidate.destination || 'India',
    category: candidate.category || starCategory(candidate.starRating),
    starRating: toNumber(candidate.starRating, 0),
    roomType: candidate.roomType || 'Standard',
    mealPlan: candidate.mealPlan || 'MAP',
    price,
    absolutePerNight: toNumber(candidate.absolutePerNight || price, 0),
    coverImage: candidate.coverImage || images[0] || '',
    images,
    amenities: uniqueStrings(candidate.amenities || []),
    sourceHotelId: candidate.sourceHotelId || null,
    sourceSlug: candidate.sourceSlug || null,
    sourceType: 'catalog_import',
    packageRefs: uniqueStrings(candidate.packageRefs || [candidate.packageSlug, candidate.packageName]),
    roomTypes: candidate.roomType
      ? [{ name: candidate.roomType, maxOccupancy: 2, baseRate: price }]
      : [],
    status: 'active',
  };
}

async function upsertHotelCandidate(candidate) {
  const doc = buildHotelDoc(candidate);
  const or = [];
  if (doc.sourceHotelId) or.push({ sourceHotelId: doc.sourceHotelId });
  if (doc.sourceSlug) or.push({ sourceSlug: doc.sourceSlug });
  or.push({ name: doc.name, location: doc.location });

  const existing = await Hotel.findOne({ $or: or });
  if (existing) {
    existing.destination = doc.destination || existing.destination;
    existing.category = doc.category || existing.category;
    existing.starRating = Math.max(toNumber(existing.starRating), toNumber(doc.starRating));
    existing.roomType = doc.roomType || existing.roomType;
    existing.mealPlan = doc.mealPlan || existing.mealPlan;
    existing.price = Math.max(toNumber(existing.price), toNumber(doc.price));
    existing.absolutePerNight = Math.max(
      toNumber(existing.absolutePerNight),
      toNumber(doc.absolutePerNight)
    );
    existing.coverImage = existing.coverImage || doc.coverImage;
    existing.images = uniqueStrings([...(existing.images || []), ...doc.images]);
    existing.amenities = uniqueStrings([...(existing.amenities || []), ...doc.amenities]);
    existing.sourceHotelId = existing.sourceHotelId || doc.sourceHotelId;
    existing.sourceSlug = existing.sourceSlug || doc.sourceSlug;
    existing.sourceType = existing.sourceType || 'catalog_import';
    existing.packageRefs = uniqueStrings([...(existing.packageRefs || []), ...doc.packageRefs]);
    if (!existing.roomTypes?.length && doc.roomTypes?.length) {
      existing.roomTypes = doc.roomTypes;
    }
    existing.status = 'active';
    await existing.save();
    return { action: 'updated', hotel: existing };
  }

  const created = await Hotel.create(doc);
  return { action: 'created', hotel: created };
}

async function importHotelsFromPackages({ limit = 0 } = {}) {
  const query = Package.find({
    $or: [
      { sourceType: 'uno_catalog' },
      { sourceType: 'uno_clone' },
      { sourceType: 'local' },
      { 'fullData.itinerary.0': { $exists: true } },
    ],
  }).select('name slug destination destinationName fullData itinerary');

  if (limit > 0) query.limit(limit);
  const packages = await query.lean();

  const byKey = new Map();
  for (const pkg of packages) {
    for (const candidate of collectHotelCandidates(pkg)) {
      const key = normalizeKey(candidate.name, candidate.location);
      const prev = byKey.get(key);
      byKey.set(key, prev ? mergeCandidate(prev, candidate) : {
        ...candidate,
        packageRefs: uniqueStrings([candidate.packageSlug, candidate.packageName]),
      });
    }
  }

  let created = 0;
  let updated = 0;
  for (const candidate of byKey.values()) {
    const result = await upsertHotelCandidate(candidate);
    if (result.action === 'created') created += 1;
    else updated += 1;
  }

  return {
    packagesScanned: packages.length,
    hotelsFound: byKey.size,
    created,
    updated,
    total: created + updated,
  };
}

module.exports = {
  collectHotelCandidates,
  importHotelsFromPackages,
  upsertHotelCandidate,
};
