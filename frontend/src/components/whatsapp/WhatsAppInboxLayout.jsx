import { cn } from '../../lib/utils';

export default function WhatsAppInboxLayout({
  listPanel,
  chatPanel,
  infoPanel,
  mobileView,
  infoPanelOpen = true,
  className,
}) {
  return (
    <div className={cn('bg-[#d1d7db] lg:bg-[#d1d7db]', className)}>
      <div
        className={cn(
          'wa-inbox mx-auto flex h-full overflow-hidden bg-white',
          'border-0 lg:border lg:border-[#d1d7db] lg:rounded-sm lg:shadow-[0_2px_10px_rgba(11,20,26,0.16)]'
        )}
      >
        <div
          className={cn(
            'w-full lg:w-[40%] xl:max-w-[400px] shrink-0 flex flex-col bg-white border-r border-[#d1d7db]',
            mobileView !== 'list' && 'hidden lg:flex'
          )}
        >
          {listPanel}
        </div>

        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col bg-[#efeae2]',
            mobileView === 'info' && 'hidden lg:flex',
            mobileView === 'list' && 'hidden lg:flex',
            mobileView === 'chat' && 'flex'
          )}
        >
          {chatPanel}
        </div>

        {mobileView === 'info' && (
          <div className="flex fixed inset-0 z-30 lg:hidden flex-col bg-white">
            {infoPanel}
          </div>
        )}

        <div
          className={cn(
            'w-[340px] shrink-0 flex-col bg-white border-l border-[#d1d7db]',
            infoPanelOpen ? 'hidden xl:flex' : 'hidden'
          )}
        >
          {infoPanel}
        </div>
      </div>
    </div>
  );
}
