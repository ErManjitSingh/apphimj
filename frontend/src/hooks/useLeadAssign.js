import { useCallback, useEffect, useState } from 'react';
import API from '../api/axios';
import { useConfirmDialog } from './useConfirmDialog';

export function useLeadAssign({ onAssigned } = {}) {
  const [assignees, setAssignees] = useState(null);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const { confirm, dialogNode } = useConfirmDialog();

  const fetchAssignees = useCallback(() => {
    setAssigneesLoading(true);
    return API.get('/leads/assignees')
      .then((res) => setAssignees(res.data))
      .catch(() => setAssignees({ salesManagers: [], teamLeaders: [], salesExecutives: [] }))
      .finally(() => setAssigneesLoading(false));
  }, []);

  const openAssign = useCallback((lead) => {
    setAssignModal(lead);
  }, []);

  const openBulkAssign = useCallback((leadIds) => {
    setAssignModal({ bulk: true, count: leadIds.length, leadIds });
  }, []);

  useEffect(() => {
    if (!assignModal || assignees) return;
    fetchAssignees();
  }, [assignModal, assignees, fetchAssignees]);

  const closeAssign = useCallback(() => {
    setAssignModal(null);
  }, []);

  const handleAssign = useCallback(
    async ({ assigneeRole, assigneeId, leadIds }) => {
      const isReassign =
        !assignModal?.bulk &&
        Boolean(assignModal?.assignedTo?._id || assignModal?.assignedTo);
      if (isReassign) {
        const ok = await confirm({
          title: 'Reassign this lead?',
          message: 'This lead is already assigned. Do you want to assign it again to another user?',
          confirmLabel: 'Yes, Reassign',
          cancelLabel: 'Cancel',
          tone: 'warning',
        });
        if (!ok) return;
      }
      setAssigning(true);
      try {
        await API.post('/leads/assign', { assigneeRole, assigneeId, leadIds });
        setAssignModal(null);
        onAssigned?.({ assigneeRole, assigneeId, leadIds });
      } finally {
        setAssigning(false);
      }
    },
    [assignModal, onAssigned]
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
    assignConfirmDialog: dialogNode,
  };
}
