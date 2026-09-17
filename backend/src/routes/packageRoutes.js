const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/packageController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/catalog-status', authorize('admin', 'sales_manager'), catalogStatus);
router.post('/import-catalog', authorize('admin'), importUnoCatalog);
router.post(
  '/import-hotels-from-catalog',
  authorize('admin', 'sales_executive', 'sales_manager', 'operations_manager'),
  importHotelsFromCatalog
);
router.post('/clone-from-catalog/:id', cloneFromUnoPackage);
router.post('/duplicate/:id', duplicatePackage);
router.route('/').get(listPackages).post(createPackage);
router.route('/:id').get(getPackage).put(updatePackage).delete(deletePackage);

module.exports = router;
