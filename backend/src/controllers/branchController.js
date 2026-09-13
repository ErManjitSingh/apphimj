const Branch = require('../models/Branch');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// Read-only: id + name (+status) only, no write access implied. Admin and Sales Manager see
// every active branch (Sales Manager needs this to populate the "All Leads" Branch filter —
// see LeadFilterBar.jsx / findManagerLeadsPaginated's effectiveBranchId); every other role
// still only sees its own branch.
const FULL_LIST_ROLES = ['admin', 'sales_manager'];

const listBranches = asyncHandler(async (req, res) => {
  let filter = { status: 'active' };
  if (!FULL_LIST_ROLES.includes(req.user?.role)) {
    filter = { _id: req.user.branchId };
  }

  const branches = await Branch.find(filter).sort({ name: 1 }).lean();
  res.json(branches);
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, code, status } = req.body;
  if (!name?.trim() || !code?.trim()) throw new ApiError(400, 'Name and code are required');

  const exists = await Branch.findOne({
    $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
  });
  if (exists) throw new ApiError(400, 'Branch already exists');

  const branch = await Branch.create({
    name: name.trim(),
    code: code.trim().toUpperCase(),
    status: status || 'active',
  });
  res.status(201).json(branch);
});

module.exports = { listBranches, createBranch };
