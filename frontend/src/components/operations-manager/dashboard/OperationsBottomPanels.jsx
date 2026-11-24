import TripExecutionLiveMapView from '../trips/TripExecutionLiveMapView';

export default function OperationsBottomPanels({ data }) {
  const liveTours = data?.liveTripsList || [];

  return (
    <div className="mt-1">
      <TripExecutionLiveMapView liveTours={liveTours} showPageHeader compact={false} />
    </div>
  );
}
