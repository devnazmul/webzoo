import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface SuggestionItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  type?: string;
}

interface Props {
  items: SuggestionItem[];
  selectedIndex: number;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  header?: string;
  emptyMessage?: string;
}

export default function SuggestionDropdown({
  items,
  selectedIndex,
  onSelect,
  onClose,
  anchorRect,
  header,
  emptyMessage = 'No results',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Position the dropdown above the anchor rect
  useEffect(() => {
    if (!ref.current || !anchorRect) return;
    const dropdown = ref.current;
    const dropdownHeight = dropdown.offsetHeight;
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;

    // Prefer above, fall back to below
    if (spaceAbove > dropdownHeight || spaceAbove > spaceBelow) {
      dropdown.style.top = `${anchorRect.top + window.scrollY - dropdownHeight - 4}px`;
    } else {
      dropdown.style.top = `${anchorRect.bottom + window.scrollY + 4}px`;
    }
    dropdown.style.left = `${Math.min(
      anchorRect.left + window.scrollX,
      window.innerWidth - 240
    )}px`;
  }, [anchorRect, items]);

  // Scroll selected item into view
  useEffect(() => {
    if (!ref.current) return;
    const selected = ref.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!anchorRect) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-60 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ top: 0, left: 0 }}
    >
      {header && (
        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border bg-muted/50 uppercase tracking-wider">
          {header}
        </div>
      )}
      <div className="max-h-52 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id}
              data-selected={index === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-popover-foreground hover:bg-accent/50'
              )}
            >
              {item.icon && (
                <span className="flex-shrink-0 text-muted-foreground">
                  {item.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.label}</div>
                {item.sublabel && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.sublabel}
                  </div>
                )}
              </div>
              {item.type && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {item.type}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
