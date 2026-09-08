import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../lib/utils';

/** Virtual scroll — renders only visible items (safe for 100s–1000s of rows). */
export default function VirtualizedList({
  items,
  estimateSize = 72,
  maxHeight = 'min(70vh, 520px)',
  className = '',
  emptyMessage = 'No items',
  renderItem,
  getItemKey = (item, index) => item?._id || item?.id || index,
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  if (!items.length) {
    return (
      <div className={cn('rounded-xl border border-subtle bg-surface p-8 text-center text-sm text-content-muted', className)}>
        {emptyMessage}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div ref={parentRef} className={cn('overflow-auto', className)} style={{ maxHeight }}>
      {paddingTop > 0 && <div style={{ height: paddingTop }} aria-hidden />}
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        return (
          <div
            key={getItemKey(item, virtualRow.index)}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
      {paddingBottom > 0 && <div style={{ height: paddingBottom }} aria-hidden />}
    </div>
  );
}
