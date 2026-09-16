const express = require('express');
const router = express.Router();
const {
  getStats,
  getDestinationDetail,
  getDestinationInsight,
  getExecutiveInsight,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/destination', getDestinationDetail);
router.get('/destination-insight', getDestinationInsight);
router.get('/executive-insight', getExecutiveInsight);

module.exports = router;
