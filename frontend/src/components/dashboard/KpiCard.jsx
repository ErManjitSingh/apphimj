import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

export default function KpiCard({
  label,
  value,
  change,
  changeType = 'up',
  changeLabel = 'from last month',
  icon: Icon,
  iconColor = 'bg-blue-500',
  sparkColor = '#3B82F6',
  sparkData = [],
  index = 0,
  compact = false,
  dense = false,
  to,
}) {
  const chartData = sparkData.map((v, i) => ({ i, v }));
  const isUp = changeType === 'up';
  const isNeutral = changeType === 'neutral';
  const Shell = to ? Link : 'div';
  const shellProps = to ? { to } : {};

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
      <Shell
        {...shellProps}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl border border-subtle bg-white px-3 py-2.5 shadow-sm',
          'hover:shadow-md hover:border-sky-200/80 transition-all duration-200',
          to && 'cursor-pointer'
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm',
            iconColor
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">
              {label}
            </p>
            {change !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0',
                  isNeutral ? 'text-slate-400' : isUp ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {!isNeutral && (isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />)}
                {change}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0">
            <p className="text-base font-bold text-slate-900 metric-tabular tracking-tight leading-none truncate">
              {value}
            </p>
            {change !== undefined && changeLabel && (
              <p className="text-[9px] text-slate-400 truncate leading-none">{changeLabel}</p>
            )}
          </div>
        </div>
      </Shell>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
    <Shell
      {...shellProps}
      className={cn(
        'group relative flex flex-col justify-between border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        dense
          ? 'min-h-[74px] rounded-xl p-3'
          : 'min-h-[148px] rounded-2xl p-5',
        to && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40'
      )}
    >
      <div className={cn('flex items-start justify-between gap-2', dense ? 'mb-1' : 'mb-3')}>
        <div
          className={cn(
            'rounded-full flex items-center justify-center shrink-0 shadow-sm',
            dense ? 'w-7 h-7' : 'w-10 h-10',
            iconColor
          )}
        >
          <Icon
            className={cn('text-white', dense ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]')}
            strokeWidth={2}
          />
        </div>
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold shrink-0',
              dense ? 'text-[10px]' : 'text-[11px]',
              isNeutral ? 'text-content-muted' : isUp ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {!isNeutral && (isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
            {change}
          </span>
        )}
      </div>

      <p className={cn('font-medium text-content-muted mb-0.5 truncate', dense ? 'text-[10px]' : 'text-xs')}>
        {label}
      </p>
      <p
        className={cn(
          'font-bold text-content-primary metric-tabular tracking-tight leading-none',
          dense ? 'text-lg mb-0' : 'text-2xl mb-1'
        )}
      >
        {value}
      </p>
      {change !== undefined && changeLabel && !dense && (
        <p className="text-content-muted text-[11px] mb-2">{changeLabel}</p>
      )}

      {chartData.length > 0 && (
        <div
          className={cn(
            '-mx-1 mt-auto opacity-70 group-hover:opacity-100 transition-opacity',
            dense ? 'h-5' : 'h-10'
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`kpi-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} fill={`url(#kpi-${index})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Shell>
    </motion.div>
  );
}
