const Package = require('../models/Package');
const Hotel = require('../models/Hotel');
const Cab = require('../models/Cab');
const Flight = require('../models/Flight');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getUnoPackageById } = require('../services/unoHotelsPackageService');
const {
  getLocalCatalogPackage,
  importAllUnoPackages,
  getImportStatus,
  countLocalCatalog,
  toPlain,
  mapItineraryForDb,
} = require('../services/localPackageCatalogService');
const {
  applyMarginToPackage,
  applyMarginToPackages,
} = require('../services/destinationMarginService');
const { importHotelsFromPackages } = require('../services/localHotelCatalogService');

function mapUnoDetailToPackageDoc(detail, userId) {
  const plain = toPlain(detail);
  return {
    name: detail.name,
    destination: detail.destination,
    duration: detail.duration || 1,
    durationLabel: detail.durationLabel || '',
    startingPrice: detail.startingPrice || 0,
    packageType: detail.packageType || 'domestic',
    packageCode: detail.packageCode || '',
    shortDescription: detail.shortDescription || '',
    coverImage: detail.coverImage || '',
    inclusions: detail.inclusions || [],
    exclusions: detail.exclusions || [],
    itinerary: mapItineraryForDb(detail.itinerary || []),
    slug: detail.slug || '',
    destinationName: detail.destinationName || detail.destination || '',
    state: detail.state || '',
    country: detail.country || 'India',
    sourceType: 'uno_clone',
    sourcePackageId: String(detail.id || detail._id || ''),
    sourceSlug: detail.slug || '',
    listData: {},
    fullData: plain,
    rawUno: plain._apiRaw || {},
    createdBy: userId,
  };
}

function publicSourceType(value) {
  if (value === 'uno_clone') return 'custom';
  if (value === 'uno_catalog') return 'catalog';
  if (value === 'local') return 'local';
  return value;
}

function internalSourceType(value) {
  if (value === 'custom' || value === 'clone') return 'uno_clone';
  if (value === 'catalog') return 'uno_catalog';
  if (value === 'local') return 'local';
  return value;
}

function sanitizePackageForClient(pkg) {
  if (!pkg || typeof pkg !== 'object') return pkg;
  const { rawUno, ...rest } = pkg;
  return {
    ...rest,
    sourceType: publicSourceType(pkg.sourceType),
    externalSource:
      rest.externalSource === 'uno_hotels' || rest.externalSource === 'uno_hotels_public'
        ? 'catalog'
        : rest.externalSource,
  };
}

function applySearch(items, search) {
  if (!search) return items;
  const q = search.toLowerCase();
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
}

const listPackages = asyncHandler(async (req, res) => {
  const { search, packageType, sourceType } = req.query;
  const filter = {};
  if (packageType) filter.packageType = packageType;
  if (sourceType) filter.sourceType = internalSourceType(sourceType);
  else filter.sourceType = { $ne: 'uno_catalog' };

  const select = sourceType
    ? 'name destination destinationName sourceType startingPrice coverImage duration durationNights durationLabel packageCode slug createdAt'
    : '-fullData -rawUno -listData';

  let packages = await Package.find(filter)
    .select(select)
    .sort({ createdAt: -1 })
    .lean();
  packages = applySearch(packages, search);
  res.json(await applyMarginToPackages(packages.map(sanitizePackageForClient)));
});

const getPackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id).lean();
  if (!pkg) throw new ApiError(404, 'Package not found');
  res.json(await applyMarginToPackage(sanitizePackageForClient(pkg)));
});

const createPackage = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body.rawUno;
  const pkg = await Package.create({
    ...body,
    sourceType: body.sourceType === 'uno_clone' ? 'uno_clone' : 'local',
    createdBy: req.user._id,
  });
  res.status(201).json(sanitizePackageForClient(pkg.toObject()));
});

const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!pkg) throw new ApiError(404, 'Package not found');
  res.json(sanitizePackageForClient(pkg.toObject()));
});

const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) throw new ApiError(404, 'Package not found');
  await pkg.deleteOne();
  res.json({ message: 'Package deleted' });
});

const duplicatePackage = asyncHandler(async (req, res) => {
  const original = await Package.findById(req.params.id).lean();
  if (!original) throw new ApiError(404, 'Package not found');

  const { _id, createdAt, updatedAt, ...rest } = original;
  const copy = await Package.create({
    ...rest,
    name: `${original.name} (Copy)`,
    itinerary: (original.itinerary || []).map((d) => ({ ...d })),
    inclusions: [...(original.inclusions || [])],
    exclusions: [...(original.exclusions || [])],
    sourceType: 'uno_clone',
    sourcePackageId: original.sourcePackageId || null,
    sourceSlug: original.sourceSlug || null,
    createdBy: req.user._id,
  });
  res.status(201).json(sanitizePackageForClient(copy.toObject()));
});

const cloneFromUnoPackage = asyncHandler(async (req, res) => {
  const catalogId = req.params.id || req.params.unoId;
  const detail =
    (await getLocalCatalogPackage(catalogId)) ||
    (await getUnoPackageById(catalogId));
  const payload = mapUnoDetailToPackageDoc(detail, req.user._id);
  const copy = await Package.create({
    ...payload,
    name: `${payload.name} (Copy)`,
  });
  res.status(201).json(sanitizePackageForClient(copy.toObject()));
});

const catalogStatus = asyncHandler(async (_req, res) => {
  const count = await countLocalCatalog();
  res.json({ count, ...getImportStatus() });
});

const importUnoCatalog = asyncHandler(async (req, res) => {
  const current = getImportStatus();
  if (current.running) {
    res.status(202).json({ message: 'Catalog import already running', ...current });
    return;
  }

  const skipExisting = String(req.query.skipExisting || req.body?.skipExisting || '') === 'true';
  importAllUnoPackages({ skipExisting }).catch((err) => {
    console.error('[packages] catalog import failed:', err.message);
  });
  res.status(202).json({ message: 'Catalog import started', running: true, skipExisting });
});

const importHotelsFromCatalog = asyncHandler(async (_req, res) => {
  const result = await importHotelsFromPackages();
  res.json({ message: 'Hotels imported from packages', ...result });
});

const listHotels = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.destination) {
    filter.destination = { $regex: String(req.query.destination).trim(), $options: 'i' };
  }
  let hotels = await Hotel.find(filter).sort({ name: 1 }).lean();
  hotels = applySearch(hotels, req.query.search);
  res.json(
    hotels.map((hotel) => ({
      ...hotel,
      displayPrice: hotel.absolutePerNight || hotel.price || 0,
      displayCity: hotel.destination || hotel.location,
      coverImage: hotel.coverImage || hotel.images?.[0] || '',
    }))
  );
});

const createHotel = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.sourceType) body.sourceType = 'manual';
  if (!body.coverImage && Array.isArray(body.images) && body.images[0]) {
    body.coverImage = body.images[0];
  }
  if (body.price != null && body.absolutePerNight == null) {
    body.absolutePerNight = Number(body.price) || 0;
  }
  const hotel = await Hotel.create({ ...body, createdBy: req.user?._id });
  res.status(201).json(hotel);
});

const updateHotel = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.price != null && body.absolutePerNight == null) {
    body.absolutePerNight = Number(body.price) || 0;
  }
  if (!body.coverImage && Array.isArray(body.images) && body.images[0]) {
    body.coverImage = body.images[0];
  }
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!hotel) throw new ApiError(404, 'Hotel not found');
  res.json(hotel);
});

const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found');
  await hotel.deleteOne();
  res.json({ message: 'Hotel deleted' });
});

const listCabs = asyncHandler(async (req, res) => {
  const cabs = await Cab.find().sort({ createdAt: -1 }).lean();
  res.json(applySearch(cabs, req.query.search));
});

const createCab = asyncHandler(async (req, res) => {
  const cab = await Cab.create(req.body);
  res.status(201).json(cab);
});

const updateCab = asyncHandler(async (req, res) => {
  const cab = await Cab.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cab) throw new ApiError(404, 'Cab not found');
  res.json(cab);
});

const deleteCab = asyncHandler(async (req, res) => {
  const cab = await Cab.findById(req.params.id);
  if (!cab) throw new ApiError(404, 'Cab not found');
  await cab.deleteOne();
  res.json({ message: 'Cab deleted' });
});

const listFlights = asyncHandler(async (req, res) => {
  const flights = await Flight.find().sort({ createdAt: -1 }).lean();
  res.json(applySearch(flights, req.query.search));
});

const createFlight = asyncHandler(async (req, res) => {
  const flight = await Flight.create(req.body);
  res.status(201).json(flight);
});

const updateFlight = asyncHandler(async (req, res) => {
  const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!flight) throw new ApiError(404, 'Flight not found');
  res.json(flight);
});

const deleteFlight = asyncHandler(async (req, res) => {
  const flight = await Flight.findById(req.params.id);
  if (!flight) throw new ApiError(404, 'Flight not found');
  await flight.deleteOne();
  res.json({ message: 'Flight deleted' });
});

module.exports = {
  listPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  duplicatePackage,
  cloneFromUnoPackage,
  catalogStatus,
  importUnoCatalog,
  importHotelsFromCatalog,
  listHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  listCabs,
  createCab,
  updateCab,
  deleteCab,
  listFlights,
  createFlight,
  updateFlight,
  deleteFlight,
};
