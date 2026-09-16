export default function LeadListSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-0 divide-y divide-slate-50">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-56 animate-pulse rounded-full bg-slate-50" />
              </div>
            </div>
            <div className="hidden h-7 w-28 animate-pulse rounded-full bg-slate-50 sm:block" />
            <div className="hidden h-7 w-24 animate-pulse rounded-full bg-slate-50 md:block" />
            <div className="hidden h-7 w-20 animate-pulse rounded-full bg-slate-50 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
