import { memo } from 'react';
import { cn } from '../../lib/utils';
import { formatMessageTime, formatWhatsAppPhone, resolveWhatsAppDisplayName } from './whatsappUtils';

const AVATAR_TONES = [
  'bg-[#00a884]',
  'bg-[#53bdeb]',
  'bg-[#a855f7]',
  'bg-[#f59e0b]',
  'bg-[#ec4899]',
  'bg-[#02a698]',
];

function toneFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

function WhatsAppLeadListItem({ conversation, active, onClick }) {
  const lead = conversation.lead;
  const name = resolveWhatsAppDisplayName(
    { profileName: conversation.profileName, phone: conversation.phone, waId: conversation.waId },
    lead
  );
  const phoneLabel = formatWhatsAppPhone(conversation.waId || conversation.phone);
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;
  const preview =
    lastMessage?.direction === 'outgoing' ? `✓ ${lastMessage.text || ''}` : lastMessage?.text;
  const initials = (name || 'W')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-stretch gap-[13px] px-[13px] text-left transition-colors',
        active ? 'bg-[#f0f2f5]' : 'bg-white hover:bg-[#f5f6f6]'
      )}
    >
      <div className="shrink-0 self-center py-3">
        <div
          className={cn(
            'w-[49px] h-[49px] rounded-full flex items-center justify-center text-white font-medium text-[16px]',
            toneFor(name + (conversation.phone || ''))
          )}
        >
          {initials}
        </div>
      </div>

      <div className="flex-1 min-w-0 py-3 pr-1 border-b border-[#e9edef]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[17px] leading-tight text-[#111b21]">{name}</span>
          <span
            className={cn(
              'text-[12px] shrink-0 leading-none',
              unreadCount > 0 ? 'text-[#00a884]' : 'text-[#667781]'
            )}
          >
            {formatMessageTime(lastMessage?.timestamp || conversation.updatedAt)}
          </span>
        </div>

        <div className="mt-[3px] flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-[14px] leading-snug',
              unreadCount > 0 ? 'text-[#111b21]' : 'text-[#667781]'
            )}
          >
            {preview || phoneLabel || 'Click to view chat'}
          </p>
          {unreadCount > 0 ? (
            <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#25d366] text-white text-[11.5px] font-semibold flex items-center justify-center shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default memo(WhatsAppLeadListItem);
