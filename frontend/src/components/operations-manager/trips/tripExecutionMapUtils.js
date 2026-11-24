/** Shared journey helpers + location imagery for Trip Execution Map */

export const FALLBACK_MAP_BG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=75';

const LOCATION_IMAGES = [
  { match: /shimla|kufri|chail/i, label: 'Shimla', url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1800&q=75' },
  { match: /sangla|chitkul/i, label: 'Sangla', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=75' },
  { match: /tabo/i, label: 'Tabo', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=75' },
  { match: /kaza|spiti/i, label: 'Kaza', url: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1800&q=75' },
  { match: /kalpa|kinnaur|reckong|peo/i, label: 'Kalpa', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1800&q=75' },
  { match: /manali|solang|rohtang/i, label: 'Manali', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=75' },
  { match: /kasol|manikaran|parvati/i, label: 'Kasol', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=75' },
  { match: /dharamshala|mcleod|bir/i, label: 'Dharamshala', url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1800&q=75' },
  { match: /dalhousie|khajjiar/i, label: 'Dalhousie', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=70', bg: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=75' },
  { match: /chandigarh|airport/i, label: 'Chandigarh', url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f39c0b?auto=format&fit=crop&w=400&q=70', bg: FALLBACK_MAP_BG },
];

/** Non-overlapping pin slots along a scenic curve (percent). */
const PIN_SLOTS = [
  { left: 14, top: 62 },
  { left: 28, top: 48 },
  { left: 42, top: 38 },
  { left: 56, top: 30 },
  { left: 70, top: 24 },
  { left: 82, top: 18 },
  { left: 88, top: 34 },
  { left: 76, top: 48 },
];

export function startOfLocalDay(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dayDiff(from, to) {
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function formatShort(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function paxCount(tour) {
  return Number(tour?.adults || 0) + Number(tour?.children || 0) || 0;
}

export function locationMedia(place = '') {
  const hit = LOCATION_IMAGES.find((d) => d.match.test(String(place)));
  if (hit) return hit;
  return {
    label: String(place || 'Stop').split(/[\s,/|-]+/)[0] || 'Stop',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=70',
    bg: FALLBACK_MAP_BG,
  };
}

function extractPlaceFromTitle(title = '') {
  const text = String(title || '').trim();
  if (!text) return '';
  const toMatch = text.match(/\bto\s+([A-Za-z][A-Za-z\s/]+)$/i);
  if (toMatch) return toMatch[1].split('/')[0].trim();
  return text.split(/[\s|/,-]+/)[0] || '';
}

function placeFromDay(day, booking) {
  return (
    day?.dayHotel?.destination ||
    day?.dayHotel?.location ||
    day?.accommodation ||
    day?.dayCab?.dropLocation ||
    day?.dayCab?.pickupLocation ||
    extractPlaceFromTitle(day?.title) ||
    booking?.destination ||
    'Tour stop'
  );
}

function hotelFromDay(day, booking) {
  const byDay = (booking?.hotels || []).find((h) => Number(h.day) === Number(day?.day));
  return day?.dayHotel?.hotelName || byDay?.hotelName || day?.accommodation || '';
}

function slotForIndex(index, total) {
  if (total <= 1) return PIN_SLOTS[0];
  const max = Math.min(total, PIN_SLOTS.length);
  const step = (PIN_SLOTS.length - 1) / Math.max(max - 1, 1);
  const slotIndex = Math.round(index * step);
  return PIN_SLOTS[Math.min(slotIndex, PIN_SLOTS.length - 1)];
}

export function buildJourney(tour) {
  const travel = startOfLocalDay(tour.travelDate);
  const ret = startOfLocalDay(tour.returnDate);
  const today = startOfLocalDay(new Date());
  const itinerary = [...(tour.itinerary || [])].sort((a, b) => Number(a.day || 0) - Number(b.day || 0));

  let stops = [];
  if (itinerary.length && travel) {
    stops = itinerary.map((day, idx) => {
      const date = day.date ? startOfLocalDay(day.date) : addDays(travel, Math.max(0, Number(day.day || idx + 1) - 1));
      const place = placeFromDay(day, tour);
      const media = locationMedia(place);
      const slot = slotForIndex(idx, itinerary.length);
      return {
        day: Number(day.day || idx + 1),
        date,
        place,
        hotel: hotelFromDay(day, tour),
        title: day.title || `Day ${day.day || idx + 1}`,
        meals: day.meals || '',
        left: slot.left,
        top: slot.top,
        thumb: media.url,
        pinLabel: media.label,
      };
    });
  } else if (travel) {
    const nights = ret ? Math.max(1, dayDiff(travel, ret)) : 3;
    for (let i = 0; i <= nights; i += 1) {
      const place = tour.destination || 'Destination';
      const media = locationMedia(place);
      const slot = slotForIndex(i, nights + 1);
      stops.push({
        day: i + 1,
        date: addDays(travel, i),
        place,
        hotel: '',
        title: i === 0 ? 'Arrival' : i === nights ? 'Return' : `Day ${i + 1}`,
        meals: '',
        left: slot.left,
        top: slot.top,
        thumb: media.url,
        pinLabel: media.label,
      });
    }
  }

  const todayOffset = travel && today ? dayDiff(travel, today) : null;
  const todayStop =
    todayOffset == null
      ? null
      : stops.find((s) => dayDiff(s.date, today) === 0) ||
        stops[Math.min(Math.max(todayOffset, 0), Math.max(stops.length - 1, 0))] ||
        null;

  const tomorrow = today ? addDays(today, 1) : null;
  const tomorrowStop =
    tomorrow == null
      ? null
      : stops.find((s) => dayDiff(s.date, tomorrow) === 0) ||
        (todayStop ? stops.find((s) => Number(s.day) === Number(todayStop.day) + 1) : null);

  let arrivalOrigin = 'Pickup';
  const firstTitle = String(itinerary[0]?.title || '');
  const originMatch = firstTitle.match(/^(.+?)\s+TO\s+/i);
  if (originMatch) arrivalOrigin = originMatch[1].replace(/\//g, ' / ').trim();
  else if (tour.transport?.[0]?.pickupLocation) arrivalOrigin = tour.transport[0].pickupLocation;
  else if (stops[0]?.place) arrivalOrigin = stops[0].place;

  const totalDays = travel && ret ? Math.max(1, dayDiff(travel, ret) + 1) : stops.length || 1;
  const currentDayNo =
    todayOffset == null ? null : Math.min(Math.max(todayOffset + 1, 1), totalDays);
  const progressPct = currentDayNo ? Math.round(((currentDayNo - 1) / Math.max(totalDays, 1)) * 100) : 0;

  const mapBg = locationMedia(todayStop?.place || tour.destination).bg || FALLBACK_MAP_BG;

  return {
    stops,
    todayStop,
    tomorrowStop,
    arrivalStop: stops[0] || null,
    arrivalOrigin,
    travel,
    returnDate: ret,
    today,
    currentDayNo,
    totalDays,
    progressPct,
    mapBg,
  };
}
