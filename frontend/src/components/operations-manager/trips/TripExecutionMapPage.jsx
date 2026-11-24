import { useEffect, useState } from 'react';
import API from '../../../api/axios';
import TripExecutionLiveMapView from './TripExecutionLiveMapView';

export default function TripExecutionMapPage() {
  const [liveTours, setLiveTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get('/operations-manager/dashboard', { skipSuccessToast: true })
      .then((r) => {
        if (cancelled) return;
        setLiveTours(r.data?.liveTripsList || []);
      })
      .catch(() => {
        if (!cancelled) setLiveTours([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pb-8">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="min-h-[620px] animate-pulse rounded-2xl bg-slate-100 xl:col-span-3" />
          <div className="space-y-4 xl:col-span-2">
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <TripExecutionLiveMapView liveTours={liveTours} showPageHeader />
    </div>
  );
}
