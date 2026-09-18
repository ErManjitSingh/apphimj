import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, UserCheck, Building2 } from 'lucide-react';
import { fetchLeadTransferHistory } from '../../services/leadEnterpriseApi';
import LazySection from '../ui/LazySection';
import { DETAIL_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';

const TYPE_LABELS = {
  assign: 'Assigned',
  reassign: 'Reassigned',
  bulk_assign: 'Bulk Assigned',
  lead_transfer: 'Lead Transfer',
};

const TYPE_ICONS = {
  assign: UserCheck,
  reassign: UserCheck,
  bulk_assign: UserCheck,
  lead_transfer: Building2,
};

function formatEntry(row) {
  if (row.type === 'lead_transfer') {
    const from = row.fromBranchId?.name || row.fromBranchId?.code || 'Previous branch';
    const to = row.toBranchId?.name || row.toBranchId?.code || 'New branch';
    return `${from} → ${to}`;
  }
  const from = row.fromUserId?.name || 'Unassigned';
  const to = row.toUserId?.name || '—';
  return `${from} → ${to}`;
}

function TransferHistoryContent({ leadId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['lead-transfer-history', leadId],
    queryFn: () => fetchLeadTransferHistory(leadId),
    staleTime: DETAIL_STALE_MS,
    gcTime: GC_TIME_MS,
  });

  const rows = data?.data || [];

  if (isLoading) return <p className="text-sm text-content-muted py-2">Loading...</p>;
  if (!rows.length) return <p className="text-sm text-content-muted py-2">No transfers recorded yet</p>;

  return (
    <ul className="space-y-3 pt-3">
      {rows.map((row) => {
        const Icon = TYPE_ICONS[row.type] || ArrowRightLeft;
        const when = row.createdAt
          ? new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : '';
        return (
          <li key={row._id} className="flex gap-3 text-sm">
            <div className="p-1.5 rounded-lg bg-surface-elevated text-content-muted h-fit">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-content-primary">{TYPE_LABELS[row.type] || row.type}</p>
              <p className="text-content-secondary truncate">{formatEntry(row)}</p>
              <p className="text-xs text-content-muted mt-0.5">
                {row.actorName || row.actorId?.name || 'System'} · {when}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function LeadTransferHistory({ leadId }) {
  return (
    <LazySection
      title="Transfer History"
      subtitle="Assignment and branch transfers"
      icon={ArrowRightLeft}
    >
      <TransferHistoryContent leadId={leadId} />
    </LazySection>
  );
}
