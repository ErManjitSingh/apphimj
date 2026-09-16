export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-[132px] rounded-[22px] bg-slate-100" />
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[82px] rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="h-64 rounded-[24px] bg-slate-100 xl:col-span-4" />
        <div className="h-64 rounded-[24px] bg-slate-100 xl:col-span-5" />
        <div className="h-64 rounded-[24px] bg-slate-100 xl:col-span-3" />
      </div>
      <div className="h-80 rounded-[24px] bg-slate-100" />
    </div>
  );
}
