const Team = require('../models/Team');
const User = require('../models/User');
const cacheService = require('./cacheService');

const TEAM_CACHE_TTL_MS = 60_000;

async function getTeamForLeader(leaderId) {
  const key = `team:leader:${String(leaderId)}`;
  return cacheService.getOrSet(
    key,
    () => Team.findOne({ teamLeader: leaderId }).populate('members', 'name email role status').lean(),
    TEAM_CACHE_TTL_MS
  );
}

async function getExecutiveIdsForLeader(leaderId) {
  const team = await getTeamForLeader(leaderId);
  if (!team?.members?.length) return [];
  return team.members
    .filter((m) => m.role === 'sales_executive' && m.status !== 'disabled')
    .map((m) => String(m._id));
}

/** Leads a team leader may view or assign within their squad */
async function getLeaderLeadScopeFilter(leaderId) {
  const team = await getTeamForLeader(leaderId);
  const execIds = team?.members?.length
    ? team.members.filter((m) => m.role === 'sales_executive').map((m) => m._id)
    : [];

  // Include unassigned pool leads so TLs can pick up and assign them.
  const or = [
    { assignedTo: null },
    { assignedTo: { $in: execIds } },
    { assignedTo: leaderId },
    { assignedTeamLeader: leaderId },
  ];
  if (team?._id) or.push({ teamId: team._id });

  return { $or: or };
}

async function getTeamLeaderForExecutive(executiveId) {
  const team = await Team.findOne({ members: executiveId }).populate('teamLeader', 'name email');
  return team?.teamLeader || null;
}

async function getSquadNamesForLeader(leaderId) {
  const team = await getTeamForLeader(leaderId);
  if (!team?.members?.length) return [];
  const memberIds = team.members.map((m) => m._id || m);
  const members = await User.find({ _id: { $in: memberIds } }).select('name').lean();
  return members.map((m) => m.name);
}

module.exports = {
  getTeamForLeader,
  getExecutiveIdsForLeader,
  getLeaderLeadScopeFilter,
  getTeamLeaderForExecutive,
  getSquadNamesForLeader,
};
