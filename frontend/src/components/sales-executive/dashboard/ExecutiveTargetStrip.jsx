import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { formatCurrency } from '../executiveUtils';

/**
 * Compact monthly target strip for the SE dashboard.
 * Achieved = converted package cost (subtracts from admin-set target).
 * Remaining = target − achieved.
 */
export default function ExecutiveTargetStrip({ target, now = new Date() }) {
  if (!target) return null;

  const monthlyTarget = Number(
    target.monthlyTarget || target.totalSalesTarget || target.revenueTarget || 0
  );
  const achieved = Number(
    target.packageTurnoverAchieved ?? target.revenueAchieved ?? 0
  );
  const remaining = Math.max(
    0,
    Number(target.remaining != null ? target.remaining : monthlyTarget - achieved)
  );
  const collection = Number(target.collectionAchieved || 0);
  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(target.progress) ||
        (monthlyTarget > 0 ? Math.round((achieved / monthlyTarget) * 100) : 0)
    )
  );
  const month = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const setBy = target.setByName ? ` · Set by ${target.setByName}` : '';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Your target · {month}
              {setBy}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {formatCurrency(achieved)}
              <span className="font-medium text-slate-400"> / {formatCurrency(monthlyTarget)}</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Converted package cost vs admin target · Collection {formatCurrency(collection)}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 sm:max-w-md">
          <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Achieved</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-emerald-800">
              {formatCurrency(achieved)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-600">Remaining</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-amber-800">
              {formatCurrency(remaining)}
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 px-2.5 py-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wide text-sky-600">Progress</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-sky-800">{progress}%</p>
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-r-full bg-gradient-to-r from-orange-400 to-emerald-400"
        />
      </div>
    </motion.section>
  );
}
