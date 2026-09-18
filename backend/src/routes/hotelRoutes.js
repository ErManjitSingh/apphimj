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

router.use(protect);

router.route('/').get(listHotels).post(createHotel);
router.post('/sync-rooms', syncHotelsRooms);
router.post('/upload-image', uploadHotelImage);
router.route('/:id').get(getHotel).put(updateHotel).delete(deleteHotel);

module.exports = router;
