const asyncHandler = require('../utils/asyncHandler');
const { listUnoPackages, getUnoPackageById } = require('../services/unoHotelsPackageService');
const {
  countLocalCatalog,
  listLocalCatalog,
  getLocalCatalogPackage,
  upsertCatalogPackage,
} = require('../services/localPackageCatalogService');
const {
  applyMarginToPackage,
  applyMarginToPackages,
} = require('../services/destinationMarginService');

const listPackages = asyncHandler(async (req, res) => {
  const localCount = await countLocalCatalog();
  const result = localCount > 0
    ? await listLocalCatalog(req.query)
    : await listUnoPackages(req.query);
  const items = await applyMarginToPackages(result.items || []);
  res.json({ ...result, items });
});

const getPackage = asyncHandler(async (req, res) => {
  const local = await getLocalCatalogPackage(req.params.id);
  if (local) {
    res.json(await applyMarginToPackage(local));
    return;
  }

  const pkg = await getUnoPackageById(req.params.id, {
    travelDate: req.query.travel_date || req.query.travelDate,
    adults: req.query.adults,
    rooms: req.query.rooms,
  });
  upsertCatalogPackage(pkg).catch((err) => {
    console.error('[packages] auto-save catalog package failed:', err.message);
  });
  res.json(await applyMarginToPackage(pkg));
});

module.exports = {
  listPackages,
  getPackage,
};
