'use client'

import { useId, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInfiniteScroll } from '@/shared/hooks/use-infinite-scroll'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { LoadingIcon } from '../common/icons'

export type SelectFloatOption = { value: string; label: string }

type SelectFloatProps = {
  label: string
  multiple?: boolean
  // Single mode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  // Multi mode
  values?: string[]
  defaultValues?: string[]
  onValuesChange?: (values: string[]) => void
  options?: SelectFloatOption[]
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  // Common
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

function SelectFloat({
  label,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
  children,
  values,
  defaultValues,
  onValuesChange,
  options = [],
  onLoadMore,
  hasMore,
  loadingMore,
  error,
  hint,
  disabled,
  className,
  triggerClassName
}: SelectFloatProps) {
  const triggerId = useId()
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const [internalValues, setInternalValues] = useState<string[]>(defaultValues ?? [])
  const currentValue = value ?? internalValue
  const currentValues = values ?? internalValues
  const sentinelRef = useInfiniteScroll({
    onLoadMore: onLoadMore ?? (() => { }),
    hasMore: hasMore ?? false,
    enabled: open,
  })

  const isFloating = open
    || (multiple ? currentValues.length > 0 : Boolean(currentValue))
    || !!error

  const containerCls = cn(
    'relative h-13.5 w-full rounded-[10px] border bg-background transition-colors',
    open
      ? error ? 'border-destructive' : 'border-primary'
      : error ? 'border-destructive' : 'border-input hover:border-primary',
    disabled && 'pointer-events-none opacity-50',
    triggerClassName
  )

  const labelCls = cn(
    'pointer-events-none absolute top-0 left-3 select-none transition-all duration-200',
    isFloating ? 'translate-y-2 text-[11px]' : 'translate-y-4.25 text-[13px]',
    error ? 'text-destructive' : 'text-muted-foreground',
  )

  const chevronCls = cn(
    'pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200',
    open && 'rotate-180',
  )

  if (!multiple) {
    const handleValueChange = (val: string) => {
      if (value === undefined) setInternalValue(val)
      onValueChange?.(val)
    }
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className={containerCls}>
          <Select value={currentValue} onValueChange={handleValueChange} open={open} onOpenChange={setOpen} disabled={disabled}>
            <SelectTrigger
              id={triggerId}
              className={cn('h-full! w-full rounded-none border-0 bg-transparent px-3 pr-9 text-sm font-medium shadow-none ring-0 focus-visible:ring-0 [&>svg]:hidden', isFloating ? 'pt-5 pb-1' : 'py-0')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={0} className="_custom-scroll">
              {children}
              {hasMore && <div ref={sentinelRef} className="h-1" />}
              {loadingMore && <LoadingIcon className="mx-auto my-2 size-5" />}
            </SelectContent>
          </Select>
          <label htmlFor={triggerId} className={labelCls}>{label}</label>
          <ChevronDownIcon className={chevronCls} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  }

  function toggleValue(val: string) {
    const next = currentValues.includes(val)
      ? currentValues.filter(v => v !== val)
      : [...currentValues, val]
    if (values === undefined) setInternalValues(next)
    onValuesChange?.(next)
  }

  const selectedLabels = currentValues.map(v => options.find(o => o.value === v)?.label ?? v)
  const displayText = selectedLabels.join(', ')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <div translate="no" className={cn('cursor-pointer', containerCls)} role="combobox" aria-expanded={open}>
            <div className={cn('flex h-full w-full items-center px-3 pr-9 text-sm font-medium', isFloating && 'pt-5 pb-1')}>
              {displayText && <span className="truncate">{displayText}</span>}
            </div>
            <label className={labelCls}>{label}</label>
            <ChevronDownIcon className={chevronCls} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="_custom-scroll max-h-60 min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto p-1"
          sideOffset={3}
          align="start"
        >
          {options.map(opt => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={currentValues.includes(opt.value)}
              onCheckedChange={() => toggleValue(opt.value)}
              onSelect={(e) => e.preventDefault()}
              className="py-2.5"
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
          {loadingMore && <LoadingIcon className="size-5 mx-auto my-2" />}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { SelectFloat }
