import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Calendar, Inbox, MapPin, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { openCrmWhatsApp } from '../../lib/openCrmWhatsApp';
import { getLeadListStatusDisplay } from '../../lib/executiveStatusDisplay';
import Avatar from '../ui/Avatar';
import TablePagination, { DEFAULT_PAGE_SIZE } from '../ui/TablePagination';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { formatBudget } from '../sales-manager/managerUtils';

const defaultMenuActions = {
  view: true,
  edit: true,
  assign: true,
  transferBranch: true,
  delete: true,
};

const DEST_PILL = {
  Manali: 'bg-rose-50 text-rose-600 ring-rose-100',
  Goa: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  Ladakh: 'bg-sky-50 text-sky-600 ring-sky-100',
  Dharamshala: 'bg-orange-50 text-orange-600 ring-orange-100',
  Rajasthan: 'bg-violet-50 text-violet-600 ring-violet-100',
};

function statusPill(lead) {
  const status = String(lead?.status || '');
  const map = {
    new: { label: 'New', className: 'bg-sky-50 text-sky-600 ring-sky-100' },
    follow_up: { label: 'Follow-up', className: 'bg-orange-50 text-orange-600 ring-orange-100' },
    contacted: { label: 'Follow-up', className: 'bg-orange-50 text-orange-600 ring-orange-100' },
    working_progress: { label: 'Follow-up', className: 'bg-orange-50 text-orange-600 ring-orange-100' },
    qualified: { label: 'Interested', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
    hot: { label: 'Interested', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
    negotiation: { label: 'Interested', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
    quotation_sent: { label: 'Quotation', className: 'bg-teal-50 text-teal-700 ring-teal-100' },
    converted: { label: 'Converted', className: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    lost: { label: 'Lost', className: 'bg-rose-50 text-rose-600 ring-rose-100' },
    booked_from_another_company: { label: 'Lost', className: 'bg-rose-50 text-rose-600 ring-rose-100' },
  };
  if (map[status]) return map[status];
  const display = getLeadListStatusDisplay(lead);
  return {
    label: display.mainLabel || 'No status',
    className: 'bg-slate-50 text-slate-600 ring-slate-100',
  };
}

function NameCell({ lead }) {
  const isNew = lead?.status === 'new';
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={lead?.name} size="sm" className="!h-9 !w-9 !text-[11px]" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold text-slate-900">{lead?.name || '—'}</p>
          {isNew ? (
            <span className="shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-600 ring-1 ring-sky-100">
              New
            </span>
          ) : null}
        </div>
        <p className="truncate text-[11px] text-slate-400">{lead?.email || 'No email'}</p>
      </div>
    </div>
  );
}

function ContactCell({ lead }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phone = lead?.phone;
  if (!phone) return <span className="text-sm text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[13px] text-slate-600">{phone}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openCrmWhatsApp({
            leadId: lead?._id,
            phone,
            navigate,
            role: user?.role,
            toast,
          });
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
        aria-label="Open CRM WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5" fill="currentColor" />
      </button>
    </div>
  );
}

function DestCell({ name }) {
  if (!name) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
        DEST_PILL[name] || 'bg-slate-50 text-slate-600 ring-slate-100'
      )}
    >
      <MapPin className="h-3 w-3" />
      {name}
    </span>
  );
}

const thClass =
  'whitespace-nowrap border-b border-slate-100 bg-white px-3 py-3 text-left text-[11px] font-semibold text-slate-400';
const tdClass = 'border-b border-slate-50 px-3 py-3 align-middle';

export default function LeadDataTable({
  leads,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  onDelete,
  onAssign,
  onTransferBranch,
  onAccepted,
  onAcceptExpired,
  canEditLead = true,
  menuActions = defaultMenuActions,
  showAssignButton = true,
  serverPagination = null,
  listTitle = 'Leads List',
  onExport,
}) {
  void onDelete;
  void onAssign;
  void onTransferBranch;
  void onAccepted;
  void onAcceptExpired;
  void canEditLead;
  void menuActions;
  void showAssignButton;
  void onExport;

  const isServer = Boolean(serverPagination);
  const [clientPagination, setClientPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
  const scrollRef = useRef(null);

  const pagination = isServer
    ? { pageIndex: serverPagination.pageIndex, pageSize: serverPagination.pageSize }
    : clientPagination;

  useEffect(() => {
    if (!isServer) {
      setClientPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  }, [leads.length, isServer]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-slate-300 accent-orange-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 accent-orange-500"
          />
        ),
        size: 40,
      },
      {
        id: 'index',
        header: '#',
        cell: ({ row }) => (
          <span className="text-[13px] font-medium text-slate-500">
            {pagination.pageIndex * pagination.pageSize + row.index + 1}
          </span>
        ),
        size: 44,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <NameCell lead={row.original} />,
      },
      {
        accessorKey: 'phone',
        header: 'Contact',
        cell: ({ row }) => <ContactCell lead={row.original} />,
      },
      {
        accessorKey: 'destination',
        header: 'Destination',
        cell: ({ getValue }) => <DestCell name={getValue()} />,
      },
      {
        accessorKey: 'travelDate',
        header: 'Travel Date',
        cell: ({ getValue }) => {
          const date = getValue();
          if (!date) return <span className="text-sm text-slate-400">—</span>;
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          );
        },
      },
      {
        accessorKey: 'budget',
        header: 'Budget',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-[13px] font-semibold text-slate-800">
            {formatBudget(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const pill = statusPill(row.original);
          return (
            <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', pill.className)}>
              {pill.label}
            </span>
          );
        },
      },
    ],
    [pagination.pageIndex, pagination.pageSize]
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: { rowSelection, pagination },
    onRowSelectionChange,
    onPaginationChange: isServer ? serverPagination.onPaginationChange : setClientPagination,
    manualPagination: isServer,
    pageCount: isServer ? serverPagination.pageCount : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isServer ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getRowId: (row) => row._id,
    enableRowSelection: true,
  });

  const tableRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
          <Inbox className="h-7 w-7" />
        </span>
        <p className="text-base font-bold text-slate-900">No leads match your filters</p>
        <p className="mt-1 text-sm text-slate-500">Try adjusting filters or add a new lead</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div ref={scrollRef} className="max-h-[min(70vh,680px)] overflow-auto">
          <table className="w-full min-w-[920px] table-auto border-collapse text-sm">
            <thead className="sticky top-0 z-20">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className={thClass}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden>
                  <td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    onClick={() => onRowClick(row.original)}
                    className="cursor-pointer bg-white transition-colors hover:bg-orange-50/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={tdClass}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden>
                  <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isServer ? (
          <TablePagination
            pageIndex={serverPagination.pageIndex}
            pageSize={serverPagination.pageSize}
            pageCount={serverPagination.pageCount}
            total={serverPagination.total}
            hasMore={serverPagination.hasMore}
            onPageChange={(pageIndex) =>
              serverPagination.onPaginationChange((prev) => ({ ...prev, pageIndex }))
            }
            onPageSizeChange={(pageSize) =>
              serverPagination.onPaginationChange({ pageIndex: 0, pageSize })
            }
            totalLabel="leads"
            className="border-t border-slate-100 bg-white"
          />
        ) : (
          <TablePagination table={table} totalLabel="leads" className="border-t border-slate-100 bg-white" />
        )}
      </div>
    </TooltipProvider>
  );
}
