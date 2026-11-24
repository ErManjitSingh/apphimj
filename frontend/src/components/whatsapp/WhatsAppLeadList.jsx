import { memo } from 'react';
import { Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STATUS_FILTERS } from './constants';
import WhatsAppLeadListItem from './WhatsAppLeadListItem';

function WhatsAppLeadList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  loading,
  activeCount = 0,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil((total || conversations.length) / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total || conversations.length);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 flex items-center justify-between px-4 h-[60px] bg-[#f0f2f5] border-b border-[#e9edef]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] text-sm font-semibold">
            HJ
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-medium text-[#111b21] leading-tight">WhatsApp Leads</p>
            <p className="text-[12px] text-[#667781]">{activeCount} chats</p>
          </div>
        </div>
        <button type="button" className="p-2 rounded-full text-[#54656f] hover:bg-black/5" aria-label="Menu">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="shrink-0 px-3 py-2 bg-white">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#54656f]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full h-[35px] pl-9 pr-3 rounded-lg bg-[#f0f2f5] text-[14px] text-[#111b21] placeholder:text-[#667781] outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key || 'all'}
                type="button"
                onClick={() => onStatusFilterChange(f.key)}
                className={cn(
                  'shrink-0 h-7 px-3 rounded-full text-[12.5px] font-medium',
                  active ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f]'
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-[#e9edef]">
        {loading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex gap-3 px-3 py-3 animate-pulse">
                <div className="w-[49px] h-[49px] rounded-full bg-[#e9edef]" />
                <div className="flex-1 border-b border-[#f0f2f5] pb-3 space-y-2">
                  <div className="h-3.5 bg-[#e9edef] rounded w-1/2" />
                  <div className="h-3 bg-[#f0f2f5] rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <p className="text-[16px] text-[#41525d]">No chats yet</p>
            <p className="mt-1 text-[13px] text-[#8696a0]">
              Messages to your WhatsApp Business number will appear here.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const id = conv.conversationId || conv.leadId || conv._id;
            return (
              <WhatsAppLeadListItem
                key={id}
                conversation={conv}
                active={selectedId === id}
                onClick={() => onSelect(conv)}
              />
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between px-3 h-10 border-t border-[#e9edef] bg-[#f0f2f5] text-[12px] text-[#667781]">
          <span>
            {from}–{to}
          </span>
          <div className="flex gap-1">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="p-1 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="p-1 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(WhatsAppLeadList);
