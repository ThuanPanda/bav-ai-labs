'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

type Item = { id: string; name: string; slug: string; parent_id: string | null }
type TreeItemType = Item & { children: TreeItemType[] }

function buildTree(options: Item[]): { tree: TreeItemType[]; slugToName: Map<string, string> } {
  if (!options?.length) return { tree: [], slugToName: new Map() }
  const idMap = new Map<string, TreeItemType>()
  const slugToName = new Map<string, string>()
  options.forEach(item => {
    idMap.set(item.id, { ...item, children: [] })
    slugToName.set(item.slug, item.name)
  })
  const roots: TreeItemType[] = []
  options.forEach(item => {
    const node = idMap.get(item.id)!
    if (item.parent_id && idMap.has(item.parent_id)) idMap.get(item.parent_id)!.children.push(node)
    else roots.push(node)
  })
  return { tree: roots, slugToName }
}

type TreeNodeProps = { item: TreeItemType; onSelectAction: (slug: string) => void }

function TreeNode({ item, onSelectAction }: TreeNodeProps) {
  if (item.children.length === 0) {
    return (
      <DropdownMenuItem onClick={() => onSelectAction(item.slug)}>
        {item.name}
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{item.name}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {item.children.map(child => (
          <TreeNode key={child.id} item={child} onSelectAction={onSelectAction} />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

type Props = {
  label: string
  value: string
  options: Item[]
  onChangeAction: (value: string) => void
  className?: string
  triggerClassName?: string
}

export function MultiLevelSelect({ label, value, options, onChangeAction, className, triggerClassName }: Props) {
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)
  const { tree, slugToName } = buildTree(options)
  const displayName = value ? (slugToName.get(value) ?? '') : ''
  const hasValue = displayName.length > 0

  const handleSelect = (slug: string) => {
    onChangeAction(slug)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn('relative block w-full cursor-pointer outline-none', className)}>
          <div className={cn(
            'h-13.5 w-full rounded-[10px] border bg-background transition-colors',
            open ? 'border-primary' : 'border-input hover:border-primary',
            triggerClassName
          )}>
            <div className={cn(
              'flex h-full w-full items-center px-3 pr-9 text-sm font-medium',
              hasValue && 'pt-5 pb-1',
            )}>
              {hasValue && <span className="truncate">{displayName}</span>}
            </div>
          </div>
          <span className={cn(
            'pointer-events-none absolute left-3 select-none transition-all duration-150',
            hasValue || open
              ? 'top-2 text-[11px] text-muted-foreground'
              : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
          )}>
            {label}
          </span>
          <ChevronDownIcon className={cn(
            'pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => handleSelect('')}
          className="text-muted-foreground"
        >
          {t('showAll')}
        </DropdownMenuItem>
        {tree.map(item => (
          <TreeNode key={item.id} item={item} onSelectAction={handleSelect} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
