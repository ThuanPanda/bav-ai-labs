'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { dayjs } from '@/lib/date-utils'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function buildGrid(viewDate: Date): Date[] {
  const base = dayjs.utc(viewDate).startOf('month')
  const dow = base.day()
  const offset = dow === 0 ? 6 : dow - 1
  return Array.from({ length: 42 }, (_, i) => base.subtract(offset, 'day').add(i, 'day').toDate())
}

type Props = {
  selected?: Date
  range?: { from?: Date; to?: Date }
  onDayClickAction: (date: Date) => void
  disablePast?: boolean
}

export function MiniCalendar({ selected, range, onDayClickAction, disablePast }: Props) {
  const t = useTranslations('datePicker.weekdays')
  const locale = useLocale()
  const init = selected ?? range?.from ?? range?.to ?? dayjs.utc().toDate()
  const [viewDate, setViewDate] = useState(init)

  const today = dayjs.utc().startOf('day')
  const viewMonth = dayjs.utc(viewDate).month()
  const viewYear = dayjs.utc(viewDate).year()
  const days = buildGrid(viewDate)

  const isAtCurrentMonth =
    viewMonth === today.month() && viewYear === today.year()
  const canGoPrev = !(disablePast && isAtCurrentMonth)

  const goPrev = () => {
    if (!canGoPrev) return
    setViewDate((d) => dayjs.utc(d).subtract(1, 'month').toDate())
  }

  const goNext = () => setViewDate((d) => dayjs.utc(d).add(1, 'month').toDate())

  const weekdays = [t('mo'), t('tu'), t('we'), t('th'), t('fr'), t('sa'), t('su')]

  return (
    <div className="w-full">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-medium">
          {dayjs.utc(viewDate).locale(locale).format('MMM YYYY')}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className={cn(
              'flex size-6 items-center justify-center rounded transition-colors',
              canGoPrev ? 'cursor-pointer hover:text-primary' : 'cursor-not-allowed opacity-30',
            )}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex size-6 cursor-pointer items-center justify-center rounded hover:text-primary transition-colors"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted-foreground">
        {weekdays.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.25 text-center text-sm">
        {days.map((date, i) => {
          const djs = dayjs.utc(date)
          const isCurrentMonth = djs.month() === viewMonth && djs.year() === viewYear
          const isPast = disablePast && djs.isBefore(today, 'day')
          const isHighlighted =
            (selected && djs.isSame(dayjs.utc(selected), 'day')) ||
            (range?.from && djs.isSame(dayjs.utc(range.from), 'day')) ||
            (range?.to && djs.isSame(dayjs.utc(range.to), 'day'))
          const isInRange =
            range?.from &&
            range?.to &&
            djs.isAfter(dayjs.utc(range.from), 'day') &&
            djs.isBefore(dayjs.utc(range.to), 'day')

          return (
            <button
              key={i}
              type="button"
              disabled={!!isPast}
              onClick={() => !isPast && onDayClickAction(date)}
              className={cn(
                'flex size-7 cursor-pointer items-center justify-center rounded-[6px] border border-transparent text-sm transition-colors',
                isHighlighted && 'border-primary bg-primary text-primary-foreground!',
                isInRange && !isHighlighted && 'bg-primary/15',
                !isHighlighted && !isInRange && isCurrentMonth && !isPast &&
                'hover:border-primary hover:text-primary',
                !isCurrentMonth && 'text-muted-foreground',
                isPast && 'cursor-not-allowed opacity-30',
              )}
            >
              {djs.date()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
