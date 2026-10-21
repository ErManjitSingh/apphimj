const mongoose = require('mongoose');
const User = require('../models/User');

function tripPlannerFromUser(user) {
  if (!user) return null;
  const phone = String(user.phone || '').trim();
  const name = String(user.name || '').trim();
  const email = String(user.email || '').trim();
  if (!phone && !name) return null;
  return { name, phone, email };
}

async function userById(id) {
  if (!id || typeof id === 'object') return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  try {
    return await User.findById(id).select('name phone email').lean();
  } catch {
    return null;
  }
}

/**
 * Contact printed on quotations and vouchers.
 * Prefer the agent who owns the lead, then the quote's saved planner, then the person saving it.
 */
async function resolveAgentContact({ lead, quotation, user } = {}) {
  const assigned = lead?.assignedTo;
  let agent = assigned && typeof assigned === 'object' ? assigned : null;
  if (!agent?.phone) {
    const assignedId = agent?._id || agent?.id || (assigned && typeof assigned !== 'object' ? assigned : null);
    const loaded = await userById(assignedId);
    if (loaded) agent = loaded;
  }

  const saved = quotation?.tripPlanner;
  const phone = String(agent?.phone || saved?.phone || user?.phone || '').trim();
  const name = String((phone && agent?.phone ? agent?.name : '') || agent?.name || saved?.name || user?.name || '').trim();
  const email = String(agent?.email || saved?.email || user?.email || '').trim();
  return { name, phone, email };
}

module.exports = {
  tripPlannerFromUser,
  resolveAgentContact,
};
