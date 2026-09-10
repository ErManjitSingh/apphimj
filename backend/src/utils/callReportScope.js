/**
 * Shared identity guard for Call Report / Executive Activity endpoints. Admin and Sales Manager
 * may request any executive's data via `?executiveId=`; a Sales Executive's own identity always
 * wins regardless of what the client sends — the query param is never trusted for that role, so
 * manipulating executiveId/userId/etc. cannot expose another executive's calls or activity.
 */
function resolveScopedExecutiveId(req, requestedExecutiveId) {
  if (req.user?.role === 'sales_executive') return String(req.user._id);
  return requestedExecutiveId;
}

module.exports = { resolveScopedExecutiveId };
