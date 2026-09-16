const mongoose = require('mongoose');
const Package = require('../models/Package');
const {
  preferredDestinationSearch,
  matchesDestination,
} = require('../utils/destinationMatch');
const {
  fetchUnoPackages,
  fetchUnoPackageById,
  mapUnoPackage,
} = require('./unoHotelsPackageService');

const CATALOG_TYPE = 'uno_catalog';
const LOCAL_LIST_MAX_LIMIT = 500;

let importLock = null;
let lastImportStatus = { running: false };

function toPlain(value) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nested) => {
        if (nested instanceof Map) return Object.fromEntries(nested);
        return nested;
      })
    );
  } catch {
    return value;
  }
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function catalogKey(item = {}) {
  return String(item.slug || item.sourceSlug || item.id || item._id || item.sourcePackageId || '').trim();
}

function toListItem(detail = {}, fallback = {}) {
  const mapped = mapUnoPackage(
    {
      id: detail.id || detail._id || fallback.id || fallback._id,
      slug: detail.slug || fallback.slug,
      package_code: detail.packageCode || fallback.packageCode,
      name: detail.name || fallback.name,
      destination_city: detail.destination || fallback.destination,
      destination_name: detail.destinationName || fallback.destinationName,
      state: detail.state || fallback.state,
      country: detail.country || fallback.country,
      duration_days: detail.duration || fallback.duration,
      duration_nights: detail.durationNights || fallback.durationNights,
      duration_label: detail.durationLabel || fallback.durationLabel,
      discounted_price: detail.discountedPrice ?? detail.startingPrice ?? fallback.startingPrice,
      base_price: detail.basePrice ?? fallback.basePrice,
      price_per: detail.pricePer,
      tour_type: detail.packageType || fallback.packageType,
      currency: detail.currency,
      featured_image: detail.coverImage || fallback.coverImage,
      short_description: detail.shortDescription || fallback.shortDescription,
      description: detail.description,
      inclusions: detail.inclusions || fallback.inclusions,
      exclusions: detail.exclusions || fallback.exclusions,
      highlight_icons: detail.highlights,
      status: detail.status,
      booking_count: detail.bookingCount,
      avg_rating: detail.avgRating,
      review_count: detail.reviewCount,
      is_featured: detail.isFeatured,
      is_customizable: detail.isCustomizable,
      seo_score: detail.seoScore,
      updated_at: detail.updatedAt,
      created_at: detail.createdAt,
    },
    { includeDetail: false }
  );
  mapped.externalSource = 'local_catalog';
  return mapped;
}

function mapItineraryForDb(days = []) {
  return (Array.isArray(days) ? days : []).map((day) => ({
    day: Number(day.day) || 1,
    title: day.title || `Day ${day.day || 1}`,
    description: day.description || '',
    meals: day.meals || '',
    accommodation: day.accommodation || day.hotel || '',
    hotel: day.hotel || '',
    activities: day.activities || '',
    transport: day.transport || '',
  }));
}

function buildCatalogDoc(detail) {
  const plain = toPlain(detail);
  const id = String(plain.id || plain._id || '');
  const slug = String(plain.slug || '');
  const listData = toListItem(plain);
  return {
    name: plain.name || 'Untitled package',
    destination: plain.destination || plain.destinationName || 'India',
    destinationName: plain.destinationName || plain.destination || '',
    state: plain.state || '',
    country: plain.country || 'India',
    duration: Number(plain.duration) || 1,
    durationLabel: plain.durationLabel || '',
    startingPrice: Number(plain.startingPrice || 0),
    packageType: plain.packageType || 'domestic',
    packageCode: plain.packageCode || '',
    shortDescription: plain.shortDescription || '',
    coverImage: plain.coverImage || '',
    inclusions: Array.isArray(plain.inclusions) ? plain.inclusions : [],
    exclusions: Array.isArray(plain.exclusions) ? plain.exclusions : [],
    itinerary: mapItineraryForDb(plain.itinerary),
    slug,
    sourceType: CATALOG_TYPE,
    sourcePackageId: id || slug || null,
    sourceSlug: slug || null,
    listData,
    fullData: {
      ...plain,
      _id: id || slug,
      id: id || slug,
      slug,
      externalSource: 'local_catalog',
    },
    rawUno: plain._apiRaw || {},
    syncedAt: new Date(),
  };
}

async function countLocalCatalog() {
  return Package.countDocuments({ sourceType: CATALOG_TYPE });
}

function catalogLookupFilter(idOrSlug) {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;
  const or = [
    { sourceType: CATALOG_TYPE, sourceSlug: key },
    { sourceType: CATALOG_TYPE, sourcePackageId: key },
    { sourceType: CATALOG_TYPE, slug: key },
  ];
  if (mongoose.isValidObjectId(key)) {
    or.push({ _id: key, sourceType: CATALOG_TYPE });
  }
  return { $or: or };
}

async function getLocalCatalogPackage(idOrSlug) {
  const filter = catalogLookupFilter(idOrSlug);
  if (!filter) return null;
  const doc = await Package.findOne(filter).lean();
  if (!doc) return null;
  if (doc.fullData && (doc.fullData.id || doc.fullData.slug || doc.fullData.name)) {
    return { ...doc.fullData, externalSource: 'local_catalog' };
  }
  return toListItem(doc, doc);
}

async function upsertCatalogPackage(detail) {
  const payload = buildCatalogDoc(detail);
  const filter = payload.sourceSlug
    ? { sourceType: CATALOG_TYPE, sourceSlug: payload.sourceSlug }
    : { sourceType: CATALOG_TYPE, sourcePackageId: payload.sourcePackageId };
  return Package.findOneAndUpdate(filter, { $set: payload }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
}

function applyNameSearch(items, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return items;
  const destHint = String(preferredDestinationSearch(q) || '').trim().toLowerCase();
  if (destHint && destHint === q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((pkg) => {
    const hay = [
      pkg.name,
      pkg.destination,
      pkg.destinationName,
      pkg.state,
      pkg.shortDescription,
      pkg.packageCode,
      pkg.slug,
    ]
      .map((x) => String(x || '').toLowerCase())
      .join(' ');
    return tokens.every((t) => hay.includes(t));
  });
}

async function listLocalCatalog(query = {}) {
  const docs = await Package.find({ sourceType: CATALOG_TYPE })
    .select('listData name destination destinationName state sourceSlug sourcePackageId duration durationLabel startingPrice packageType shortDescription coverImage packageCode slug')
    .sort({ name: 1 })
    .lean();

  let items = docs.map((doc) => {
    if (doc.listData && doc.listData.name) return doc.listData;
    return toListItem(doc, doc);
  });

  if (query.destination) {
    items = items.filter((pkg) => matchesDestination(pkg, query.destination));
  }

  const destHint = String(preferredDestinationSearch(query.destination) || '').trim().toLowerCase();
  const typedSearch = String(query.search || '').trim().toLowerCase();
  const nameFilter = String(query.nameSearch || (!destHint ? typedSearch : '') || '').trim();
  items = applyNameSearch(items, nameFilter);

  const limit = Math.min(Math.max(1, Number(query.limit) || 50), LOCAL_LIST_MAX_LIMIT);
  const page = Math.max(1, Number(query.page) || 1);

  if (query.destination || nameFilter) {
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || limit,
      totalPages: 1,
      source: 'local_catalog',
      destination: query.destination || null,
    };
  }

  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    source: 'local_catalog',
    destination: null,
  };
}

async function listAllUnoSummaries() {
  const first = await fetchUnoPackages({ page: 1, limit: 50 });
  const totalPages = Math.max(1, Number(first.totalPages) || 1);
  const items = [...(first.items || [])];
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchUnoPackages({ page, limit: 50 });
    items.push(...(next.items || []));
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = catalogKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: size }, run));
  return results;
}

async function importAllUnoPackages({ concurrency = 2, skipExisting = false } = {}) {
  if (importLock) {
    return { ...importLock.status, running: true };
  }

  const status = {
    running: true,
    total: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  importLock = { status };

  try {
    const summaries = await listAllUnoSummaries();
    status.total = summaries.length;
    console.log(`[packages] Importing ${summaries.length} catalog packages into Mongo`);

    const existing = skipExisting
      ? new Set(
          (
            await Package.find({ sourceType: CATALOG_TYPE })
              .select('sourceSlug sourcePackageId')
              .lean()
          ).flatMap((doc) => [doc.sourceSlug, doc.sourcePackageId].filter(Boolean).map(String))
        )
      : new Set();

    const travelDate = todayYmd();

    await mapPool(summaries, concurrency, async (summary, index) => {
      const key = catalogKey(summary);
      const label = `${index + 1}/${summaries.length} ${summary.name || key}`;
      if (skipExisting && existing.has(key)) {
        status.skipped += 1;
        console.log(`[packages] skip ${label}`);
        return;
      }

      try {
        const detail = await fetchUnoPackageById(summary.slug || summary.id || key, {
          travelDate,
          adults: 2,
          rooms: 1,
        });
        await upsertCatalogPackage(detail);
        status.imported += 1;
        console.log(`[packages] saved ${label}`);
      } catch (err) {
        status.failed += 1;
        const message = err.message || String(err);
        status.errors.push({ key, name: summary.name, message });
        console.error(`[packages] fail ${label}: ${message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    status.running = false;
    status.finishedAt = new Date().toISOString();
    lastImportStatus = { ...status };
    return status;
  } catch (err) {
    status.running = false;
    status.failed += 1;
    status.errors.push({ key: 'import', message: err.message || String(err) });
    status.finishedAt = new Date().toISOString();
    lastImportStatus = { ...status };
    throw err;
  } finally {
    if (importLock?.status === status) importLock = null;
  }
}

function getImportStatus() {
  return importLock?.status || lastImportStatus;
}

module.exports = {
  CATALOG_TYPE,
  countLocalCatalog,
  getLocalCatalogPackage,
  listLocalCatalog,
  upsertCatalogPackage,
  importAllUnoPackages,
  getImportStatus,
  toPlain,
  mapItineraryForDb,
};
