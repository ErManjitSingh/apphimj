import { useCallback, useEffect, useState } from 'react';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, RefreshCw } from 'lucide-react';
import API from '../../api/axios';
import { Button } from '../ui/button';
import { useLeadAssign } from '../../hooks/useLeadAssign';
import { useLeadReactivate } from '../../hooks/useLeadReactivate';
import AdminAssignLeadModal from '../leads/AdminAssignLeadModal';
import ReactivationActionsModal from '../lead-detail/ReactivationActionsModal';
import { LeadDetailLayout } from '../lead-detail';
import LeadEmailHistory from '../email/LeadEmailHistory';

export default function LeaderLeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [executives, setExecutives] = useState([]);

  const loadLead = useCallback(() => {
    setLoading(true);
    return API.get(`/team-leader/leads/${id}`, { skipSuccessToast: true })
      .then((res) => setLead(res.data))
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadLead();
    API.get('/leads/assignees', { skipSuccessToast: true, skipErrorToast: true })
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
    return <div className="flex justify-center py-32"><div className="w-9 h-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-subtle bg-white p-12 text-center shadow-sm">
        <p className="text-content-muted">Lead not found in your team</p>
        <Link to="/team-leader/leads" className="text-amber-600 text-sm mt-2 inline-block hover:underline">← Back to Team Leads</Link>
      </div>
    );
  }

  const headerExtra = (
    <div className="mb-4 flex flex-wrap gap-2 justify-end">
      {reactivate.isLost(lead) ? (
        <Button variant="teal" className="gap-2 rounded-xl" onClick={reactivate.openReactivate}>
          <RefreshCw className="w-4 h-4" /> Reactivate Lead
        </Button>
      ) : (
        <Button variant="gradient" className="gap-2 rounded-xl" onClick={() => setAssignOpen(true)}>
          <UserPlus className="w-4 h-4" /> Assign to Executive
        </Button>
      )}
    </div>
  );

  const sidebarExtra = (
    <div className="space-y-2">
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
        relatedBasePath="/team-leader/leads"
        backHref="/team-leader/leads"
        backLabel="Back to Team Leads"
        contactEndpoint="/leads"
        onCreateQuote={() => navigate(`/team-leader/quotations/new?leadId=${id}`)}
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
        onAssign={(payload) => handleAssign({ ...payload, leadIds: [id] })}
        allowedRoles={['sales_executive']}
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
