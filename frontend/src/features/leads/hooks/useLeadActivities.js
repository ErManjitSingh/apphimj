import { useMemo } from 'react';
import {
  getLeadDetailData,
  mergeLeadActivities,
  enrichQuotationActivities,
} from '../../../components/lead-detail/leadDetailData';
import { useLeadTimelineQuery } from '../hooks/useLeadDetailQuery';

export function useLeadActivities(lead, leadId, { enabled = true } = {}) {
  const timelineQuery = useLeadTimelineQuery(leadId, {
    enabled: Boolean(leadId) && enabled,
  });
  const timeline = timelineQuery.data?.data || [];

  const detail = useMemo(
    () => (lead && enabled ? getLeadDetailData(lead) : { activities: [] }),
    [lead, enabled]
  );
  const activities = useMemo(() => {
    if (!enabled) return [];
    const merged = mergeLeadActivities(detail.activities, timeline);
    return enrichQuotationActivities(merged, lead?.quotations || []);
  }, [enabled, detail.activities, timeline, lead?.quotations]);

  return {
    activities,
    timelineLoading: Boolean(enabled && timelineQuery.isLoading),
    detail,
  };
}
