export default function LeadListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="space-y-0 divide-y divide-slate-50">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5 animate-pulse rounded bg-slate-100" />
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-50" />
              </div>
            </div>
            <div className="hidden h-4 w-28 animate-pulse rounded bg-slate-50 sm:block" />
            <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-50 md:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-slate-50 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
