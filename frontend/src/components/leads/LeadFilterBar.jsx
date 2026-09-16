import { useEffect, useRef, useState } from 'react';
import { Search, RotateCcw, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DESTINATIONS,
  LEAD_STATUSES,
  TRAVEL_MONTHS,
  BUDGET_FILTER_OPTIONS,
  PRIORITY_FILTER_OPTIONS,
} from './constants';
import { INDIAN_STATES } from '../lead-wizard/constants';
import { LEAD_SOURCE_FILTER_OPTIONS } from '../../lib/leadSourceLabels';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import PeriodPresetChips from '../ui/PeriodPresetChips';
import { LIST_STATUS_FILTERS } from '../../lib/executiveStatusDisplay';
import { applyPeriodPreset } from '../../lib/periodFilters';
import { LIST_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import API from '../../api/axios';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400';

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function ChipButton({ active, onClick, children, activeClass, idleClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ring-1',
        active
          ? activeClass
          : idleClass || 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200/80'
      )}
    >
      {children}
    </button>
  );
}

function hasMoreFilterValues(filters = {}, canFilterBranch) {
  return Boolean(
    filters.branchId ||
      filters.teamId ||
      filters.state ||
      filters.priority ||
      filters.travelMonth ||
      (canFilterBranch && filters.branchId)
  );
}

export default function LeadFilterBar({
  filters,
  onChange,
  onApply,
  onReset,
  activeCount = 0,
  onPeriodSelect,
  onQuickFilter,
}) {
  const { user } = useAuth();
  const [executives, setExecutives] = useState([]);
  const [teams, setTeams] = useState([]);
  const [branches, setBranches] = useState([]);
  const canFilterBranch = ['admin', 'lead_provider', 'hr_admin', 'sales_manager'].includes(user?.role);
  const [mode, setMode] = useState('basic');
  const [showMore, setShowMore] = useState(() => hasMoreFilterValues(filters, canFilterBranch));
  const morePanelRef = useRef(null);

  useEffect(() => {
    API.get('/sales-manager/executives', { skipSuccessToast: true, skipErrorToast: true })
      .then((res) => setExecutives(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExecutives([]));
    API.get('/teams', { skipSuccessToast: true, skipErrorToast: true })
      .then((res) => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTeams([]));
  }, []);

  // Fetched directly (not via the redux branch-switcher state) so this dropdown works the
  // same for every role that can filter by branch, independent of the admin/lead_provider
  // "switch active branch" feature and its x-branch-id header side effects.
  useEffect(() => {
    if (!canFilterBranch) return;
    API.get('/branches', { skipSuccessToast: true, skipErrorToast: true })
      .then((res) => setBranches(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBranches([]));
  }, [canFilterBranch]);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const setBudgetRange = (value) => {
    const opt = BUDGET_FILTER_OPTIONS.find((o) => o.value === value);
    onChange({
      ...filters,
      budgetRange: value,
      budgetMin: opt?.min ?? '',
      budgetMax: opt?.max ?? '',
      budgetMinExclusive: opt?.minExclusive ? 'true' : '',
      budgetMaxExclusive: opt?.maxExclusive ? 'true' : '',
    });
  };

  const openMoreFilters = () => {
    setShowMore((v) => {
      const next = !v;
      if (next) {
        requestAnimationFrame(() => {
          morePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

  const applyQuick = (patch) => {
    const next = { ...filters, ...patch };
    if (onQuickFilter) onQuickFilter(next);
    else onChange(next);
  };

  const { data: stats } = useQuery({
    queryKey: ['leads', 'list-kpis'],
    queryFn: async () => {
      const { data } = await API.get('/leads/list-kpis', { skipSuccessToast: true });
      return data;
    },
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const isAll =
    !filters.status && !filters.filter && !filters.listStatus && filters.connected !== 'true';
  const statusChips = [
    {
      key: 'all',
      label: `All Leads (${fmt(stats?.totalLeads)})`,
      active: isAll,
      activeClass: 'bg-orange-500 text-white shadow-sm shadow-orange-500/25',
      idleClass: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      patch: { status: '', filter: '', listStatus: '', connected: '' },
    },
    {
      key: 'new',
      label: `New (${fmt(stats?.statusNewLeads ?? stats?.newLeads)})`,
      active: filters.status === 'new',
      activeClass: 'bg-sky-500 text-white shadow-sm shadow-sky-500/25',
      idleClass: 'bg-sky-50 text-sky-600 hover:bg-sky-100',
      patch: { status: 'new', filter: '', listStatus: '', connected: '' },
    },
    {
      key: 'follow_up',
      label: `Follow-up (${fmt(stats?.followUpLeads ?? stats?.followUpPending)})`,
      active: filters.status === 'follow_up',
      activeClass: 'bg-violet-500 text-white shadow-sm shadow-violet-500/25',
      idleClass: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
      patch: { status: 'follow_up', filter: '', listStatus: '', connected: '' },
    },
    {
      key: 'interested',
      label: `Interested (${fmt(stats?.interestedLeads)})`,
      active: filters.listStatus === 'hot',
      activeClass: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25',
      idleClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      patch: { status: '', filter: '', listStatus: 'hot', connected: '' },
    },
    {
      key: 'quotation',
      label: `Quotation (${fmt(stats?.quotationLeads)})`,
      active: filters.status === 'quotation_sent',
      activeClass: 'bg-teal-500 text-white shadow-sm shadow-teal-500/25',
      idleClass: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
      patch: { status: 'quotation_sent', filter: '', listStatus: '', connected: '' },
    },
    {
      key: 'converted',
      label: `Converted (${fmt(stats?.convertedLeads)})`,
      active: filters.status === 'converted' && filters.filter !== 'arrivals',
      activeClass: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
      idleClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      patch: { status: 'converted', filter: '', listStatus: '', connected: '' },
    },
  ];

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
          <Filter className="h-4 w-4" />
        </span>
        <h3 className="text-base font-bold text-slate-900">Filters</h3>
        {activeCount > 0 && (
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {activeCount} active
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 items-end gap-3 lg:grid-cols-[1fr_160px_160px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApply?.();
            }}
            placeholder="Search by name, phone, email, lead ID..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15"
          />
        </div>
        <div>
          <FieldLabel>Date From</FieldLabel>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <FieldLabel>Date To</FieldLabel>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600"
        >
          <Filter className="h-3.5 w-3.5" />
          Apply Filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-500 hover:bg-rose-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('advanced');
            openMoreFilters();
          }}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold',
            showMore || mode === 'advanced'
              ? 'border-orange-300 bg-orange-50 text-orange-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          More
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', (showMore || mode === 'advanced') && 'rotate-180')} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => applyQuick(chip.patch)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
              chip.active ? chip.activeClass : chip.idleClass
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {(mode === 'advanced' || showMore) && (
        <AnimatePresence initial={false}>
          <motion.div
            ref={morePanelRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="min-w-0">
                <FieldLabel>Period</FieldLabel>
                <PeriodPresetChips
                  colorful
                  accent="violet"
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onSelect={(key) => {
                    if (onPeriodSelect) onPeriodSelect(key);
                    else onChange({ ...filters, ...applyPeriodPreset(key) });
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <ChipButton
                  active={filters.filter === 'arrivals'}
                  activeClass="bg-amber-500 text-white shadow-sm shadow-amber-500/30 ring-amber-600/20"
                  idleClass="bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                  onClick={() =>
                    applyQuick(
                      filters.filter === 'arrivals'
                        ? { status: '', filter: '', listStatus: '' }
                        : { status: 'converted', filter: 'arrivals', listStatus: '' }
                    )
                  }
                >
                  Arrivals
                </ChipButton>
                {LIST_STATUS_FILTERS.map((chip) => (
                  <ChipButton
                    key={chip.value}
                    active={filters.listStatus === chip.value}
                    activeClass={chip.activeClass}
                    idleClass={chip.idleClass}
                    onClick={() =>
                      applyQuick(
                        filters.listStatus === chip.value
                          ? { listStatus: '' }
                          : { listStatus: chip.value, status: '', filter: '' }
                      )
                    }
                  >
                    {chip.label}
                  </ChipButton>
                ))}
                <ChipButton
                  active={filters.connected === 'true'}
                  activeClass="bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-blue-700/20"
                  idleClass="bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100"
                  onClick={() =>
                    applyQuick(
                      filters.connected === 'true' ? { connected: '' } : { connected: 'true' }
                    )
                  }
                >
                  Connected
                </ChipButton>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <select value={filters.source} onChange={(e) => set('source', e.target.value)} className={fieldClass}>
                    <option value="">All Sources</option>
                    {LEAD_SOURCE_FILTER_OPTIONS.filter((s) => s.value).map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Destination</FieldLabel>
                  <select
                    value={filters.destination}
                    onChange={(e) => set('destination', e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">All Destinations</option>
                    {DESTINATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Package Cost</FieldLabel>
                  <select
                    value={filters.budgetRange || ''}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className={fieldClass}
                  >
                    {BUDGET_FILTER_OPTIONS.map((b) => (
                      <option key={b.value || 'all'} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Executive</FieldLabel>
                  <select value={filters.agent} onChange={(e) => set('agent', e.target.value)} className={fieldClass}>
                    <option value="">All Executives</option>
                    {executives.map((ex) => (
                      <option key={ex._id} value={ex._id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                {canFilterBranch && (
                  <div>
                    <FieldLabel>Branch</FieldLabel>
                    <select
                      value={filters.branchId || ''}
                      onChange={(e) => set('branchId', e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <FieldLabel>Team</FieldLabel>
                  <select value={filters.teamId || ''} onChange={(e) => set('teamId', e.target.value)} className={fieldClass}>
                    <option value="">All Teams</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <select value={filters.state || ''} onChange={(e) => set('state', e.target.value)} className={fieldClass}>
                    <option value="">All States</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <select
                    value={filters.priority || ''}
                    onChange={(e) => set('priority', e.target.value)}
                    className={fieldClass}
                  >
                    {PRIORITY_FILTER_OPTIONS.map((p) => (
                      <option key={p.value || 'all'} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Travel Month</FieldLabel>
                  <select
                    value={filters.travelMonth}
                    onChange={(e) => set('travelMonth', e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">All Months</option>
                    {TRAVEL_MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Lead Status</FieldLabel>
                  <select
                    value={filters.listStatus || ''}
                    onChange={(e) =>
                      onChange({
                        ...filters,
                        listStatus: e.target.value,
                        status: '',
                        filter: '',
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="">All Statuses</option>
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
