const express = require('express');
const router = express.Router();
const {
  listFollowUps,
  getFollowUpSummary,
  getFollowUp,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} = require('../controllers/followUpController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const requireFollowUpWrite = authorize(
  'sales_executive',
  'admin',
  'sales_manager',
  'team_leader'
);

router.use(protect);

router.get('/summary', getFollowUpSummary);
router.route('/').get(listFollowUps).post(requireFollowUpWrite, createFollowUp);
router
  .route('/:id')
  .get(getFollowUp)
  .put(requireFollowUpWrite, updateFollowUp)
  .delete(requireFollowUpWrite, deleteFollowUp);

module.exports = router;
