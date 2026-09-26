import { useCallback, useEffect, useState } from 'react';
import API from '../api/axios';
import { toast } from '../context/ToastContext';

export function useLeadAssign({ onAssigned } = {}) {
  const [assignees, setAssignees] = useState(null);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const fetchAssignees = useCallback(() => {
    setAssigneesLoading(true);
    return API.get('/leads/assignees')
      .then((res) => setAssignees(res.data))
      .catch(() => {
        setAssignees({ salesManagers: [], teamLeaders: [], salesExecutives: [] });
        toast.error('Could not load assignees');
      })
      .finally(() => setAssigneesLoading(false));
  }, []);

  const openAssign = useCallback((lead) => {
    setAssignModal(lead);
  }, []);

  const openBulkAssign = useCallback((leadIds) => {
    setAssignModal({ bulk: true, count: leadIds.length, leadIds });
  }, []);

  useEffect(() => {
    if (!assignModal) return;
    fetchAssignees();
  }, [assignModal, fetchAssignees]);

  const closeAssign = useCallback(() => {
    setAssignModal(null);
  }, []);

  const handleAssign = useCallback(
    async ({ assigneeRole, assigneeId, leadIds } = {}) => {
      if (!assigneeRole || !assigneeId || !leadIds?.length) {
        toast.error('Select an assignee');
        return;
      }

      setAssigning(true);
      try {
        await API.post('/leads/assign', { assigneeRole, assigneeId, leadIds });
        setAssignModal(null);
        toast.success('Lead assigned');
        onAssigned?.({ assigneeRole, assigneeId, leadIds });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Assignment failed');
      } finally {
        setAssigning(false);
      }
    },
    [onAssigned]
  );

  return {
    assignees,
    assigneesLoading,
    assignModal,
    assigning,
    openAssign,
    openBulkAssign,
    closeAssign,
    handleAssign,
    fetchAssignees,
    /** @deprecated confirm step removed — kept so call sites that still render it stay valid */
    assignConfirmDialog: null,
  };
}
