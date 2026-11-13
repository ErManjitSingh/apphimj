const asyncHandler = require('../utils/asyncHandler');
const { buildAccountsCommercialReport } = require('../services/accountsCommercialService');

const getCommercialReport = asyncHandler(async (req, res) => {
  const data = await buildAccountsCommercialReport({
    branchId: req.branchId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    status: req.query.status,
  });
  res.json(data);
});

module.exports = { getCommercialReport };
