import { ArrowLeft, Phone, Info, UserPlus, PanelRightClose, PanelRightOpen } from 'lucide-react';
import LeadStatusBadge from '../leads/LeadStatusBadge';
import { getInitials, formatWhatsAppPhone, resolveWhatsAppDisplayName } from './whatsappUtils';
import { beginLeadCall } from '../../lib/callSession';

export default function WhatsAppConversationHeader({
  lead,
  contact,
  onBack,
  onToggleInfo,
  showInfoToggle,
  infoPanelOpen,
  onToggleInfoPanel,
  onCreateLead,
  creatingLead,
}) {
  const name = resolveWhatsAppDisplayName(contact || {}, lead);
  const phone = formatWhatsAppPhone(contact?.waId || contact?.phone || lead?.phone);
  const dialDigits = String(contact?.waId || contact?.phone || lead?.phone || '')
    .replace(/\D/g, '')
    .slice(-10);

  if (!lead && !contact) return null;

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 h-[60px] bg-[#f0f2f5] border-b border-[#d1d7db]">
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden p-2 -ml-1 rounded-full hover:bg-black/5 text-[#54656f]"
        aria-label="Back to list"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#008069] flex items-center justify-center text-white font-semibold text-sm shrink-0">
        {getInitials(name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-medium text-[#111b21] truncate text-[16px]">{name}</h3>
          {lead ? (
            <LeadStatusBadge status={lead.status} size="sm" />
          ) : (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              New chat
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-[#667781] truncate tabular-nums">{phone}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!lead && onCreateLead && (
          <button
            type="button"
            onClick={onCreateLead}
            disabled={creatingLead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {creatingLead ? 'Creating…' : 'Create Lead'}
          </button>
        )}
        {dialDigits && (
          <a
            href={`tel:+91${dialDigits}`}
            onClick={(e) => {
              e.preventDefault();
              // lead may be null for a WhatsApp-only contact with no linked CRM lead yet —
              // beginLeadCall() still dials the phone in that case, it just won't create a
              // trackable session (no leadId to attach it to), so no follow-up popup appears.
              beginLeadCall({ leadId: lead?._id, leadName: name, phone: `+91${dialDigits}` });
            }}
            className="p-2 rounded-full hover:bg-black/5 text-[#54656f] transition-colors"
            aria-label="Call"
          >
            <Phone className="w-5 h-5" />
          </a>
        )}
        {showInfoToggle && (
          <button
            type="button"
            onClick={onToggleInfo}
            className="xl:hidden p-2 rounded-full hover:bg-black/5 text-[#54656f] transition-colors"
            aria-label="Lead info"
          >
            <Info className="w-5 h-5" />
          </button>
        )}
        {onToggleInfoPanel && (
          <button
            type="button"
            onClick={onToggleInfoPanel}
            className="hidden xl:inline-flex p-2 rounded-full hover:bg-black/5 text-[#54656f] transition-colors"
            aria-label={infoPanelOpen ? 'Hide lead info' : 'Show lead info'}
            title={infoPanelOpen ? 'Hide lead info' : 'Show lead info'}
          >
            {infoPanelOpen ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRightOpen className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
