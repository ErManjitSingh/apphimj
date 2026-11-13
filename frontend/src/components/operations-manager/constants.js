export const BOOKING_STATUS_CONFIG = {
  booking_received: { label: 'Booking Received', className: 'bg-sky-500/15 text-sky-700 ring-sky-400/30' },
  pending_verification: { label: 'Pending Verification', className: 'bg-amber-500/15 text-amber-700 ring-amber-400/30' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-700 ring-amber-400/30' },
  confirmed: { label: 'Confirmed', className: 'bg-teal-500/15 text-teal-700 ring-teal-400/30' },
  in_progress: { label: 'In Progress', className: 'bg-emerald-500/15 text-emerald-700 ring-emerald-400/30' },
  active: { label: 'Active Trip', className: 'bg-emerald-500/15 text-emerald-700 ring-emerald-400/30' },
  completed: { label: 'Completed', className: 'bg-slate-500/15 text-slate-600 ring-slate-400/30' },
  postponed: { label: 'Postponed', className: 'bg-amber-500/15 text-amber-800 ring-amber-400/30' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-500/15 text-rose-700 ring-rose-400/30' },
  refund_pending: { label: 'Refund Pending', className: 'bg-orange-500/15 text-orange-700 ring-orange-400/30' },
  refund_completed: { label: 'Refund Completed', className: 'bg-violet-500/15 text-violet-700 ring-violet-400/30' },
};

export const CONFIRMATION_CONFIG = {
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-700' },
  requested: { label: 'Requested', className: 'bg-sky-500/15 text-sky-700' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-500/15 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-500/15 text-rose-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500/15 text-slate-600' },
};

export const TICKET_STATUS_CONFIG = {
  open: { label: 'Open', className: 'bg-rose-500/15 text-rose-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-700' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/15 text-emerald-700' },
  closed: { label: 'Closed', className: 'bg-slate-500/15 text-slate-600' },
};

export const ISSUE_CATEGORIES = {
  hotel_issue: 'Hotel Issue',
  cab_delay: 'Cab Delay',
  refund_request: 'Refund Request',
  activity_issue: 'Activity Issue',
  payment_issue: 'Payment Issue',
  general: 'General',
};

export const VOUCHER_STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-slate-500/15 text-slate-600' },
  issued: { label: 'Issued', className: 'bg-sky-500/15 text-sky-700' },
  sent: { label: 'Sent', className: 'bg-teal-500/15 text-teal-700' },
  redeemed: { label: 'Redeemed', className: 'bg-emerald-500/15 text-emerald-700' },
};

export const VENDOR_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'cab', label: 'Cab / Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'local_guide', label: 'Local Guide' },
];
