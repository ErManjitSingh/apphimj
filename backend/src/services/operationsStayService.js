function addDays(date, days) {
  if (!date) return null;
  const next = new Date(date);
  if (Number.isNaN(next.getTime())) return null;
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function dayNumber(row) {
  const day = Number(row?.day);
  return Number.isFinite(day) && day > 0 ? day : 0;
}

function nightsOf(row) {
  const nights = Number(row?.nights);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

function fillBlank(target, source, fields) {
  fields.forEach((field) => {
    const current = target[field];
    const incoming = source[field];
    const empty = current == null || current === '' || (Array.isArray(current) && !current.length);
    if (empty && incoming != null && incoming !== '') target[field] = incoming;
  });
}

function collapseHotelStays(rows = []) {
  const sorted = [...rows].sort((a, b) => dayNumber(a) - dayNumber(b) || String(a.checkIn || '').localeCompare(String(b.checkIn || '')));
  const stays = [];

  sorted.forEach((row) => {
    const name = norm(row.hotelName);
    if (!name) return;
    const previous = stays[stays.length - 1];
    const rowDay = dayNumber(row) || (previous ? dayNumber(previous) + nightsOf(previous) : 1);
    const rowNights = nightsOf(row);
    const rowEnd = rowDay + rowNights - 1;
    const previousEnd = previous ? dayNumber(previous) + nightsOf(previous) - 1 : 0;
    const contiguous = previous && norm(previous.hotelName) === name && rowDay <= previousEnd + 1;

    if (contiguous) {
      const nextEnd = Math.max(previousEnd, rowEnd);
      previous.nights = nextEnd - dayNumber(previous) + 1;
      if (previous.checkIn) previous.checkOut = addDays(previous.checkIn, previous.nights);
      previous.rooms = Math.max(Number(previous.rooms) || 1, Number(row.rooms) || 1);
      if (!Number(previous.internalPrice) && Number(row.internalPrice)) previous.internalPrice = row.internalPrice;
      if (!Number(previous.advancePaid) && Number(row.advancePaid)) previous.advancePaid = row.advancePaid;
      if (!Number(previous.kids) && Number(row.kids)) previous.kids = row.kids;
      previous.specialArrangements = [...new Set([
        ...(previous.specialArrangements || []),
        ...(row.specialArrangements || []),
      ])];
      fillBlank(previous, row, [
        'hotelId', 'externalHotelId', 'destination', 'category', 'roomType', 'mealPlan',
        'address', 'contactPerson', 'phone', 'email', 'confirmationNumber', 'companyName',
        'specialArrangementNote', 'extraMatters', 'notes', 'persons',
      ]);
      if (previous.status === 'pending' && row.status && row.status !== 'pending') previous.status = row.status;
      if (!previous.voucherId && row.voucherId) previous.voucherId = row.voucherId;
      if (!previous.voucherSentAt && row.voucherSentAt) previous.voucherSentAt = row.voucherSentAt;
      return;
    }

    const checkIn = row.checkIn || null;
    stays.push({
      ...row,
      hotelName: row.hotelName,
      day: rowDay,
      nights: rowNights,
      rooms: Number(row.rooms) || 1,
      checkIn,
      checkOut: row.checkOut || (checkIn ? addDays(checkIn, rowNights) : null),
      status: row.status || 'pending',
    });
  });

  return stays;
}

function deriveStaysFromItinerary(itinerary = [], travelDate) {
  const stays = [];
  [...itinerary]
    .sort((a, b) => Number(a.day) - Number(b.day))
    .forEach((day) => {
      const hotelName = day.dayHotel?.hotelName || day.accommodation || '';
      if (!hotelName) return;
      const dayNum = Number(day.day) || stays.length + 1;
      const previous = stays[stays.length - 1];
      if (previous && norm(previous.hotelName) === norm(hotelName) && dayNumber(previous) + nightsOf(previous) === dayNum) {
        previous.nights += 1;
        if (previous.checkIn) previous.checkOut = addDays(previous.checkIn, previous.nights);
        return;
      }
      const checkIn = day.date || (travelDate ? addDays(travelDate, dayNum - 1) : null);
      stays.push({
        hotelId: day.dayHotel?.hotelId || undefined,
        hotelName,
        destination: day.dayHotel?.destination || day.dayHotel?.location || '',
        roomType: day.dayHotel?.roomType || '',
        mealPlan: day.dayHotel?.mealPlan || day.meals || '',
        day: dayNum,
        nights: 1,
        rooms: 1,
        checkIn,
        checkOut: checkIn ? addDays(checkIn, 1) : null,
        status: 'pending',
      });
    });
  return stays;
}

function staysOverlap(left, right) {
  if (norm(left.hotelName) !== norm(right.hotelName)) return false;
  const leftStart = dayNumber(left);
  const rightStart = dayNumber(right);
  if (!leftStart || !rightStart) return true;
  const leftEnd = leftStart + nightsOf(left) - 1;
  const rightEnd = rightStart + nightsOf(right) - 1;
  return leftStart <= rightEnd + 1 && rightStart <= leftEnd + 1;
}

const HOTEL_OPS_FIELDS = [
  'internalPrice', 'advancePaid', 'persons', 'kids', 'companyName',
  'specialArrangements', 'specialArrangementNote', 'extraMatters',
  'email', 'phone', 'contactPerson', 'address', 'confirmationNumber', 'status',
  'voucherId', 'voucherSentAt', 'whatsappSentAt', 'notes', 'rooms', 'category',
];

function mergeHotelOps(derived = [], existing = []) {
  const pool = [...existing];
  return derived.map((stay) => {
    const index = pool.findIndex((row) => staysOverlap(stay, row));
    const previous = index >= 0 ? pool.splice(index, 1)[0] : null;
    if (!previous) return stay;
    const merged = {
      ...stay,
      _id: previous._id,
    };
    HOTEL_OPS_FIELDS.forEach((field) => {
      if (field === 'rooms') {
        merged.rooms = Math.max(Number(stay.rooms) || 1, Number(previous.rooms) || 1);
        return;
      }
      const incoming = stay[field];
      const prior = previous[field];
      const incomingEmpty = incoming == null || incoming === '' || incoming === 0
        || (Array.isArray(incoming) && !incoming.length);
      if (incomingEmpty && prior != null && prior !== '' && prior !== 0) merged[field] = prior;
    });
    if (stay.status === 'pending' && previous.status && previous.status !== 'pending') {
      merged.status = previous.status;
    }
    return merged;
  });
}

function hotelStructureKey(hotels = []) {
  return hotels.map((hotel) => `${norm(hotel.hotelName)}:${dayNumber(hotel)}:${nightsOf(hotel)}`).join('|');
}

function collapseTransport(rows = []) {
  const grouped = [];
  rows.forEach((row) => {
    const key = [
      norm(row.vehicleType),
      norm(row.vendorName),
      norm(row.vehicleNumber),
    ].join('|');
    const previous = grouped.find((item) => item.key === key);
    const days = [...(row.days || []), row.day].map(Number).filter(Boolean);
    if (previous) {
      previous.row.days = [...new Set([...(previous.row.days || []), ...days])].sort((a, b) => a - b);
      if (!Number(previous.row.finalCost) && Number(row.finalCost)) previous.row.finalCost = row.finalCost;
      fillBlank(previous.row, row, [
        'vendorId', 'vendorName', 'driverName', 'driverPhone', 'contactPerson', 'phone', 'email',
        'vehicleNumber', 'pickupLocation', 'dropLocation', 'notes',
      ]);
      if (previous.row.status === 'pending' && row.status && row.status !== 'pending') previous.row.status = row.status;
      if (!previous.row.voucherId && row.voucherId) previous.row.voucherId = row.voucherId;
      if (!previous.row.voucherSentAt && row.voucherSentAt) previous.row.voucherSentAt = row.voucherSentAt;
      if (row.pickupDate && (!previous.row.pickupDate || new Date(row.pickupDate) < new Date(previous.row.pickupDate))) {
        previous.row.pickupDate = row.pickupDate;
        previous.row.pickupLocation = row.pickupLocation || previous.row.pickupLocation;
      }
      if (row.dropLocation) previous.row.dropLocation = row.dropLocation;
      return;
    }
    grouped.push({
      key,
      row: {
        ...row,
        days: [...new Set(days)].sort((a, b) => a - b),
        status: row.status || 'pending',
      },
    });
  });
  return grouped.map((item) => item.row);
}

function mergeTransportOps(derived = [], existing = []) {
  const pool = [...existing];
  return derived.map((row) => {
    const index = pool.findIndex((item) => (
      norm(item.vehicleType) === norm(row.vehicleType)
      && norm(item.vendorName) === norm(row.vendorName)
      && norm(item.vehicleNumber) === norm(row.vehicleNumber)
    ));
    const previous = index >= 0 ? pool.splice(index, 1)[0] : null;
    if (!previous) return row;
    return {
      ...row,
      _id: previous._id,
      finalCost: Number(row.finalCost) || Number(previous.finalCost) || 0,
      email: row.email || previous.email || '',
      phone: row.phone || previous.phone || '',
      contactPerson: row.contactPerson || previous.contactPerson || '',
      driverName: row.driverName || previous.driverName || '',
      driverPhone: row.driverPhone || previous.driverPhone || '',
      status: row.status && row.status !== 'pending' ? row.status : (previous.status || row.status),
      voucherId: row.voucherId || previous.voucherId,
      voucherSentAt: row.voucherSentAt || previous.voucherSentAt,
      whatsappSentAt: row.whatsappSentAt || previous.whatsappSentAt,
    };
  });
}

function transportStructureKey(rows = []) {
  return rows.map((row) => `${norm(row.vehicleType)}:${norm(row.vendorName)}:${(row.days || []).join(',')}`).join('|');
}

function sanitizeHotel(hotel) {
  const id = hotel?.hotelId;
  if (id && !/^[a-f\d]{24}$/i.test(String(id))) {
    return { ...hotel, externalHotelId: hotel.externalHotelId || String(id), hotelId: undefined };
  }
  return hotel;
}

function normalizeBookingAssignments(booking = {}) {
  const derivedHotels = deriveStaysFromItinerary(booking.itinerary, booking.travelDate);
  const collapsedHotels = collapseHotelStays(booking.hotels || []);
  const hotels = derivedHotels.length
    ? mergeHotelOps(derivedHotels, collapsedHotels)
    : collapsedHotels;
  const transport = mergeTransportOps(collapseTransport(booking.transport || []), booking.transport || []);
  return {
    hotels: hotels.map(sanitizeHotel),
    transport,
    hotelsChanged: hotelStructureKey(hotels) !== hotelStructureKey(booking.hotels || []),
    transportChanged: transportStructureKey(transport) !== transportStructureKey(booking.transport || []),
  };
}

module.exports = {
  addDays,
  collapseHotelStays,
  deriveStaysFromItinerary,
  mergeHotelOps,
  collapseTransport,
  mergeTransportOps,
  normalizeBookingAssignments,
};
