'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { dayjs, nowUtc, formatDate, DEFAULT_DATE_FORMAT, type DateFormat } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { MiniCalendar } from '@/shared/components/ui/mini-calendar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'

type Props = {
  value?: Date
  onChangeAction: (date: Date) => void
  defaultValue?: Date
  disablePast?: boolean
  className?: string
  dateFormat?: DateFormat
}

export function DatePicker({ value, onChangeAction, defaultValue, disablePast, className, dateFormat = DEFAULT_DATE_FORMAT }: Props) {
  const t = useTranslations('datePicker')
  const [open, setOpen] = useState(false)
  const [draftDate, setDraftDate] = useState<Date>(value ?? defaultValue ?? nowUtc())

  const openPicker = () => {
    setDraftDate(value ?? defaultValue ?? nowUtc())
    setOpen(true)
  }

  const handleApply = () => {
    onChangeAction(draftDate)
    setOpen(false)
  }

  const handleReset = () => {
    setDraftDate(defaultValue ?? nowUtc())
  }

  const hasChanged = !value || !dayjs.utc(draftDate).isSame(dayjs.utc(value), 'day')

  return (
    <div className={cn('relative')}>
      <div
        className={cn("flex h-10 cursor-pointer items-center rounded-button! border border-input bg-background px-3 text-sm hover:border-primary gap-2", className)}
        onClick={openPicker}
      >
        <Calendar className="size-4 text-primary shrink-0" />
        {value
          ? formatDate(value, dateFormat)
          : <span className="text-muted-foreground">{t('startDate')}</span>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-65 max-w-none rounded-[18px] p-3">
          <DialogTitle className="sr-only">{t('startDate')}</DialogTitle>
          <MiniCalendar
            selected={draftDate}
            onDayClickAction={setDraftDate}
            disablePast={disablePast}
          />
          <div className="mt-3 flex gap-3">
            <Button variant="outline-primary" className="flex-1" onClick={handleReset}>
              {t('reset')}
            </Button>
            <Button className="flex-1" disabled={!hasChanged} onClick={handleApply}>
              {t('apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
