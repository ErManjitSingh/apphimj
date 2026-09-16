import { cn } from '../../lib/utils';

/** Shared chrome for all CRM lead lists (admin / manager / leader / executive). */
export const LEAD_LIST_CONTAINER =
  'overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80';

export const LEAD_LIST_TH =
  'whitespace-nowrap border-b border-slate-200/80 bg-[#F8FAFC] px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400';

export const LEAD_LIST_TD = 'border-b border-slate-100/90 px-3 py-3.5 align-middle text-sm';

export const LEAD_LIST_ROW_HOVER =
  'transition-colors duration-150 hover:bg-orange-50/50';

export function leadListRowBg(index) {
  return index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
}

export function leadListStickyBg(index) {
  return index % 2 === 0
    ? 'bg-white group-hover:bg-orange-50/50'
    : 'bg-slate-50/40 group-hover:bg-orange-50/50';
}

export function leadListRowClass(index, extra) {
  return cn(leadListRowBg(index), LEAD_LIST_ROW_HOVER, extra);
}

export function leadRowAccentClass(lead) {
  const status = String(lead?.status || '');
  if (status === 'converted') return 'border-l-[3px] border-l-emerald-500';
  if (status === 'lost' || status === 'booked_from_another_company') return 'border-l-[3px] border-l-red-500';
  if (status === 'new') return 'border-l-[3px] border-l-sky-400';
  if (lead?.isHot || status === 'quotation_sent' || status === 'negotiation') {
    return 'border-l-[3px] border-l-rose-500';
  }
  if (status === 'contacted' || status === 'follow_up' || status === 'working_progress') {
    return 'border-l-[3px] border-l-amber-400';
  }
  return 'border-l-[3px] border-l-violet-400';
}
