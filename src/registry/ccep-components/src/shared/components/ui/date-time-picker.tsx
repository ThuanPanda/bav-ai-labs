'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { dayjs, nowUtc, formatDate, DEFAULT_DATE_FORMAT, type DateFormat } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { MiniCalendar } from '@/shared/components/ui/mini-calendar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'

type Props = {
  value: Date
  onChangeAction: (date: Date) => void
  defaultValue?: Date
  allowPastDates?: boolean
  className?: string
  dateFormat?: DateFormat
  // Controlled mode — provide both to suppress the built-in trigger
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function autoFormatTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  const h = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  if (digits.length >= 3) return `${h}:${m}`
  return h
}

export function DateTimePicker({
  value,
  onChangeAction,
  defaultValue,
  allowPastDates = false,
  className,
  open: controlledOpen,
  onOpenChange,
  dateFormat = DEFAULT_DATE_FORMAT,
}: Props) {
  const t = useTranslations('datePicker')
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = isControlled ? controlledOpen : internalOpen

  const [draftDate, setDraftDate] = useState<Date>(value)
  const [timeInput, setTimeInput] = useState(dayjs.utc(value).format('HH:mm'))

  useEffect(() => {
    if (dialogOpen) {
      setDraftDate(value)
      setTimeInput(dayjs.utc(value).format('HH:mm'))
    }
  }, [dialogOpen])

  const setDialogOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }

  const openPicker = () => {
    setDraftDate(value)
    setTimeInput(dayjs.utc(value).format('HH:mm'))
    setDialogOpen(true)
  }

  const applyTime = (draft: Date, timeStr: string): Date => {
    const digits = timeStr.replace(/\D/g, '').padEnd(4, '0')
    const h = Math.min(23, parseInt(digits.slice(0, 2), 10))
    const m = Math.min(59, parseInt(digits.slice(2, 4), 10))
    return dayjs.utc(draft).hour(h).minute(m).second(0).toDate()
  }

  const handleDayClick = (date: Date) => setDraftDate(applyTime(date, timeInput))

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = autoFormatTime(e.target.value)
    setTimeInput(formatted)
    if (formatted.replace(/\D/g, '').length === 4) {
      setDraftDate((d) => applyTime(d, formatted))
    }
  }

  const handleTimeBlur = () => {
    const digits = timeInput.replace(/\D/g, '').padEnd(4, '0')
    const h = Math.min(23, parseInt(digits.slice(0, 2), 10))
    const m = Math.min(59, parseInt(digits.slice(2, 4), 10))
    const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setTimeInput(normalized)
    setDraftDate((d) => dayjs.utc(d).hour(h).minute(m).second(0).toDate())
  }

  const handleApply = () => { onChangeAction(draftDate); setDialogOpen(false) }

  const handleReset = () => {
    const d = defaultValue ?? nowUtc()
    setDraftDate(d)
    setTimeInput(dayjs.utc(d).format('HH:mm'))
  }

  const hasChanged = !dayjs.utc(draftDate).isSame(dayjs.utc(value), 'minute')

  return (
    <div className={cn('relative', className)}>
      {!isControlled && (
        <div className="flex cursor-pointer gap-3" onClick={openPicker}>
          <div className="flex h-10 flex-1 items-center rounded-lg border border-input bg-transparent px-3 text-sm hover:border-primary">
            {formatDate(value, dateFormat)}
          </div>
          <div className="flex h-10 w-28 items-center rounded-lg border border-input bg-transparent px-3 text-sm hover:border-primary">
            {dayjs.utc(value).format('HH:mm')}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-65 max-w-none rounded-[18px] p-3">
          <DialogTitle className="sr-only">{t('time')}</DialogTitle>
          <MiniCalendar selected={draftDate} onDayClickAction={handleDayClick} disablePast={!allowPastDates} />
          <div className="mb-3.5 mt-3">
            <div className="mb-1.5 text-xs text-muted-foreground">{t('time')}</div>
            <input
              type="text"
              value={timeInput}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              placeholder="HH:MM"
              className="w-full rounded-[10px] bg-light-gray px-2.5 py-2 text-center text-base font-medium tracking-wide outline-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline-primary" className="flex-1" onClick={handleReset}>{t('reset')}</Button>
            <Button className="flex-1" disabled={!hasChanged} onClick={handleApply}>{t('apply')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
