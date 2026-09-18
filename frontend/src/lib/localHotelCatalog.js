/**
 * Map Hotel Control (local Mongo Hotel) docs into quotation picker shapes.
 */

function mealRatesFromRoom(room = {}) {
  const on = room.rates?.onSeason || {};
  const flat = room.rates || {};
  return {
    ep: Number(on.ep || flat.ep || 0) || 0,
    cp: Number(on.cp || flat.cp || 0) || 0,
    map: Number(on.map || flat.map || 0) || 0,
    ap: Number(on.ap || flat.ap || 0) || 0,
  };
}

export function mapLocalRoomTypesToCatalogRooms(roomTypes = []) {
  return (Array.isArray(roomTypes) ? roomTypes : [])
    .filter((room) => room?.name)
    .map((room, index) => {
      const rates = mealRatesFromRoom(room);
      const pricePerNight =
        rates.map || rates.cp || rates.ep || rates.ap || Number(room.baseRate) || 0;
      return {
        id: room.sourceRoomId || `${room.name}-${index}`,
        _id: room.sourceRoomId || `${room.name}-${index}`,
        name: room.name,
        description: room.bedType ? `${room.bedType} bed` : '',
        maxOccupancy: room.maxOccupancy || 2,
        bedType: room.bedType || '',
        images: Array.isArray(room.images) ? room.images.filter(Boolean) : [],
        pricePerNight,
        epPrice: rates.ep || pricePerNight,
        rates,
        extraBedRate: Number(room.extraBedRate) || 0,
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
  const price = Number(hotel.displayPrice ?? hotel.absolutePerNight ?? hotel.price ?? 0) || 0;
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
