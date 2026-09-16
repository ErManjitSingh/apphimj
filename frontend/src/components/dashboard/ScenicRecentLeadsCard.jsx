import { Link } from 'react-router-dom';
import { Eye, MessageCircle, Phone } from 'lucide-react';
import LeadStatusBadge from '../leads/LeadStatusBadge';
import { formatSource } from '../lead-detail/leadDetailUtils';
import { beginLeadCall } from '../../lib/callSession';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function digitsPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export default function ScenicRecentLeadsCard({ leads = [] }) {
  const rows = (leads || []).slice(0, 5);

  return (
    <div className="rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Recent Leads</h2>
        <Link to="/leads" className="text-[13px] font-semibold text-orange-500 hover:underline">
          View All
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-y border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5">#</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Source</th>
              <th className="px-3 py-2.5">Package</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Assigned To</th>
              <th className="px-5 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">
                  No recent leads
                </td>
              </tr>
            ) : (
              rows.map((lead, index) => {
                const phone = digitsPhone(lead.phone);
                return (
                  <tr key={lead._id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5 text-[13px] text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3.5">
                      <Link to={`/leads/${lead._id}`} className="text-[13px] font-semibold text-slate-800 hover:text-orange-600">
                        {lead.name || '—'}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-slate-500">{formatSource(lead)}</td>
                    <td className="px-3 py-3.5 text-[13px] text-slate-600">{lead.destination || '—'}</td>
                    <td className="px-3 py-3.5">
                      <LeadStatusBadge status={lead.status} lead={lead} pulse={lead.status === 'new'} size="sm" listMode />
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-[13px] text-slate-500">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-slate-600">
                      {lead.assignedTo?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/leads/${lead._id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sky-500 hover:bg-sky-50"
                          title="Call"
                          onClick={() =>
                            beginLeadCall({
                              leadId: lead._id,
                              leadName: lead.name,
                              phone: lead.phone,
                            })
                          }
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        {phone ? (
                          <a
                            href={`https://wa.me/91${phone.slice(-10)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300">
                            <MessageCircle className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
