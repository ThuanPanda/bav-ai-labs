'use client';

import type { ReactNode } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type OptionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
};

type Props = {
  items: OptionMenuItem[];
  align?: 'start' | 'end' | 'center';
  triggerClassName?: string;
  contentClassName?: string;
};

// Stops the click from bubbling into a clickable row/card/Link this menu is nested in —
// Radix portals its content to document.body, but React still bubbles the click through
// the *React* tree (not the DOM tree), so an un-stopped click can reach an ancestor Link.
function stopPropagation(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

export function OptionMenu({ items, align = 'end', triggerClassName, contentClassName }: Props) {
  const visibleItems = items.filter((item) => !item.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8', triggerClassName)}
          onClick={stopPropagation}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        // Open/close animation felt janky for this menu (many triggers packed close together
        // in card/table grids) — force-disable it here only, without touching the shared
        // DropdownMenuContent default used by other (unrelated) dropdowns.
        className={cn('w-auto whitespace-nowrap data-open:animate-none! data-closed:animate-none!', contentClassName)}
        onClick={stopPropagation}
      >
        {visibleItems.map((item) =>
          item.href ? (
            <DropdownMenuItem
              key={item.key}
              asChild
              variant={item.destructive ? 'destructive' : 'default'}
              disabled={item.disabled}
            >
              <Link href={item.href} className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.key}
              variant={item.destructive ? 'destructive' : 'default'}
              disabled={item.disabled}
              className="flex items-center gap-2"
              onClick={(e) => {
                stopPropagation(e);
                item.onClick?.();
              }}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
