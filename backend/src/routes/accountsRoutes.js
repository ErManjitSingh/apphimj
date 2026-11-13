const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { getCommercialReport } = require('../controllers/accountsController');

router.use(protect, authorize('admin', 'accountant'));

router.get('/commercial', getCommercialReport);

module.exports = router;
