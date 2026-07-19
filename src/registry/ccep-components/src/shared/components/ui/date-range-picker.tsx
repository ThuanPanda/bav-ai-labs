'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar1 } from 'lucide-react'
import { dayjs, DEFAULT_DATE_FORMAT, type DateFormat } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { MiniCalendar } from '@/shared/components/ui/mini-calendar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'

function startOfDay(date: Date): Date {
  return dayjs.utc(date).startOf('day').toDate()
}

function endOfDay(date: Date): Date {
  return dayjs.utc(date).hour(23).minute(59).second(0).toDate()
}

function fmtDate(d: Date | undefined, dateFormat: DateFormat): string {
  return d ? dayjs.utc(d).format(dateFormat) : ''
}

function parseDate(s: string, dateFormat: DateFormat): Date | undefined {
  const d = dayjs.utc(s, dateFormat, true)
  return d.isValid() ? d.toDate() : undefined
}

function autoFormatDate(value: string, dateFormat: DateFormat): string {
  const sep = dateFormat.includes('/') ? '/' : '-'
  const firstIsDay = dateFormat.startsWith('DD')
  const digits = value.replace(/\D/g, '').slice(0, 8)
  let first = digits.slice(0, 2)
  let second = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  if (firstIsDay) {
    if (first.length === 2 && +first > 31) first = '31'
    if (second.length === 2 && +second > 12) second = '12'
  } else {
    if (first.length === 2 && +first > 12) first = '12'
    if (second.length === 2 && +second > 31) second = '31'
  }
  if (!second) return first
  if (!year) return `${first}${sep}${second}`
  return `${first}${sep}${second}${sep}${year}`
}

type DateRange = { from?: Date; to?: Date }

type Props = {
  defaultValue?: DateRange
  onApplyAction?: (range: DateRange) => void
  onResetAction?: () => void
  disablePast?: boolean
  className?: string
  label?: { startLabel?: string; endLabel?: string }
  trigger?: (openPicker: () => void) => React.ReactNode
  dateFormat?: DateFormat
}

export function DateRangePicker({ defaultValue, onApplyAction, onResetAction, disablePast, className, label, trigger, dateFormat = DEFAULT_DATE_FORMAT }: Props) {
  const t = useTranslations('datePicker')
  const initRange: DateRange = defaultValue ?? {}

  const [open, setOpen] = useState(false)
  const [appliedRange, setAppliedRange] = useState<DateRange>(initRange)
  const [range, setRange] = useState<DateRange>(initRange)
  const [fromStr, setFromStr] = useState(fmtDate(initRange.from, dateFormat))
  const [toStr, setToStr] = useState(fmtDate(initRange.to, dateFormat))
  const [fromError, setFromError] = useState<string>()
  const [toError, setToError] = useState<string>()
  const [isSelectingStart, setIsSelectingStart] = useState(true)

  const syncInputs = (r: DateRange) => {
    setFromStr(fmtDate(r.from, dateFormat))
    setToStr(fmtDate(r.to, dateFormat))
    setFromError(undefined)
    setToError(undefined)
  }

  useEffect(() => {
    const nextRange = defaultValue ?? {}
    setAppliedRange(nextRange)
    setRange(nextRange)
    syncInputs(nextRange)
    setIsSelectingStart(true)
  }, [defaultValue?.from?.getTime(), defaultValue?.to?.getTime()])

  const openPicker = () => {
    setRange(appliedRange)
    syncInputs(appliedRange)
    setIsSelectingStart(true)
    setOpen(true)
  }

  const handleDayClick = (date: Date) => {
    if (isSelectingStart) {
      const r: DateRange = { from: startOfDay(date), to: undefined }
      setRange(r); syncInputs(r); setIsSelectingStart(false)
    } else {
      if (range.from && dayjs.utc(date).isBefore(dayjs.utc(range.from), 'day')) {
        const r: DateRange = { from: startOfDay(date), to: undefined }
        setRange(r); syncInputs(r)
      } else {
        const r: DateRange = { from: range.from, to: endOfDay(date) }
        setRange(r); syncInputs(r); setIsSelectingStart(true)
      }
    }
  }

  const handleFromBlur = () => {
    if (!fromStr) { setRange((r) => ({ ...r, from: undefined })); setFromError(undefined); return }
    const date = parseDate(fromStr, dateFormat)
    if (!date) { setFromError(`Invalid (${dateFormat})`); return }
    setFromError(undefined)
    const from = startOfDay(date)
    const newTo = range.to && from <= range.to ? range.to : undefined
    setRange({ from, to: newTo })
    setToStr(fmtDate(newTo, dateFormat))
  }

  const handleToBlur = () => {
    if (!toStr) { setRange((r) => ({ ...r, to: undefined })); setToError(undefined); return }
    const date = parseDate(toStr, dateFormat)
    if (!date) { setToError(`Invalid (${dateFormat})`); return }
    setToError(undefined)
    const to = endOfDay(date)
    const newFrom = range.from && to >= range.from ? range.from : undefined
    setRange({ from: newFrom, to })
    setFromStr(fmtDate(newFrom, dateFormat))
  }

  const handleReset = () => {
    setRange({}); syncInputs({}); setIsSelectingStart(true); onResetAction?.(); setOpen(false)
  }

  const handleApply = () => {
    setAppliedRange(range); onApplyAction?.(range); setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {!trigger && (
        <div className="flex cursor-pointer flex-col gap-3 sm:flex-row" onClick={openPicker}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {label?.startLabel && <p className="text-xs text-gray-500">{label.startLabel}</p>}
            <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground hover:border-primary font-bold">
              <Calendar1 className="size-4" />
              {appliedRange.from
                ? fmtDate(appliedRange.from, dateFormat)
                : <span className="text-muted-foreground">{t('startDate')}</span>}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {label?.endLabel && <p className="text-xs text-gray-500">{label.endLabel}</p>}
            <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground hover:border-primary font-bold">
              <Calendar1 className="size-4" />
              {appliedRange.to
                ? fmtDate(appliedRange.to, dateFormat)
                : <span className="text-muted-foreground">{t('endDate')}</span>}
            </div>
          </div>
        </div>
      )}

      {trigger && trigger(openPicker)}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-72 max-w-none rounded-[18px] p-3">
          <DialogTitle className="sr-only">{t('startDate')}</DialogTitle>

          <div className="mb-3.5 flex flex-col gap-2.5">
            <input
              value={fromStr}
              placeholder={t('startDate')}
              onChange={(e) => setFromStr(autoFormatDate(e.target.value, dateFormat))}
              onBlur={handleFromBlur}
              onClick={() => setIsSelectingStart(true)}
              className={cn(
                'h-10 w-full rounded-[10px] border border-input bg-gray-100 px-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground',
                isSelectingStart && 'border-primary',
              )}
            />
            {fromError && <p className="text-xs text-destructive">{fromError}</p>}
            <input
              value={toStr}
              placeholder={t('endDate')}
              onChange={(e) => setToStr(autoFormatDate(e.target.value, dateFormat))}
              onBlur={handleToBlur}
              onClick={() => setIsSelectingStart(false)}
              className={cn(
                'h-10 w-full rounded-[10px] border border-input bg-gray-100 px-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground',
                !isSelectingStart && 'border-primary',
              )}
            />
            {toError && <p className="text-xs text-destructive">{toError}</p>}
          </div>

          <MiniCalendar range={range} onDayClickAction={handleDayClick} disablePast={disablePast} />

          <div className="mt-3.5 flex justify-end gap-3">
            <Button variant="outline-primary" className="flex-1" onClick={handleReset}>{t('reset')}</Button>
            <Button className="flex-1" disabled={!!(range.from && !range.to)} onClick={handleApply}>{t('apply')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
