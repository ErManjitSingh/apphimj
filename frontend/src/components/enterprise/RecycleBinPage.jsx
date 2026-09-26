import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, Trash2, ChevronRight } from 'lucide-react';
import {
  fetchRecycleBin,
  restoreLead,
  bulkRestoreLeads,
  bulkPermanentDeleteLeads,
} from '../../services/leadEnterpriseApi';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { compactTable, compactTh, compactTd } from '../ui/compactTable';
import API from '../../api/axios';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { cn } from '../../lib/utils';

export default function RecycleBinPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || user?.permissions?.leads?.delete;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const { confirm, dialogNode } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRecycleBin({ page, limit: 15 });
      setRows(res?.data || []);
      setTotal(res?.pagination?.total || 0);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageIds = useMemo(() => rows.map((r) => r._id), [rows]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;
  const selectedCount = selectedIds.size;

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleRestore = async (id) => {
    await restoreLead(id);
    load();
  };

  const handlePermanentDelete = async (lead) => {
    const ok = await confirm({
      title: 'Permanently delete lead?',
      message: `${lead.name} will be removed forever. This cannot be undone.`,
      confirmLabel: 'Delete Forever',
      tone: 'danger',
    });
    if (!ok) return;
    await API.delete(`/leads/${lead._id}/permanent`);
    load();
  };

  const handleBulkRestore = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const ok = await confirm({
      title: `Restore ${ids.length} lead(s)?`,
      message: 'Selected leads will be moved back to the active lead list.',
      confirmLabel: 'Restore',
      tone: 'default',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await bulkRestoreLeads(ids);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const ok = await confirm({
      title: `Permanently delete ${ids.length} lead(s)?`,
      message: 'Selected leads will be removed forever. This cannot be undone.',
      confirmLabel: 'Delete Forever',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await bulkPermanentDeleteLeads(ids);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Recycle Bin</h1>
          <p className="text-sm text-content-muted mt-1">
            Soft-deleted leads — select, restore, or permanently remove
          </p>
        </div>
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-content-secondary">
              {selectedCount} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              disabled={busy}
              onClick={handleBulkRestore}
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              Restore selected
            </Button>
            {canDelete ? (
              <Button
                variant="destructive"
                size="sm"
                className="h-9 gap-1.5"
                disabled={busy}
                onClick={handleBulkPermanentDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete forever
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              disabled={busy}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-subtle bg-surface p-16 text-center text-content-muted">
          Loading...
        </div>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-subtle bg-surface p-16 text-center">
          <ArchiveRestore className="w-10 h-10 text-content-muted mx-auto mb-3 opacity-50" />
          <p className="text-content-muted">Recycle bin is empty</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-subtle bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={compactTable}>
              <thead>
                <tr className="border-b border-subtle bg-surface-elevated/50">
                  <th className={cn(compactTh, 'w-10')}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected;
                      }}
                      onChange={toggleAllPage}
                      className="rounded border-slate-300 accent-blue-600 w-4 h-4"
                      aria-label="Select all on page"
                    />
                  </th>
                  {['Customer', 'Phone', 'Deleted', 'Deleted By', 'Actions'].map((h) => (
                    <th key={h} className={compactTh}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {rows.map((lead) => {
                  const checked = selectedIds.has(lead._id);
                  return (
                    <tr
                      key={lead._id}
                      className={cn(
                        'hover:bg-brand-500/[0.03]',
                        checked && 'bg-blue-50/60'
                      )}
                    >
                      <td className={compactTd}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(lead._id)}
                          className="rounded border-slate-300 accent-blue-600 w-4 h-4"
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>
                      <td className={`${compactTd} font-medium`}>{lead.name}</td>
                      <td className={compactTd}>{lead.phone}</td>
                      <td className={compactTd}>
                        {lead.deletedAt
                          ? new Date(lead.deletedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className={compactTd}>{lead.deletedBy?.name || '—'}</td>
                      <td className={compactTd}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleRestore(lead._id)}
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-600 gap-1"
                              onClick={() => handlePermanentDelete(lead)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Link to={`/leads/${lead._id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-subtle text-sm">
              <span className="text-content-muted">
                {total} deleted · Page {page}/{pageCount}
                {selectedCount ? ` · ${selectedCount} selected` : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {dialogNode}
    </div>
  );
}
