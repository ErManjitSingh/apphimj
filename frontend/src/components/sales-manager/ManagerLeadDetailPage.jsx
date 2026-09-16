import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import API from '../../api/axios';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { Button } from '../ui/button';
import AdminAssignLeadModal from '../leads/AdminAssignLeadModal';
import { useLeadAssign } from '../../hooks/useLeadAssign';
import { useLeadReactivate } from '../../hooks/useLeadReactivate';
import ReactivationActionsModal from '../lead-detail/ReactivationActionsModal';
import { LeadDetailLayout } from '../lead-detail';
import LeadEmailHistory from '../email/LeadEmailHistory';

export default function ManagerLeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  const loadLead = useCallback(() => {
    setLoading(true);
    return API.get(`/sales-manager/leads/${id}`)
      .then((res) => setLead(res.data))
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadLead();
    API.get('/leads/assignees')
      .then((r) => setExecutives(r.data?.salesExecutives || []))
      .catch(() => setExecutives([]));
  }, [loadLead]);

  useDataRefresh(['leads'], loadLead);

  const { assignees, assigneesLoading, handleAssign, fetchAssignees, assignConfirmDialog } = useLeadAssign({
    onAssigned: async () => {
      setAssignOpen(false);
      await loadLead();
    },
  });

  useEffect(() => {
    if (assignOpen) fetchAssignees();
  }, [assignOpen, fetchAssignees]);

  const reactivate = useLeadReactivate({ leadId: id, onSuccess: loadLead });

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-subtle bg-white p-12 text-center shadow-sm">
        <p className="text-content-muted">Lead not found</p>
        <Link to="/sales-manager/leads/all" className="text-violet-600 text-sm mt-2 inline-block hover:underline">
          ← Back to leads
        </Link>
      </div>
    );
  }

  const headerExtra = !reactivate.isLost(lead) ? (
    <div className="mb-4 flex justify-end">
      <Button variant="gradient" className="rounded-xl" onClick={() => setAssignOpen(true)}>
        <UserPlus className="w-4 h-4 mr-1.5" />
        {lead.assignedTo ? 'Reassign Lead' : 'Assign Lead'}
      </Button>
    </div>
  ) : null;

  const sidebarExtra = (
    <div className="space-y-2">
      {reactivate.isLost(lead) && (
        <Button variant="teal" className="w-full rounded-xl" onClick={reactivate.openReactivate}>Reactivate Lead</Button>
      )}
      {lead.status === 'reactivated' && (
        <Button variant="outline" className="w-full rounded-xl" onClick={reactivate.openReassign}>Reassign Reactivated Lead</Button>
      )}
      {lead?.reactivation?.isReactivated && (
        <Button variant="outline" className="w-full rounded-xl" onClick={reactivate.openStage}>Update Reactivation Stage</Button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
      <LeadDetailLayout
        lead={lead}
        leadId={id}
        relatedBasePath="/sales-manager/leads"
        backHref="/sales-manager/leads/all"
        backLabel="Back to Leads"
        contactEndpoint="/leads"
        onCreateQuote={() => navigate(`/sales-manager/quotations/new?leadId=${id}`)}
        onContactLogged={loadLead}
        onEmailSent={loadLead}
        onAssign={() => setAssignOpen(true)}
        headerExtra={headerExtra}
        sidebarExtra={sidebarExtra}
        bottomExtra={(
          <LeadEmailHistory leadId={id} emailEndpoint="/leads" refreshKey={lead?.lastContactedAt || lead?.updatedAt} />
        )}
      />

      <AdminAssignLeadModal
        open={assignOpen}
        lead={lead}
        assignees={assignees}
        loading={assigneesLoading}
        onClose={() => setAssignOpen(false)}
        onAssign={(payload) => handleAssign({ ...payload, leadIds: payload.leadIds || [id] })}
        allowedRoles={['sales_manager', 'team_leader', 'sales_executive']}
      />
      {assignConfirmDialog}
      <ReactivationActionsModal
        open={!!reactivate.mode}
        mode={reactivate.mode || 'reactivate'}
        lead={lead}
        executives={executives}
        onClose={reactivate.close}
        onSubmit={reactivate.submit}
      />
    </motion.div>
  );
}
