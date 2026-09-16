import { motion } from 'framer-motion';

/** Page title only — Add Lead lives in the global header. */
export default function LeadPageHeader({ title, subtitle, total }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="mb-0.5 flex items-center gap-2.5">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">{title}</h1>
        {total != null && (
          <span className="metric-tabular rounded-lg bg-orange-500 px-2.5 py-0.5 text-sm font-bold text-white shadow-sm">
            {total.toLocaleString('en-IN')}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">
        {subtitle || 'Manage and track all your travel enquiries in one place.'}
      </p>
    </motion.div>
  );
}
