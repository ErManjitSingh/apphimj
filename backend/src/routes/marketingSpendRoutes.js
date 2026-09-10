const express = require('express');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/requirePermission');
const { listSpend, getSummary, createSpend, updateSpend, deleteSpend } = require('../controllers/marketingSpendController');

const router = express.Router();

router.use(protect);

router.get('/summary', requirePermission('marketing', 'view'), getSummary);

router
  .route('/')
  .get(requirePermission('marketing', 'view'), listSpend)
  .post(requirePermission('marketing', 'create'), createSpend);

router
  .route('/:id')
  .put(requirePermission('marketing', 'edit'), updateSpend)
  .delete(requirePermission('marketing', 'delete'), deleteSpend);

module.exports = router;
