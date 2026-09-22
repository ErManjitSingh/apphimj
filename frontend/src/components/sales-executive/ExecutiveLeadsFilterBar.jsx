import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, RotateCcw } from 'lucide-react';
import { DESTINATIONS, INDIAN_STATES } from '../leads/constants';
import { LEAD_SOURCE_FILTER_OPTIONS } from '../../lib/leadSourceLabels';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
} from '../../lib/leadPipeline';
import { executiveInput } from './executivePageStyles';
import PeriodPresetChips from '../ui/PeriodPresetChips';

const AGENT_SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Meta Ads / Facebook' },
  { value: 'website', label: 'Website Form' },
  { value: 'organic', label: 'Organic / Direct' },
  { value: 'manual', label: 'Manual Entry' },
  ...LEAD_SOURCE_FILTER_OPTIONS.filter(
    (o) => o.value && !['website', 'google_ads', 'facebook_ads', 'organic'].includes(o.value)
  ),
];

export default function ExecutiveLeadsFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  destinationFilter,
  onDestinationChange,
  stateFilter = '',
  onStateChange,
  priorityFilter,
  onPriorityChange,
  sourceFilter = '',
  onSourceChange,
  temperatureFilter = '',
  onTemperatureChange,
  showStatusFilter = true,
  showAddLead = true,
  dateFrom = '',
  dateTo = '',
  onPeriodSelect,
  onApplyFilters,
  onClearFilters,
}) {
  const [draft, setDraft] = useState({
    search: search || '',
    status: statusFilter || '',
    destination: destinationFilter || '',
    state: stateFilter || '',
    source: sourceFilter || '',
    temperature: temperatureFilter || '',
    priority: priorityFilter || '',
  });

  useEffect(() => {
    setDraft({
      search: search || '',
      status: statusFilter || '',
      destination: destinationFilter || '',
      state: stateFilter || '',
      source: sourceFilter || '',
      temperature: temperatureFilter || '',
      priority: priorityFilter || '',
    });
  }, [
    search,
    statusFilter,
    destinationFilter,
    stateFilter,
    sourceFilter,
    temperatureFilter,
    priorityFilter,
  ]);

  const patchDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const apply = () => {
    onSearchChange?.(draft.search);
    onStatusChange?.(draft.status);
    onDestinationChange?.(draft.destination);
    onStateChange?.(draft.state);
    onSourceChange?.(draft.source);
    onTemperatureChange?.(draft.temperature);
    onPriorityChange?.(draft.priority);
    onApplyFilters?.();
  };

  const clear = () => {
    const empty = {
      search: '',
      status: '',
      destination: '',
      state: '',
      source: '',
      temperature: '',
      priority: '',
    };
    setDraft(empty);
    onSearchChange?.('');
    onStatusChange?.('');
    onDestinationChange?.('');
    onStateChange?.('');
    onSourceChange?.('');
    onTemperatureChange?.('');
    onPriorityChange?.('');
    onClearFilters?.();
  };

  return (
    <div className="rounded-2xl border border-subtle bg-white dark:bg-slate-900 shadow-sm p-4 space-y-3">
      {onPeriodSelect && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-content-muted">
            Date range
          </p>
          <PeriodPresetChips dateFrom={dateFrom} dateTo={dateTo} onSelect={onPeriodSelect} />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input
          value={draft.search}
          onChange={(e) => patchDraft('search', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
          }}
          placeholder="Search by name, mobile, or lead ID…"
          className={`w-full h-10 pl-10 pr-4 ${executiveInput}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <select
          value={draft.source}
          onChange={(e) => patchDraft('source', e.target.value)}
          className={`h-10 px-3 ${executiveInput}`}
        >
          {AGENT_SOURCE_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={draft.temperature}
          onChange={(e) => patchDraft('temperature', e.target.value)}
          className={`h-10 px-3 ${executiveInput}`}
        >
          <option value="">Lead temperature</option>
          {LEAD_TEMPERATURE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {showStatusFilter && (
          <select
            value={draft.status}
            onChange={(e) => patchDraft('status', e.target.value)}
            className={`h-10 px-3 ${executiveInput}`}
          >
            <option value="">Pipeline status</option>
            {LEAD_PIPELINE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={draft.destination}
          onChange={(e) => patchDraft('destination', e.target.value)}
          className={`h-10 px-3 ${executiveInput}`}
        >
          <option value="">Destination</option>
          {DESTINATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={draft.state}
          onChange={(e) => patchDraft('state', e.target.value)}
          className={`h-10 px-3 ${executiveInput}`}
        >
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={apply}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#5D5FEF] hover:bg-[#4F51E0] text-white text-sm font-semibold shadow-md shadow-[#5D5FEF]/25 transition-colors"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-subtle bg-white dark:bg-slate-900 text-sm font-medium text-content-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-content-muted" />
          Clear Filters
        </button>

        {showAddLead && (
          <Link
            to="/sales-executive/leads/add"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#5D5FEF] hover:bg-[#4F51E0] text-white text-sm font-semibold shadow-md shadow-[#5D5FEF]/25 transition-colors ml-auto"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        )}
      </div>
    </div>
  );
}
