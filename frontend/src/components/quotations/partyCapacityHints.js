import {
  resolvePartyOccupancy,
  resolveCabCount,
  resolveOverflowMattresses,
  distributeMattressesAcrossRooms,
  BASE_ADULTS_PER_ROOM,
  MAX_EXTRA_MATTRESSES_PER_ROOM,
  clampExtraMattresses,
} from './partyCosting';

/**
 * Cab capacity hint for sales executives when party exceeds default cab seats.
 */
export function getCabCapacityHint(lead = {}, packageCab = null, party = null, extraCabs = []) {
  const occ = party?.travelers
    ? {
        adults: Number(party.adults) || 1,
        children: Number(party.children) || 0,
        travelers: Number(party.travelers) || 1,
        rooms: Number(party.rooms) || 1,
        mattresses: Number(party.mattresses) || 0,
      }
    : resolvePartyOccupancy(lead);

  const seats = Math.max(1, Number(packageCab?.seatingCapacity) || Number(party?.cabSeats) || 4);
  const requiredCabs = resolveCabCount(occ.travelers, seats);
  const configuredCabs = Math.max(1, 1 + (Array.isArray(extraCabs) ? extraCabs.length : 0));
  const fitsInOne = occ.travelers <= seats;
  const needsAction = !fitsInOne && configuredCabs < requiredCabs;

  let message = '';
  if (needsAction) {
    if (requiredCabs > 1) {
      message = `${occ.travelers} traveler${occ.travelers === 1 ? '' : 's'} need ${requiredCabs} cabs (${seats} seats each). Please change your cab or add a new cab.`;
    } else {
      message = `${occ.travelers} travelers exceed this cab's ${seats}-seat capacity. Please change your cab or add a new cab.`;
    }
  }

  return {
    needsAction,
    travelers: occ.travelers,
    seats,
    cabCount: requiredCabs,
    configuredCabs,
    message,
  };
}

/**
 * Hotel room hint when party needs more than one room.
 * Also offers extra-mattress stay when 3–5 adults can share existing rooms.
 */
export function getHotelRoomHint(lead = {}, party = null, configuredRoomLines = 1, extraMattresses = 0) {
  const fromLead = resolvePartyOccupancy(lead);
  const configured = Math.max(1, Number(configuredRoomLines) || 1);
  const matsOnRooms = Math.max(0, Number(extraMattresses) || 0);
  const stayWithMattress = matsOnRooms > 0 || Boolean(party?.stayWithMattress);
  const adults = Number(party?.adults ?? fromLead.adults) || 1;
  const capacity = configured * BASE_ADULTS_PER_ROOM + matsOnRooms;
  const defaultRequired = Math.max(1, Number(fromLead.rooms) || 1);
  const needsAction = adults > capacity;

  const overflowNeeded = resolveOverflowMattresses(adults, configured);
  let message = '';
  if (needsAction) {
    const canPack =
      adults <= configured * (BASE_ADULTS_PER_ROOM + MAX_EXTRA_MATTRESSES_PER_ROOM);
    if (canPack && overflowNeeded > matsOnRooms) {
      message = `${adults} adult${adults === 1 ? '' : 's'} in ${configured} room${configured === 1 ? '' : 's'} need ${overflowNeeded} extra mattress${overflowNeeded === 1 ? '' : 'es'} (2 per room + mattress). Add mattress beside the room, or add another room.`;
    } else {
      message = `${adults} adult${adults === 1 ? '' : 's'} · ${configured} room${configured === 1 ? '' : 's'} hold ${capacity} (2 per room${matsOnRooms ? ` + ${matsOnRooms} mattress` : ''}). Add extra mattress beside the room (3–6 pax) or add another room.`;
    }
  } else if (matsOnRooms > 0) {
    message = `${adults} adult${adults === 1 ? '' : 's'} in ${configured} room${configured === 1 ? '' : 's'} with ${matsOnRooms} extra mattress${matsOnRooms === 1 ? '' : 'es'}.`;
  }

  return {
    needsAction,
    requiredRooms: defaultRequired,
    configuredRooms: configured,
    mattresses: matsOnRooms,
    adults,
    message,
    canStayWithMattress:
      adults > configured * BASE_ADULTS_PER_ROOM &&
      adults <= configured * (BASE_ADULTS_PER_ROOM + MAX_EXTRA_MATTRESSES_PER_ROOM),
    extraMattresses: matsOnRooms,
    stayWithMattress,
    occupancyCapacity: capacity,
  };
}

export function countRoomLinesForDay(dayWiseHotels = [], dayNum = 1) {
  return (Array.isArray(dayWiseHotels) ? dayWiseHotels : []).filter(
    (h) => Number(h.day) === Number(dayNum)
  ).length;
}

export function getRoomLinesForDay(dayWiseHotels = [], dayNum = 1) {
  return (Array.isArray(dayWiseHotels) ? dayWiseHotels : [])
    .filter((h) => Number(h.day) === Number(dayNum))
    .sort((a, b) => Number(a.roomSlot || 1) - Number(b.roomSlot || 1));
}

export function extraMattressesOnLine(line = {}) {
  return clampExtraMattresses(line?.extraMattresses);
}

export function extraMattressesForDay(dayWiseHotels = [], dayNum = 1) {
  return getRoomLinesForDay(dayWiseHotels, dayNum).reduce(
    (sum, line) => sum + extraMattressesOnLine(line),
    0
  );
}

export function occupancyCapacityForDay(dayWiseHotels = [], dayNum = 1) {
  const lines = getRoomLinesForDay(dayWiseHotels, dayNum);
  const rooms = Math.max(1, lines.length || 1);
  const mattresses = extraMattressesForDay(dayWiseHotels, dayNum);
  return {
    rooms,
    mattresses,
    capacity: rooms * BASE_ADULTS_PER_ROOM + mattresses,
  };
}

/**
 * Apply an exact mattress count onto day room lines (from lead), not from adult math.
 */
export function applyMattressesToDayLines(dayLines = [], mattresses = 0) {
  const lines = Array.isArray(dayLines) ? dayLines : [];
  if (!lines.length) return lines;
  const perRoom = distributeMattressesAcrossRooms(lines.length, Math.max(0, Number(mattresses) || 0));
  return lines.map((line, i) => ({
    ...line,
    extraMattresses: clampExtraMattresses(perRoom[i] ?? 0),
  }));
}

/** @deprecated Use applyMattressesToDayLines with lead mattress count. */
export function applySuggestedMattressesToDayLines(dayLines = [], adultsOrMats = 1) {
  return applyMattressesToDayLines(dayLines, adultsOrMats);
}

/**
 * Expand each overnight day's hotel lines to match lead room + mattress counts exactly.
 * Reads lead.numberOfRooms / lead.roomsWithMattress directly (no adult auto-math).
 */
export function expandDayWiseHotelsForParty(dayWiseHotels = [], lead = {}, itinerary = []) {
  const roomsRaw = Number(lead?.numberOfRooms);
  const matsRaw = Number(lead?.roomsWithMattress);
  const occ = resolvePartyOccupancy(lead || {});
  const targetRooms =
    Number.isFinite(roomsRaw) && roomsRaw > 0
      ? Math.max(1, Math.floor(roomsRaw))
      : Math.max(1, Number(occ.rooms) || 1);
  const targetMats =
    Number.isFinite(matsRaw) && matsRaw >= 0
      ? Math.max(0, Math.floor(matsRaw))
      : Math.max(0, Number(occ.mattresses) || 0);
  let lines = Array.isArray(dayWiseHotels) ? [...dayWiseHotels] : [];
  if (!lines.length) return lines;

  const days = Array.isArray(itinerary) ? itinerary : [];
  const overnightDayNums = (() => {
    if (days.length > 1) {
      return days.slice(0, -1).map((d, i) => Number(d.day) || i + 1);
    }
    if (days.length === 1) return [Number(days[0].day) || 1];
    return [...new Set(lines.map((h) => Number(h.day) || 0).filter((d) => d > 0))].sort(
      (a, b) => a - b
    );
  })();

  overnightDayNums.forEach((dayNum) => {
    const dayLines = getRoomLinesForDay(lines, dayNum);
    if (!dayLines.length) return;
    const primary = dayLines[0];
    const next = [...dayLines];
    const primaryRate = Number(
      primary.absolutePerNight || primary.mealPlan?.absolutePrice || primary.perNight || 0
    );
    while (next.length < targetRooms) {
      const slot = next.length + 1;
      next.push({
        ...primary,
        roomSlot: slot,
        // Extra rooms are charged full rack (not package-included).
        includedRate: 0,
        absolutePerNight: primaryRate,
        perNight: primaryRate,
        totalCost: primaryRate,
        extraMattresses: 0,
        fromPackage: Boolean(primary.fromPackage),
        selectedFromPackage: false,
      });
    }
    // Trim extra slots only when lead explicitly set a lower room count than current lines.
    const trimmed =
      Number(lead?.numberOfRooms) > 0 && next.length > targetRooms
        ? next.slice(0, targetRooms)
        : next;
    const withMats = applyMattressesToDayLines(trimmed, targetMats);
    lines = lines.filter((h) => Number(h.day) !== Number(dayNum)).concat(withMats);
  });

  return lines.sort((a, b) => a.day - b.day || (a.roomSlot || 1) - (b.roomSlot || 1));
}

/**
 * Party capacity is ready when overnight stays have enough room lines
 * and cab seating / extra cabs cover all travelers.
 * Pricing sidebar should stay on package base until ready.
 */
export function getPartyCapacityReadiness({
  lead = {},
  party = null,
  dayWiseHotels = [],
  itinerary = [],
  selectedCab = null,
  extraCabs = [],
  cabSeats = 4,
  stayWithMattress: _stayWithMattress = false,
} = {}) {
  const fromLead = resolvePartyOccupancy(lead);
  const adults = Math.max(1, Number(fromLead.adults) || 1);
  const defaultRequiredRooms = Math.max(1, Number(fromLead.rooms) || 1);
  let requiredRooms = defaultRequiredRooms;
  const seats = Math.max(
    1,
    Number(selectedCab?.seatingCapacity) || Number(cabSeats) || Number(party?.cabSeats) || 4
  );
  const travelers = fromLead.travelers;
  const requiredCabs = resolveCabCount(travelers, seats);
  const configuredCabs = Math.max(1, 1 + (Array.isArray(extraCabs) ? extraCabs.length : 0));
  const cabReady = travelers <= seats || configuredCabs >= requiredCabs;

  const overnightDays = (() => {
    const days = Array.isArray(itinerary) ? itinerary : [];
    let candidates = [];
    if (days.length > 1) {
      // Last itinerary day is usually departure (no overnight).
      candidates = days.slice(0, -1).map((d, i) => Number(d.day) || i + 1);
    } else if (days.length === 1) {
      candidates = [Number(days[0].day) || 1];
    } else {
      candidates = [
        ...new Set(
          (Array.isArray(dayWiseHotels) ? dayWiseHotels : [])
            .map((h) => Number(h.day) || 0)
            .filter((d) => d > 0)
        ),
      ].sort((a, b) => a - b);
    }

    // Skip nights where sales intentionally removed / never set a hotel.
    return candidates.filter((dayNum) => {
      const hasLine = (Array.isArray(dayWiseHotels) ? dayWiseHotels : []).some(
        (h) => Number(h.day) === Number(dayNum)
      );
      if (hasLine) return true;
      const day = days.find((d) => Number(d.day) === Number(dayNum));
      return Boolean(day?.hotelMeta?.name || day?.hotel);
    });
  })();

  const leadRooms = defaultRequiredRooms;
  const leadMats = Math.max(0, Number(fromLead.mattresses) || 0);

  const roomGaps = overnightDays.map((dayNum) => {
    const stay = occupancyCapacityForDay(dayWiseHotels, dayNum);
    return {
      day: dayNum,
      configured: stay.rooms,
      mattresses: stay.mattresses,
      capacity: stay.capacity,
      missingRooms: Math.max(0, leadRooms - stay.rooms),
      missingMattresses: Math.max(0, leadMats - stay.mattresses),
      missing: Math.max(0, adults - stay.capacity),
    };
  });

  const minConfigured =
    roomGaps.length > 0
      ? roomGaps.reduce((minCfg, g) => Math.min(minCfg, g.configured), leadRooms)
      : 1;
  const extraMats =
    roomGaps.length > 0
      ? Math.min(...roomGaps.map((g) => g.mattresses))
      : extraMattressesForDay(dayWiseHotels, 1);
  const mattressStay = extraMats > 0 || leadMats > 0;
  if (mattressStay) {
    requiredRooms = Math.min(minConfigured, leadRooms);
  }

  // Ready when quotation stay matches lead rooms + mattresses (not adult auto-fit).
  const roomsReady =
    roomGaps.length === 0
      ? true
      : roomGaps.every((g) => g.configured >= leadRooms && g.mattresses >= leadMats);

  const missingParts = [];
  if (!roomsReady) {
    const needRooms = roomGaps.some((g) => g.missingRooms > 0);
    const needMats = roomGaps.some((g) => g.missingMattresses > 0);
    if (needRooms && needMats) {
      missingParts.push(
        `set ${leadRooms} room${leadRooms === 1 ? '' : 's'} and ${leadMats} mattress${leadMats === 1 ? '' : 'es'} (same as lead)`
      );
    } else if (needRooms) {
      missingParts.push(
        `add room so stay has ${leadRooms} room${leadRooms === 1 ? '' : 's'} (same as lead)`
      );
    } else {
      missingParts.push(
        `set ${leadMats} extra mattress${leadMats === 1 ? '' : 'es'} (same as lead)`
      );
    }
  }
  if (!cabReady) {
    missingParts.push(
      `change cab or add cab so ${travelers} travelers fit (${requiredCabs} × ${seats}-seater)`
    );
  }

  const ready = roomsReady && cabReady;
  const overrideRooms = Math.max(leadRooms, minConfigured);
  const overrideMats = Math.max(leadMats, extraMats);
  return {
    ready,
    roomsReady,
    cabReady,
    requiredRooms,
    requiredCabs,
    configuredCabs,
    seats,
    travelers,
    adults,
    mattresses: overrideMats,
    stayWithMattress: mattressStay && roomsReady,
    occupancyOverride: roomsReady
      ? {
          rooms: overrideRooms,
          mattresses: overrideMats,
          stayWithMattress: overrideMats > 0,
        }
      : null,
    roomGaps,
    message: ready
      ? ''
      : `Pricing updates after you ${missingParts.join(' and ')}.`,
  };
}
