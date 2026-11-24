import { memo, useEffect, useMemo, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import WhatsAppConversationHeader from './WhatsAppConversationHeader';
import WhatsAppMessageBubble from './WhatsAppMessageBubble';
import WhatsAppMessageInput from './WhatsAppMessageInput';
import { groupMessagesByDate, formatDateDivider, resolveWhatsAppDisplayName } from './whatsappUtils';

function WhatsAppConversation({
  lead,
  contact,
  messages,
  loading,
  onSend,
  onBack,
  onToggleInfo,
  showInfoToggle,
  infoPanelOpen,
  onToggleInfoPanel,
  onCreateLead,
  creatingLead,
  user,
  sessionOpen = true,
}) {
  const bottomRef = useRef(null);
  const groups = useMemo(() => groupMessagesByDate(messages), [messages]);
  const hasThread = Boolean(lead || contact);
  const lastId = messages.length ? messages[messages.length - 1]?._id : null;

  const templateLead = useMemo(() => {
    if (lead) return lead;
    const name = resolveWhatsAppDisplayName(contact || {}, null);
    const looksLikePhone = /^\+?\d/.test(String(name || ''));
    return {
      name: name && !looksLikePhone && name !== 'WhatsApp' ? name : 'Customer',
      destination: contact?.botAnswers?.destination || '',
    };
  }, [lead, contact]);

  useEffect(() => {
    if (!lastId) return;
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [lastId]);

  if (!hasThread) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full bg-[#f0f2f5] text-center px-8 border-b-6 border-[#00a884]">
        <div className="w-[70px] h-[70px] mx-auto mb-5 rounded-full bg-white flex items-center justify-center text-[#00a884] shadow-sm">
          <MessageCircle className="w-9 h-9" />
        </div>
        <h3 className="text-[32px] font-light text-[#41525d] tracking-tight">WhatsApp Web</h3>
        <p className="mt-3 max-w-[460px] text-[14px] leading-relaxed text-[#667781]">
          Send and receive messages without keeping your phone online.
          Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
        </p>
        <p className="absolute bottom-8 text-[13px] text-[#8696a0]">
          End-to-end encrypted
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      <WhatsAppConversationHeader
        lead={lead}
        contact={contact}
        onBack={onBack}
        onToggleInfo={onToggleInfo}
        showInfoToggle={showInfoToggle}
        infoPanelOpen={infoPanelOpen}
        onToggleInfoPanel={onToggleInfoPanel}
        onCreateLead={onCreateLead}
        creatingLead={creatingLead}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain px-[5%] sm:px-[8%] lg:px-[10%] py-3 space-y-1 wa-chat-pattern">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
          </div>
        ) : (
          groups.map((item) =>
            item.type === 'divider' ? (
              <div key={item.key} className="flex justify-center my-3">
                <span className="px-3 py-[5px] rounded-[7.5px] bg-[#e1f2fb] text-[12.5px] font-medium text-[#54656f] shadow-sm">
                  {formatDateDivider(item.date)}
                </span>
              </div>
            ) : (
              <WhatsAppMessageBubble key={item.key} message={item.data} />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      {!sessionOpen && (
        <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 text-[12px] leading-snug text-amber-950">
          Customer has not messaged in the last 24 hours.
          Free text will not deliver — use a <span className="font-semibold">Meta template</span> to start the chat.
        </div>
      )}

      <WhatsAppMessageInput onSend={onSend} lead={templateLead} user={user} sessionClosed={!sessionOpen} />
    </div>
  );
}

export default memo(WhatsAppConversation);
