import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Car,
  IndianRupee,
  Layers,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatINR } from '../operationsUtils';
import { Button } from '../../ui/button';

const FIELDS = [
  { key: 'hotelCost', label: 'Hotel cost', icon: Building2, accent: 'text-teal-700 bg-teal-500/10' },
  { key: 'cabCost', label: 'Cab cost', icon: Car, accent: 'text-sky-700 bg-sky-500/10' },
  { key: 'otherCost', label: 'Other cost', icon: Layers, accent: 'text-violet-700 bg-violet-500/10' },
  { key: 'packageCost', label: 'Total package', icon: IndianRupee, accent: 'text-blue-700 bg-blue-500/10' },
  { key: 'profitAmount', label: 'Profit on file', icon: Sparkles, accent: 'text-emerald-700 bg-emerald-500/10', isProfit: true },
];

function toDraft(costing = {}) {
  return {
    hotelCost: Number(costing.hotelCost) || 0,
    cabCost: Number(costing.cabCost) || 0,
    otherCost: Number(costing.otherCost) || 0,
    packageCost: Number(costing.packageCost) || 0,
    profitAmount: Number(costing.profitAmount) || 0,
    profitMargin: Number(costing.profitMargin) || 0,
    notes: costing.notes || '',
  };
}

function recomputeProfit(draft, { lockProfit } = {}) {
  const hotelCost = Number(draft.hotelCost) || 0;
  const cabCost = Number(draft.cabCost) || 0;
  const otherCost = Number(draft.otherCost) || 0;
  const packageCost = Number(draft.packageCost) || 0;
  const profitAmount = lockProfit
    ? Number(draft.profitAmount) || 0
    : Math.round((packageCost - (hotelCost + cabCost + otherCost)) * 100) / 100;
  const profitMargin =
    packageCost > 0 ? Math.round((profitAmount / packageCost) * 1000) / 10 : 0;
  return { ...draft, hotelCost, cabCost, otherCost, packageCost, profitAmount, profitMargin };
}

export default function OpsCostingHeader({
  costing,
  quoteCosting,
  saving = false,
  onSave,
  onResetToQuote,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(costing));
  const [profitLocked, setProfitLocked] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(toDraft(costing));
  }, [costing, editing]);

  const source = costing?.source || 'quotation';
  const margin = Number(editing ? draft.profitMargin : costing?.profitMargin) || 0;

  const cards = useMemo(() => {
    const values = editing ? draft : toDraft(costing);
    return FIELDS.map((field) => ({
      ...field,
      value: values[field.key],
    }));
  }, [costing, draft, editing]);

  const setField = (key, raw) => {
    const num = raw === '' ? '' : Number(raw);
    setDraft((prev) => {
      const next = { ...prev, [key]: Number.isFinite(num) ? num : 0 };
      if (key === 'profitAmount') {
        setProfitLocked(true);
        const packageCost = Number(next.packageCost) || 0;
        const profitAmount = Number(next.profitAmount) || 0;
        return {
          ...next,
          profitMargin: packageCost > 0 ? Math.round((profitAmount / packageCost) * 1000) / 10 : 0,
        };
      }
      return recomputeProfit(next, { lockProfit: profitLocked && key !== 'packageCost' });
    });
  };

  const handleSave = async () => {
    const payload = recomputeProfit(draft, { lockProfit: profitLocked });
    await onSave?.(payload);
    setEditing(false);
    setProfitLocked(false);
  };

  const handleCancel = () => {
    setDraft(toDraft(costing));
    setEditing(false);
    setProfitLocked(false);
  };

  const handleReset = async () => {
    if (!quoteCosting) return;
    await onResetToQuote?.({ ...toDraft(quoteCosting), resetToQuote: true });
    setEditing(false);
    setProfitLocked(false);
  };

  return (
    <div className="mt-5 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-subtle/70 bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/60">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Ops commercial · on file
          </p>
          <p className="text-xs text-content-muted">
            {source === 'ops' ? 'Edited by operations' : 'Seeded from quotation'}
            {costing?.updatedByName ? ` · ${costing.updatedByName}` : ''}
            {margin ? ` · ${margin}% margin` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl h-8 gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit costs
            </Button>
          ) : (
            <>
              {quoteCosting && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 gap-1.5"
                  disabled={saving}
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to quote
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-8 gap-1.5"
                disabled={saving}
                onClick={handleCancel}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="teal"
                size="sm"
                className="rounded-xl h-8 gap-1.5"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 divide-x divide-y xl:divide-y-0 divide-subtle/80">
        {cards.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key} className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg', field.accent)}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wide text-content-muted">
                  {field.label}
                </p>
              </div>
              {editing ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-content-muted">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft[field.key]}
                    onChange={(e) => setField(field.key, e.target.value)}
                    className="w-full h-9 rounded-xl border border-subtle bg-white pl-6 pr-2 text-sm font-bold tabular-nums text-content-primary outline-none focus:ring-2 focus:ring-teal-500/25"
                  />
                </div>
              ) : (
                <p
                  className={cn(
                    'text-lg font-black tabular-nums tracking-tight',
                    field.isProfit ? 'text-emerald-700' : 'text-content-primary'
                  )}
                >
                  {formatINR(field.value)}
                </p>
              )}
              {field.isProfit && !editing && (
                <p className="text-[11px] text-emerald-700/80 font-semibold mt-0.5">
                  {margin ? `${margin}% on package` : 'Margin on file'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
