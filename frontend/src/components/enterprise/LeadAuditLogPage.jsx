import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Shield, ChevronRight } from 'lucide-react';
import { useGlobalAuditQuery } from '../../features/leads/hooks/useGlobalAuditQuery';
import { Button } from '../ui/button';
import TablePagination from '../ui/TablePagination';
import { compactTable, compactTh, compactTd } from '../ui/compactTable';

const ACTION_LABELS = {
  'lead.created': 'Created',
  'lead.updated': 'Updated',
  'lead.deleted': 'Deleted',
  'lead.restored': 'Restored',
  'lead.assigned': 'Assigned',
  'lead.merged': 'Merged',
  'lead.status_changed': 'Status Changed',
  'lead.call_note_added': 'Call Note',
};

function AuditRow({ row, index, measureRef }) {
  const changes = (row.changes || []).slice(0, 2);
  const changeText = changes.length
    ? changes.map((c) => `${c.field}: ${c.oldValue ?? '—'} → ${c.newValue ?? '—'}`).join('; ')
    : row.meta?.outcome || '—';

  return (
    <tr data-index={index} ref={measureRef} className="hover:bg-brand-500/[0.03]">
      <td className={`${compactTd} whitespace-nowrap text-content-secondary`}>
        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
      </td>
      <td className={compactTd}>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-700">
          {ACTION_LABELS[row.action] || row.action}
        </span>
      </td>
      <td className={compactTd}>{row.actorName || 'System'}</td>
      <td className={`${compactTd} max-w-[280px] truncate text-content-muted text-xs`} title={changeText}>
        {changeText}
      </td>
      <td className={compactTd}>
        {row.entityId && (
          <Link to={`/leads/${row.entityId}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              Lead <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </td>
    </tr>
  );
}

export default function LeadAuditLogPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const pageSize = 30;
  const scrollRef = useRef(null);

  const { data, isLoading } = useGlobalAuditQuery({
    page: pageIndex + 1,
    limit: pageSize,
    action: actionFilter,
  });

  useEffect(() => {
    setPageIndex(0);
  }, [actionFilter]);

  const rows = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const loading = isLoading && !data;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-brand-600" />
            <h1 className="text-2xl font-bold text-content-primary">Audit Log</h1>
          </div>
          <p className="text-sm text-content-muted">Immutable field-level change history for leads</p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-subtle bg-surface px-3 py-2 text-sm h-10 min-w-[180px]"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-subtle bg-surface p-16 text-center text-content-muted">Loading...</div>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-subtle bg-surface p-12 text-center text-content-muted">No audit entries</div>
      ) : (
        <div className="rounded-2xl border border-subtle bg-surface shadow-sm overflow-hidden">
          <div ref={scrollRef} className="overflow-auto max-h-[min(70vh,640px)]">
            <table className={compactTable}>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-subtle bg-surface-elevated/50">
                  {['When', 'Action', 'Actor', 'Changes', ''].map((h) => (
                    <th key={h || 'a'} className={compactTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {paddingTop > 0 && (
                  <tr aria-hidden>
                    <td colSpan={5} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => (
                  <AuditRow
                    key={rows[virtualRow.index]._id}
                    row={rows[virtualRow.index]}
                    index={virtualRow.index}
                    measureRef={rowVirtualizer.measureElement}
                  />
                ))}
                {paddingBottom > 0 && (
                  <tr aria-hidden>
                    <td colSpan={5} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            total={total}
            onPageChange={setPageIndex}
            totalLabel="entries"
          />
        </div>
      )}
    </div>
  );
}
