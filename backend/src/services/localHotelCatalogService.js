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

function normalizeMealRates(raw = {}, fallback = {}) {
  return {
    ep: toNumber(raw.ep ?? fallback.ep, 0),
    cp: toNumber(raw.cp ?? fallback.cp, 0),
    map: toNumber(raw.map ?? fallback.map, 0),
    ap: toNumber(raw.ap ?? fallback.ap, 0),
  };
}

function normalizeRoomRates(raw = {}) {
  const flat = normalizeMealRates(raw);
  const onSeason = normalizeMealRates(raw.onSeason, flat);
  const offSeason = normalizeMealRates(raw.offSeason, flat);
  return {
    ...flat,
    onSeason,
    offSeason,
  };
}

function maxMealRates(a = {}, b = {}) {
  return {
    ep: Math.max(toNumber(a.ep, 0), toNumber(b.ep, 0)),
    cp: Math.max(toNumber(a.cp, 0), toNumber(b.cp, 0)),
    map: Math.max(toNumber(a.map, 0), toNumber(b.map, 0)),
    ap: Math.max(toNumber(a.ap, 0), toNumber(b.ap, 0)),
  };
}

function mergeRoomTypes(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const room of list || []) {
      const name = String(room?.name || '').trim();
      if (!name) continue;
      const sourceId = String(room.sourceRoomId || '').trim();
      const key = sourceId ? `id:${sourceId}` : `name:${name.toLowerCase()}`;
      const rates = normalizeRoomRates(room.rates || {});
      const images = uniqueStrings(room.images || []);
      const incoming = {
        name,
        maxOccupancy: toNumber(room.maxOccupancy, 2) || 2,
        baseRate: toNumber(room.baseRate, 0),
        bedType: String(room.bedType || '').trim(),
        mealPlan: String(room.mealPlan || '').trim(),
        rates,
        extraBedRate: toNumber(room.extraBedRate, 0),
        images,
        sourceRoomId: sourceId || null,
      };
      const prev = map.get(key);
      if (!prev) {
        map.set(key, incoming);
        continue;
      }
      const mergedFlat = maxMealRates(prev.rates, incoming.rates);
      map.set(key, {
        name: prev.name || incoming.name,
        maxOccupancy: Math.max(prev.maxOccupancy || 2, incoming.maxOccupancy || 2),
        baseRate: Math.max(prev.baseRate || 0, incoming.baseRate || 0),
        bedType: prev.bedType || incoming.bedType,
        mealPlan: prev.mealPlan || incoming.mealPlan,
        rates: {
          ...mergedFlat,
          onSeason: maxMealRates(prev.rates?.onSeason, incoming.rates?.onSeason),
          offSeason: maxMealRates(prev.rates?.offSeason, incoming.rates?.offSeason),
        },
        extraBedRate: Math.max(prev.extraBedRate || 0, incoming.extraBedRate || 0),
        images: uniqueStrings([...(prev.images || []), ...(incoming.images || [])]),
        sourceRoomId: prev.sourceRoomId || incoming.sourceRoomId,
      });
    }
  }
  return [...map.values()];
}

function extractRoomTypes(meta = {}, fallbackPrice = 0) {
  const rooms = [];

  const pushRoom = (raw = {}, extras = {}) => {
    if (!raw || typeof raw !== 'object') return;
    const name = String(
      raw.name || raw.tierName || raw.room_type || raw.roomType || extras.name || ''
    ).trim();
    if (!name) return;
    const rates = normalizeRoomRates(raw.rates && typeof raw.rates === 'object' ? raw.rates : {});
    const baseRate = toNumber(
      raw.pricePerNight ??
        raw.baseRate ??
        raw.absolutePrice ??
        raw.absolutePerNight ??
        rates.map ??
        rates.cp ??
        extras.price ??
        fallbackPrice,
      0
    );
    rooms.push({
      name,
      maxOccupancy: toNumber(raw.maxOccupancy ?? raw.max_occupancy ?? extras.maxOccupancy, 2) || 2,
      baseRate,
      bedType: String(raw.bedType || raw.bed_type || extras.bedType || '').trim(),
      mealPlan: String(raw.mealPlan || raw.meals || extras.mealPlan || '').trim(),
      rates,
      extraBedRate: toNumber(raw.extraBedRate ?? raw.extra_bed_rate ?? extras.extraBedRate, 0),
      images: uniqueStrings([
        ...(Array.isArray(raw.images) ? raw.images : []),
        raw.image,
        raw.image_url,
        raw.thumbnail,
        ...(Array.isArray(extras.images) ? extras.images : []),
      ]),
      sourceRoomId: String(raw.id || raw.roomTypeId || extras.roomTypeId || '').trim() || null,
    });
  };

  if (meta.room) pushRoom(meta.room);
  if (Array.isArray(meta.rooms)) meta.rooms.forEach((r) => pushRoom(r));
  if (Array.isArray(meta.room_types)) meta.room_types.forEach((r) => pushRoom(r));
  if (Array.isArray(meta.roomTypes)) meta.roomTypes.forEach((r) => pushRoom(r));

  if (meta.tierName || meta.roomType || meta.room_type) {
    pushRoom(
      {
        name: meta.tierName || meta.roomType || meta.room_type,
        pricePerNight: meta.absolutePerNight ?? meta.includedRate ?? meta.startingPrice ?? meta.price,
        maxOccupancy: meta.maxOccupancy,
        mealPlan: meta.meals || meta.mealPlan,
        id: meta.roomTypeId,
        rates: meta.room?.rates,
        extraBedRate: meta.extraBedPerNight ?? meta.room?.extraBedRate,
        bedType: meta.room?.bedType,
      },
      {
        price: fallbackPrice,
        roomTypeId: meta.roomTypeId,
        mealPlan: meta.meals || meta.mealPlan,
      }
    );
  }

  return mergeRoomTypes(rooms);
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
    const roomTypes = extractRoomTypes(meta, price);
    const primaryRoom = roomTypes[0];
    candidates.push({
      name,
      location,
      destination: String(destination || location).trim() || location,
      category: starCategory(meta.starRating || meta.star_rating || meta.stars),
      starRating: toNumber(meta.starRating || meta.star_rating || meta.stars, 0),
      roomType:
        String(meta.tierName || meta.room_type || meta.roomType || primaryRoom?.name || 'Standard').trim() ||
        'Standard',
      mealPlan: String(meta.meals || meta.mealPlan || meta.meal_plan || primaryRoom?.mealPlan || 'MAP').trim() || 'MAP',
      price,
      absolutePerNight: price,
      coverImage: images[0] || '',
      images,
      amenities: Array.isArray(meta.amenities) ? meta.amenities.filter(Boolean) : [],
      roomTypes,
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
        rooms: stay.rooms || stay.room_types,
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
    roomTypes: mergeRoomTypes(a.roomTypes, b.roomTypes),
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
  const roomTypes = mergeRoomTypes(
    candidate.roomTypes,
    candidate.roomType
      ? [{ name: candidate.roomType, maxOccupancy: 2, baseRate: price, mealPlan: candidate.mealPlan || '' }]
      : []
  );
  return {
    name: candidate.name,
    destination: candidate.destination || candidate.location,
    location: candidate.location || candidate.destination || 'India',
    category: candidate.category || starCategory(candidate.starRating),
    starRating: toNumber(candidate.starRating, 0),
    roomType: candidate.roomType || roomTypes[0]?.name || 'Standard',
    mealPlan: candidate.mealPlan || roomTypes[0]?.mealPlan || 'MAP',
    price,
    absolutePerNight: toNumber(candidate.absolutePerNight || price, 0),
    coverImage: candidate.coverImage || images[0] || '',
    images,
    amenities: uniqueStrings(candidate.amenities || []),
    sourceHotelId: candidate.sourceHotelId || null,
    sourceSlug: candidate.sourceSlug || null,
    sourceType: 'catalog_import',
    packageRefs: uniqueStrings(candidate.packageRefs || [candidate.packageSlug, candidate.packageName]),
    roomTypes,
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
    const existingRich =
      (existing.roomTypes || []).length > 1 ||
      (existing.roomTypes || []).some((r) => (r.images || []).length || r.sourceRoomId);
    const incomingThin =
      (doc.roomTypes || []).length <= 1 &&
      !(doc.roomTypes || []).some((r) => (r.images || []).length > 1 || ((r.images || []).length === 1 && r.sourceRoomId));
    if (!(existingRich && incomingThin)) {
      existing.roomTypes = mergeRoomTypes(existing.roomTypes, doc.roomTypes);
    }
    if (!existing.roomType && existing.roomTypes?.[0]?.name) {
      existing.roomType = existing.roomTypes[0].name;
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

  const sync = await syncHotelRoomsFromUno();
  return {
    scanned: packages.length,
    hotels: byKey.size,
    created,
    updated,
    roomsSynced: sync.updated,
    roomsFailed: sync.failed,
  };
}

function mapUnoRoomsToRoomTypes(rooms = []) {
  return (rooms || [])
    .map((room) => {
      const name = String(room?.name || '').trim();
      if (!name) return null;
      const flat = normalizeMealRates(room.rates || {}, {
        ep: room.epPrice,
        map: room.pricePerNight,
      });
      const baseRate =
        flat.map || flat.cp || flat.ep || flat.ap || toNumber(room.pricePerNight, 0);
      const extraBed =
        typeof room.extraBedRates === 'object'
          ? toNumber(
              room.extraBedRates?.map ||
                room.extraBedRates?.cp ||
                room.extraBedRates?.ep ||
                0,
              0
            )
          : toNumber(room.extraBedRate, 0);
      return {
        name,
        maxOccupancy: toNumber(room.maxOccupancy, 2) || 2,
        baseRate,
        bedType: String(room.bedType || '').trim(),
        mealPlan: 'MAP',
        rates: {
          ...flat,
          onSeason: { ...flat },
          offSeason: { ep: 0, cp: 0, map: 0, ap: 0 },
        },
        extraBedRate: extraBed,
        images: uniqueStrings(room.images || []),
        sourceRoomId: String(room.id || room._id || '').trim() || null,
      };
    })
    .filter(Boolean);
}

function preserveManualSeasonRates(existingRooms = [], incomingRooms = []) {
  const byId = new Map();
  const byName = new Map();
  for (const room of existingRooms || []) {
    if (room?.sourceRoomId) byId.set(String(room.sourceRoomId), room);
    if (room?.name) byName.set(String(room.name).toLowerCase(), room);
  }
  return (incomingRooms || []).map((room) => {
    const prev = (room.sourceRoomId && byId.get(String(room.sourceRoomId))) || byName.get(String(room.name).toLowerCase());
    if (!prev?.rates) return room;
    const prevOff = prev.rates.offSeason || {};
    const hasOff = ['ep', 'cp', 'map', 'ap'].some((k) => toNumber(prevOff[k], 0) > 0);
    const prevOn = prev.rates.onSeason || {};
    const hasOn = ['ep', 'cp', 'map', 'ap'].some((k) => toNumber(prevOn[k], 0) > 0);
    return {
      ...room,
      rates: {
        ...room.rates,
        onSeason: hasOn ? normalizeMealRates(prevOn, room.rates?.onSeason) : room.rates.onSeason,
        offSeason: hasOff ? normalizeMealRates(prevOff) : room.rates.offSeason,
      },
      // Keep manually typed rates if user already saved them for same room.
      baseRate: toNumber(prev.baseRate, 0) > 0 && hasOn ? prev.baseRate : room.baseRate,
    };
  });
}

async function resolveUnoHotelDetail(hotel) {
  const { getUnoHotelDetail, listUnoHotels } = require('./unoHotelsHotelService');
  const { inferCityFromDestination } = require('../utils/destinationMatch');

  const cityCandidates = uniqueStrings([
    hotel.destination,
    hotel.location,
    inferCityFromDestination(hotel.destination || ''),
    inferCityFromDestination(hotel.location || ''),
    String(hotel.destination || '').split(',')[0],
    String(hotel.location || '').split(',')[0],
  ]).map((c) => inferCityFromDestination(c) || c);

  const slug = String(hotel.sourceSlug || '').trim();
  if (slug) {
    for (const city of cityCandidates) {
      if (!city) continue;
      try {
        const detail = await getUnoHotelDetail({ city, slug });
        if (detail?.rooms?.length) return detail;
      } catch {
        // try next city
      }
    }
  }

  // Fallback: search by hotel name in destination city
  const searchName = String(hotel.name || '').trim();
  if (!searchName) return null;
  for (const city of cityCandidates) {
    try {
      const result = await listUnoHotels({
        city,
        destination: city,
        search: searchName,
        limit: 8,
      });
      const items = result?.items || [];
      const needle = searchName.toLowerCase();
      const match =
        items.find((h) => String(h.name || '').toLowerCase() === needle) ||
        items.find((h) => String(h.name || '').toLowerCase().includes(needle)) ||
        items.find((h) => needle.includes(String(h.name || '').toLowerCase())) ||
        items[0];
      if (!match?.slug) continue;
      const detailCity = match.city || city;
      const detail = await getUnoHotelDetail({ city: detailCity, slug: match.slug });
      if (detail?.rooms?.length) {
        return {
          ...detail,
          matchedSlug: match.slug,
          matchedHotelId: match.id || match._id || null,
        };
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function enrichHotelDocumentFromUno(hotelDoc) {
  const detail = await resolveUnoHotelDetail(hotelDoc);
  if (!detail?.rooms?.length) return { updated: false, reason: 'no_rooms' };

  const incoming = mapUnoRoomsToRoomTypes(detail.rooms);
  if (!incoming.length) return { updated: false, reason: 'empty_rooms' };

  const preserved = preserveManualSeasonRates(hotelDoc.roomTypes || [], incoming);
  hotelDoc.roomTypes = preserved;
  hotelDoc.roomType = preserved[0]?.name || hotelDoc.roomType;
  hotelDoc.images = uniqueStrings([...(hotelDoc.images || []), ...(detail.images || [])]);
  hotelDoc.coverImage = hotelDoc.coverImage || detail.images?.[0] || hotelDoc.images?.[0] || '';
  if (detail.matchedSlug && !hotelDoc.sourceSlug) hotelDoc.sourceSlug = detail.matchedSlug;
  if (detail.matchedHotelId && !hotelDoc.sourceHotelId) {
    hotelDoc.sourceHotelId = String(detail.matchedHotelId);
  }
  if (detail.slug && !hotelDoc.sourceSlug) hotelDoc.sourceSlug = detail.slug;
  if ((detail.id || detail._id) && !hotelDoc.sourceHotelId) {
    hotelDoc.sourceHotelId = String(detail.id || detail._id);
  }
  const lowest = preserved
    .map((r) => toNumber(r.baseRate, 0))
    .filter((n) => n > 0);
  if (lowest.length) {
    const minRate = Math.min(...lowest);
    hotelDoc.price = minRate;
    hotelDoc.absolutePerNight = minRate;
  }
  await hotelDoc.save();
  return { updated: true, rooms: preserved.length };
}

async function syncHotelRoomsFromUno({ limit = 0, onlyThin = false } = {}) {
  const filter = { status: { $ne: 'inactive' } };
  let query = Hotel.find(filter).sort({ updatedAt: -1 });
  if (limit > 0) query = query.limit(limit);
  const hotels = await query;
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const hotel of hotels) {
    const roomCount = Array.isArray(hotel.roomTypes) ? hotel.roomTypes.length : 0;
    const hasImages = (hotel.roomTypes || []).some((r) => Array.isArray(r.images) && r.images.length);
    if (onlyThin && roomCount > 1 && hasImages) {
      skipped += 1;
      continue;
    }
    try {
      const result = await enrichHotelDocumentFromUno(hotel);
      if (result.updated) updated += 1;
      else skipped += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[hotel-rooms-sync] ${hotel.name}:`, err?.message || err);
    }
  }

  return { total: hotels.length, updated, failed, skipped };
}

module.exports = {
  importHotelsFromPackages,
  collectHotelCandidates,
  mergeRoomTypes,
  extractRoomTypes,
  syncHotelRoomsFromUno,
  enrichHotelDocumentFromUno,
  mapUnoRoomsToRoomTypes,
};
