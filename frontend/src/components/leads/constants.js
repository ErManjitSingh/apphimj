export const LEAD_STATUSES = [
  { value: 'hot', label: 'Hot', meaning: 'Booking ke close' },
  { value: 'warm', label: 'Warm', meaning: 'Interested, decision pending' },
  { value: 'cold', label: 'Cold', meaning: 'Low intent / unclear timeline' },
];

/** Sales pipeline stages (Lead.status) — independent of temperature */
export const PIPELINE_LEAD_STATUSES = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'not_reachable', label: 'Not Reachable' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'package_sent', label: 'Package Sent' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'booked', label: 'Booked' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'lost', label: 'Lost' },
  // legacy aliases (filters may still receive these before migrate)
  { value: 'new', label: 'New Lead' },
  { value: 'converted', label: 'Booked' },
  { value: 'quotation_sent', label: 'Package Sent' },
];

/** Stored source keys — display uses short labels via getLeadSourceShortLabel */
export const LEAD_SOURCES = [
  'dpw',
  'dpw_wa',
  'dpw_call',
  'dpw2',
  'dpw2_wa',
  'dpw2_call',
  'referral',
  'call_lead',
  'organic',
];

export const AGENTS = [
  { id: 'agent-1', name: 'Priya Patel' },
  { id: 'agent-2', name: 'Amit Kumar' },
  { id: 'agent-3', name: 'Vikram Singh' },
];

export const DESTINATIONS = [
  'Goa', 'Kerala', 'Dubai', 'Thailand', 'Maldives', 'Manali', 'Shimla', 'Kashmir',
  'Rajasthan', 'Andaman', 'Bali', 'Singapore', 'Europe', 'Sri Lanka', 'Nepal', 'Bhutan',
  'Mauritius', 'Vietnam', 'Turkey', 'Switzerland', 'Paris', 'London', 'New York',
  'Himachal Pradesh', 'Uttarakhand', 'Ladakh', 'Spiti Valley', 'Rishikesh',
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat',
  'Haryana', 'Jharkhand', 'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
];

export { INDIAN_STATES } from '../lead-wizard/constants';

export const TRAVEL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const pageConfig = {
  '/leads': { title: 'Lead Management', subtitle: 'All travel inquiries', status: '', assignee: '' },
  '/leads/inbox/new': {
    title: 'New Leads',
    subtitle: 'Fresh inquiries awaiting first contact',
    status: 'new_lead',
    assignee: '',
  },
  '/leads/new-leads': { title: "Today's Leads", subtitle: 'Inquiries received today', status: '', assignee: '', todayOnly: true },
  '/leads/returned': {
    title: 'Unassigned Leads',
    subtitle: 'Leads waiting to be reassigned',
    status: '',
    assignee: '',
    listFilter: 'returned',
  },
  '/leads/hot': {
    title: 'Hot Leads',
    subtitle: 'High-priority leads requiring immediate attention',
    status: '',
    assignee: '',
    listFilter: 'hot',
  },
  '/leads/unassigned': {
    title: 'Unassigned Leads',
    subtitle: 'Not yet assigned to any executive',
    status: '',
    assignee: 'unassigned',
  },
  '/leads/assigned': { title: 'Assigned Leads', subtitle: 'Leads assigned to team members', status: '', assignee: 'assigned' },
  '/leads/converted': { title: 'Bookings', subtitle: 'Confirmed / paid customers', status: 'booked', assignee: '' },
  '/leads/arrivals': {
    title: 'Arrivals',
    subtitle: 'Booked leads by travel / arrival date',
    status: 'booked',
    assignee: '',
    listFilter: 'arrivals',
  },
  '/leads/lost': { title: 'Lost Leads', subtitle: 'Closed as lost', status: 'lost', assignee: '', listFilter: '', listStatus: '' },
  '/leads/duplicates': {
    title: 'Repeated Leads',
    subtitle: 'Leads sharing the same phone number',
    status: '',
    assignee: '',
    listFilter: 'duplicates',
  },
};

export function formatLeadId(id) {
  return `LD-${String(id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
}

/**
 * Package Cost filter (Admin → Lead Management → All Leads). Filters on the same `Lead.budget`
 * field the Sales Executive enters when creating the lead — no separate value.
 * `minExclusive`/`maxExclusive` make adjacent ranges non-overlapping (e.g. exactly ₹1,00,000
 * belongs to "₹50K – ₹1L", not "₹1L – ₹2L"). "Above ₹50K" is an intentional aggregate that
 * overlaps every other range above ₹50K.
 */
export const BUDGET_FILTER_OPTIONS = [
  { value: '', label: 'All Package Costs', min: '', max: '' },
  { value: 'under_50000', label: 'Under ₹50K', min: '', max: '50000', maxExclusive: true },
  { value: '50000_100000', label: '₹50K – ₹1L', min: '50000', max: '100000' },
  { value: '100000_200000', label: '₹1L – ₹2L', min: '100000', max: '200000', minExclusive: true },
  { value: '200000_300000', label: '₹2L – ₹3L', min: '200000', max: '300000', minExclusive: true },
  { value: 'above_300000', label: '₹3L & Above', min: '300000', max: '', minExclusive: true },
  { value: 'above_50000', label: 'Above ₹50K', min: '50000', max: '', minExclusive: true },
];

export const emptyFilters = {
  search: '',
  destination: '',
  source: '',
  agent: '',
  status: '',
  filter: '',
  listStatus: '',
  connected: '',
  travelMonth: '',
  budgetMin: '',
  budgetMax: '',
  budgetMinExclusive: '',
  budgetMaxExclusive: '',
  budgetRange: '',
  dateFrom: '',
  dateTo: '',
  priority: '',
  teamId: '',
  branchId: '',
  state: '',
};

export const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'hot', label: 'Hot' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
