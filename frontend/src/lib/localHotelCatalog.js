/**
 * Map Hotel Control (local Mongo Hotel) docs into quotation picker shapes.
 * Preserves on/off season meal rates + extra mattress (extraBedRate).
 */

function mealBucket(raw = {}) {
  return {
    ep: Number(raw.ep) || 0,
    cp: Number(raw.cp) || 0,
    map: Number(raw.map) || 0,
    ap: Number(raw.ap) || 0,
  };
}

function mealBucketsEqual(a = {}, b = {}) {
  return ['ep', 'cp', 'map', 'ap'].every((k) => (Number(a?.[k]) || 0) === (Number(b?.[k]) || 0));
}

/** Prefer on-season, then flat rack, then baseRate. Off-season never invents on-season values. */
function mealRatesFromRoom(room = {}, season = 'onSeason') {
  const onSeason = mealBucket(room.rates?.onSeason || {});
  const seasonal = room.rates?.[season] || {};
  const fromSeason = mealBucket(seasonal);
  const hasSeason = fromSeason.ep || fromSeason.cp || fromSeason.map || fromSeason.ap;

  // Empty off-season / clone of on-season must stay empty — same numbers made the toggle look broken.
  if (season === 'offSeason') {
    if (!hasSeason) return { ep: 0, cp: 0, map: 0, ap: 0 };
    const onHas = onSeason.ep || onSeason.cp || onSeason.map || onSeason.ap;
    if (onHas && mealBucketsEqual(fromSeason, onSeason)) {
      return { ep: 0, cp: 0, map: 0, ap: 0 };
    }
    return fromSeason;
  }

  if (hasSeason) return fromSeason;

  const flat = room.rates || {};
  const fromFlat = mealBucket(flat);
  return {
    ep: fromFlat.ep || 0,
    cp: fromFlat.cp || 0,
    map: fromFlat.map || 0,
    ap: fromFlat.ap || Number(room.baseRate) || 0,
  };
}

function primaryNightly(rates = {}, room = {}) {
  return (
    Number(rates.map || 0) ||
    Number(rates.cp || 0) ||
    Number(rates.ep || 0) ||
    Number(rates.ap || 0) ||
    Number(room.baseRate) ||
    0
  );
}

export function mapLocalRoomTypesToCatalogRooms(roomTypes = []) {
  return (Array.isArray(roomTypes) ? roomTypes : [])
    .filter((room) => room?.name)
    .map((room, index) => {
      const onSeason = mealRatesFromRoom(room, 'onSeason');
      const offSeason = mealRatesFromRoom(room, 'offSeason');
      // Flat rack = on-season (Hotel Control save behaviour)
      const rates = {
        ...onSeason,
        onSeason: { ...onSeason },
        offSeason: { ...offSeason },
      };
      const pricePerNight = primaryNightly(onSeason, room);
      const mattress = Number(room.extraBedRate) || 0;
      // Quotation resolver prefers meal-keyed extraBedRates; mirror Hotel Control scalar.
      const extraBedRates =
        mattress > 0
          ? { ep: mattress, cp: mattress, map: mattress, ap: mattress }
          : null;

      return {
        id: room.sourceRoomId || `${room.name}-${index}`,
        _id: room.sourceRoomId || `${room.name}-${index}`,
        name: room.name,
        description: room.bedType ? `${room.bedType} bed` : '',
        maxOccupancy: room.maxOccupancy || 2,
        bedType: room.bedType || '',
        images: Array.isArray(room.images) ? room.images.filter(Boolean) : [],
        pricePerNight,
        epPrice: onSeason.ep || pricePerNight,
        rates,
        extraBedRate: mattress,
        extraBedRates,
        mealPlan: room.mealPlan || 'MAP',
        mealPlanOptions: [],
        fromLocalCatalog: true,
      };
    });
}

export function mapLocalHotelToCatalogOption(hotel = {}) {
  if (!hotel) return null;
  const id = hotel._id || hotel.id;
  const rooms = mapLocalRoomTypesToCatalogRooms(hotel.roomTypes);
  const cover = hotel.coverImage || hotel.images?.[0] || '';
  const city = hotel.displayCity || hotel.destination || hotel.location || '';
  // Prefer first room on-season MAP (Hotel Control truth) over stale hotel.price
  const fromRooms =
    rooms.reduce((best, r) => {
      const n = primaryNightly(r.rates?.onSeason || r.rates || {}, r);
      return n > best ? n : best;
    }, 0) || 0;
  const price =
    fromRooms ||
    Number(hotel.displayPrice ?? hotel.absolutePerNight ?? hotel.price ?? 0) ||
    0;
  return {
    id,
    _id: id,
    localHotelId: id,
    name: hotel.name,
    location: hotel.location || city,
    city,
    destination: hotel.destination || city,
    image: cover,
    images: Array.isArray(hotel.images) && hotel.images.length ? hotel.images : cover ? [cover] : [],
    thumbnailUrl: cover,
    starRating: Number(hotel.starRating) || 0,
    starCategory: Number(hotel.starRating) || 0,
    category: hotel.category || '',
    tierName: hotel.roomType || rooms[0]?.name || 'Deluxe',
    meals: hotel.mealPlan || 'MAP',
    mealPlan: hotel.mealPlan || 'MAP',
    startingPrice: price,
    absolutePerNight: price,
    priceDelta: 0,
    slug: hotel.sourceSlug || '',
    sourceHotelId: hotel.sourceHotelId || null,
    roomTypes: hotel.roomTypes || [],
    rooms,
    room: rooms[0] || null,
    externalSource: 'local',
    fromLocalCatalog: true,
  };
}

export function mapLocalHotelToCatalogDetail(hotel = {}) {
  const option = mapLocalHotelToCatalogOption(hotel);
  if (!option) return null;
  return {
    ...option,
    rooms: option.rooms,
    checkInTime: '',
    checkOutTime: '',
    amenities: hotel.amenities || [],
  };
}

export function isLikelyMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

/** On / Off MAP (or meal) rates for display chips — same as Hotel Control list. */
export function roomSeasonMealRate(room = {}, season = 'onSeason', mealKey = 'map') {
  const key = String(mealKey || 'map').toLowerCase();
  const seasonal = room?.rates?.[season];
  if (seasonal && Number(seasonal[key]) > 0) return Number(seasonal[key]);
  if (season === 'onSeason' && Number(room?.rates?.[key]) > 0) return Number(room.rates[key]);
  if (season === 'onSeason') {
    return (
      Number(room?.rates?.map || 0) ||
      Number(room?.rates?.cp || 0) ||
      Number(room?.pricePerNight || 0) ||
      0
    );
  }
  return 0;
}
