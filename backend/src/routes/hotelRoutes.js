const express = require('express');
const router = express.Router();
const {
  listHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  syncHotelsRooms,
  uploadHotelImage,
} = require('../controllers/packageController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Catalog read: any authenticated user (quotations / package picker)
router.get('/', listHotels);
router.get('/:id', getHotel);

// Hotel Control write: admin + sales manager only
const hotelManagers = authorize('admin', 'sales_manager');
router.post('/', hotelManagers, createHotel);
router.post('/sync-rooms', hotelManagers, syncHotelsRooms);
router.post('/upload-image', hotelManagers, uploadHotelImage);
router.put('/:id', hotelManagers, updateHotel);
router.delete('/:id', hotelManagers, deleteHotel);

module.exports = router;
