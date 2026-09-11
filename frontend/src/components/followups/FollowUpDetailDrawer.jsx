import { X, Phone, MessageCircle, Mail, CheckCircle2, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { Button } from '../ui/button';
import AppDrawer from '../ui/AppDrawer';
import FollowUpStatusBadge from './FollowUpStatusBadge';
import FollowUpPriorityBadge from './FollowUpPriorityBadge';
import FollowUpCategoryBadge from './FollowUpCategoryBadge';
import { formatFollowUpDateTime, enrichFollowUp } from './followupUtils';
import { beginLeadCall } from '../../lib/callSession';

export default function FollowUpDetailDrawer({ followup, onClose, onComplete, onReschedule, readOnly = false }) {
  const f = followup ? enrichFollowUp(followup) : null;
  const lead = f?.lead || {};

  return (
    <AppDrawer open={!!followup} onClose={onClose}>
      {f && (
        <>
          <div className="p-5 border-b border-subtle flex items-start justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Avatar name={lead.name} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-content-primary">{lead.name}</h3>
                <p className="text-sm text-content-muted">{lead.destination}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <FollowUpCategoryBadge category={f.category || 'warm'} />
                  <FollowUpStatusBadge status={f.effectiveStatus || f.status} />
                  <FollowUpPriorityBadge priority={f.priority || lead.priority} />
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-elevated"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-surface-elevated/50 border border-subtle">
                <p className="text-[10px] uppercase text-content-muted mb-1">Scheduled</p>
                <p className="font-medium text-content-primary">{formatFollowUpDateTime(f.scheduledAt)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated/50 border border-subtle">
                <p className="text-[10px] uppercase text-content-muted mb-1">Executive</p>
                <p className="font-medium text-content-primary">{f.assignedTo?.name || '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-content-muted mb-2">Remarks</p>
              <p className="text-sm text-content-secondary p-3 rounded-xl bg-surface-elevated/40 border border-subtle">{f.notes}</p>
            </div>

            {f.outcome && (
              <div>
                <p className="text-xs font-semibold uppercase text-content-muted mb-2">Outcome</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">{f.outcome}</p>
              </div>
            )}

            {f.history?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-content-muted mb-2">History</p>
                <div className="space-y-2">
                  {f.history.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl border border-subtle text-sm">
                      <p className="text-content-primary">{h.remarks}</p>
                      <p className="text-xs text-content-muted mt-1">{h.executive} · {formatFollowUpDateTime(h.date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-subtle space-y-2 shrink-0">
            <p className="text-xs font-semibold uppercase text-content-muted mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={lead.phone ? `tel:${lead.phone}` : '#'}
                onClick={(e) => {
                  e.preventDefault();
                  if (!lead.phone) return;
                  beginLeadCall({ leadId: lead._id, leadName: lead.name, phone: lead.phone });
                }}
              >
                <Button variant="emerald" className="w-full rounded-xl gap-2 h-10"><Phone className="w-4 h-4" /> Call</Button>
              </a>
              <a href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : '#'} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full rounded-xl gap-2 h-10 text-green-700 border-green-500/40 bg-green-500/10"><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`}>
                  <Button variant="outline" className="w-full rounded-xl gap-2 h-10 text-sky-700 border-sky-500/40 bg-sky-500/10"><Mail className="w-4 h-4" /> Email</Button>
                </a>
              )}
              {!readOnly && (
                <>
                  <Button variant="outline" onClick={() => onComplete?.(f._id)} className="rounded-xl gap-2 h-10 text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </Button>
                  <Button variant="outline" onClick={() => onReschedule?.(f)} className="rounded-xl gap-2 h-10 text-violet-700 border-violet-500/40 bg-violet-500/10 col-span-2">
                    <CalendarClock className="w-4 h-4" /> Reschedule
                  </Button>
                </>
              )}
            </div>
            <Link to={`/leads/${lead._id}`} className="block mt-2">
              <Button variant="outline" className="w-full rounded-xl h-10">View Lead Profile</Button>
            </Link>
          </div>
        </>
      )}
    </AppDrawer>
  );
}
