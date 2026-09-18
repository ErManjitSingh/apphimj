/**
 * Lead-list Warm / Hot / Cold filters — match Lead.temperature (independent of pipeline status).
 */

function applyListStatusBucket(mongoFilter, listStatus) {
  const key = String(listStatus || '').trim().toLowerCase();
  if (!['hot', 'warm', 'cold'].includes(key)) return mongoFilter;

  // VIP collapsed to hot in pipeline redesign
  if (key === 'hot') {
    mongoFilter.temperature = { $in: ['hot', 'vip'] };
    mongoFilter.isHot = true;
  } else {
    mongoFilter.temperature = key;
    if (key === 'cold' || key === 'warm') {
      // Don't force isHot false — some legacy docs may only have temperature set
      delete mongoFilter.isHot;
    }
  }

  // Temperature filter must not wipe an explicit pipeline status if both somehow arrive
  return mongoFilter;
}

module.exports = { applyListStatusBucket };
