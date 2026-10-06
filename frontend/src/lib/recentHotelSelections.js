/**
 * Track hotel picks in localStorage so frequently/recently selected hotels
 * float to the top of quotation pickers and can show a "Popular" badge.
 */

const STORAGE_KEY = 'himjourny.recentHotelSelections.v1';
const MAX_ENTRIES = 80;
/** Selected this many times → show Popular badge. */
const POPULAR_MIN_COUNT = 2;

function hotelKey(hotel = {}) {
  const id =
    hotel.localHotelId ||
    hotel._id ||
    hotel.id ||
    hotel.hotelId ||
    hotel.slug ||
    '';
  if (id) return String(id);
  const name = String(hotel.name || '').trim().toLowerCase();
  return name || '';
}

function readStore() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — ignore
  }
}

/** Record a hotel selection (bumps count + lastSelectedAt). */
export function recordHotelSelection(hotel) {
  const key = hotelKey(hotel);
  if (!key) return;
  const store = readStore();
  const prev = store[key] || {};
  store[key] = {
    id: key,
    name: hotel?.name || prev.name || '',
    count: Math.max(0, Number(prev.count) || 0) + 1,
    lastSelectedAt: Date.now(),
  };

  const entries = Object.entries(store).sort(
    (a, b) => (b[1].lastSelectedAt || 0) - (a[1].lastSelectedAt || 0)
  );
  const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  writeStore(trimmed);
}

export function getHotelSelectionMeta(hotel) {
  const key = hotelKey(hotel);
  if (!key) return { count: 0, lastSelectedAt: 0, isPopular: false };
  const entry = readStore()[key];
  const count = Math.max(0, Number(entry?.count) || 0);
  const lastSelectedAt = Number(entry?.lastSelectedAt) || 0;
  return {
    count,
    lastSelectedAt,
    isPopular: count >= POPULAR_MIN_COUNT,
  };
}

export function isPopularHotel(hotel) {
  return getHotelSelectionMeta(hotel).isPopular;
}

/**
 * Sort hotels so most recently selected appear first.
 * Unselected hotels keep relative order after recent ones.
 */
export function sortHotelsByRecent(hotels = []) {
  if (!Array.isArray(hotels) || hotels.length < 2) return hotels || [];
  const store = readStore();
  return [...hotels].sort((a, b) => {
    const aAt = Number(store[hotelKey(a)]?.lastSelectedAt) || 0;
    const bAt = Number(store[hotelKey(b)]?.lastSelectedAt) || 0;
    if (aAt !== bAt) return bAt - aAt;
    const aCount = Number(store[hotelKey(a)]?.count) || 0;
    const bCount = Number(store[hotelKey(b)]?.count) || 0;
    return bCount - aCount;
  });
}

export function enrichHotelsWithSelectionMeta(hotels = []) {
  return (Array.isArray(hotels) ? hotels : []).map((hotel) => {
    const meta = getHotelSelectionMeta(hotel);
    return {
      ...hotel,
      selectionCount: meta.count,
      lastSelectedAt: meta.lastSelectedAt,
      isPopular: meta.isPopular,
    };
  });
}
