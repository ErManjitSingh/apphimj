import { Phone, MessageCircle, Mail, CheckCircle2, CalendarClock, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from '../ui/Avatar';
import FollowUpPriorityBadge from './FollowUpPriorityBadge';
import FollowUpCategoryBadge from './FollowUpCategoryBadge';
import { formatFollowUpDate, enrichFollowUp } from './followupUtils';
import {
  DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { compactTable, compactTh, compactTd } from '../ui/compactTable';
import { beginLeadCall } from '../../lib/callSession';

export default function FollowUpDataTable({
  followups,
  onSelect,
  onComplete,
  onReschedule,
  readOnly = false,
  serverPagination = null,
}) {
  const isServer = Boolean(serverPagination);

  if (!followups.length) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface p-12 text-center text-content-muted">
        No follow-ups match your filters
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-subtle bg-surface shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className={compactTable}>
          <thead>
            <tr className="border-b border-subtle bg-surface-elevated/50">
              {['Customer', 'Phone', 'Destination', 'Executive', 'Date', 'Category', 'Priority', ...(readOnly ? [] : ['Actions'])].map((h) => (
                <th key={h} className={compactTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {followups.map((raw) => {
              const f = enrichFollowUp(raw);
              const lead = f.lead || {};
              return (
                <tr
                  key={f._id}
                  onClick={() => onSelect?.(f)}
                  className="group hover:bg-brand-500/[0.03] cursor-pointer transition-colors"
                >
                  <td className={compactTd}>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[130px]">
                      <Avatar name={lead.name} size="sm" className="!w-7 !h-7 !text-[10px] shrink-0" />
                      <span className="text-[13px] font-medium text-content-primary truncate">{lead.name}</span>
                    </div>
                  </td>
                  <td className={`${compactTd} text-content-secondary`}>{lead.phone}</td>
                  <td className={`${compactTd} text-content-secondary max-w-[100px] truncate`}>{lead.destination}</td>
                  <td className={`${compactTd} text-content-secondary max-w-[100px] truncate`}>{f.assignedTo?.name || '—'}</td>
                  <td className={`${compactTd} text-content-secondary`}>{formatFollowUpDate(f.scheduledAt)}</td>
                  <td className={compactTd}><FollowUpCategoryBadge category={f.category || 'warm'} /></td>
                  <td className={compactTd}><FollowUpPriorityBadge priority={f.priority || lead.priority} /></td>
                  {!readOnly && (
                  <td className={compactTd} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={lead.phone ? `tel:${lead.phone}` : '#'}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!lead.phone) return;
                          beginLeadCall({ leadId: lead._id, leadName: lead.name, phone: lead.phone });
                        }}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : '#'} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-600" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-surface-elevated text-content-muted"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onComplete?.(f._id)}>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReschedule?.(f)}>
                            <CalendarClock className="w-4 h-4 mr-2 text-violet-600" /> Reschedule
                          </DropdownMenuItem>
                          {lead.email && (
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${lead.email}`}><Mail className="w-4 h-4 mr-2 text-sky-600" /> Send Email</a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenuRoot>
                    </div>
                  </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isServer && serverPagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-subtle bg-surface-elevated/30">
          <p className="text-sm text-content-muted">
            Showing{' '}
            <span className="font-semibold text-content-primary">
              {serverPagination.pageIndex * serverPagination.pageSize + 1}–
              {Math.min((serverPagination.pageIndex + 1) * serverPagination.pageSize, serverPagination.total)}
            </span>{' '}
            of <span className="font-semibold text-content-primary">{serverPagination.total}</span> follow-ups
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={serverPagination.pageIndex <= 0}
              onClick={() =>
                serverPagination.onPaginationChange((p) => ({
                  ...p,
                  pageIndex: Math.max(0, p.pageIndex - 1),
                }))
              }
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-sm font-medium text-content-secondary px-2 tabular-nums">
              Page {serverPagination.pageIndex + 1} of {serverPagination.pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={serverPagination.pageIndex + 1 >= serverPagination.pageCount}
              onClick={() =>
                serverPagination.onPaginationChange((p) => ({
                  ...p,
                  pageIndex: p.pageIndex + 1,
                }))
              }
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
