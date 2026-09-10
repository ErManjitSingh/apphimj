const LEAD_SKILL_TYPES = ['fit', 'group', 'corporate'];

const LEAD_SKILL_LABELS = {
  fit: 'FIT',
  group: 'Group',
  corporate: 'Corporate',
  family: 'Family Tour',
  honeymoon: 'Honeymoon Tour',
};

const GROUP_PAX_THRESHOLD = Number(process.env.LEAD_GROUP_PAX_THRESHOLD || 10);

module.exports = {
  LEAD_SKILL_TYPES,
  LEAD_SKILL_LABELS,
  GROUP_PAX_THRESHOLD,
};
