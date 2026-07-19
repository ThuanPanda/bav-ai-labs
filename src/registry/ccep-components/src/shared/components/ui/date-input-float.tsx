'use client';

import { useState } from 'react';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { dayjs, formatDate, DEFAULT_DATE_FORMAT, type DateFormat } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/shared/components/ui/date-time-picker';

type FieldProps = {
  label: string;
  displayValue: string;
  icon: React.ReactNode;
  onClick: () => void;
  error?: boolean;
  className?: string;
};

function DateFloatField({ label, displayValue, icon, onClick, error, className }: FieldProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'relative h-13.5 w-full cursor-pointer rounded-[10px] border bg-background transition-colors hover:border-primary',
        error ? 'border-destructive' : 'border-input',
        className,
      )}
    >
      <div className="flex h-full items-center gap-2 px-3 pt-5 pb-1">
        {icon}
        <span className="text-sm font-medium" translate="no">{displayValue}</span>
      </div>
      <label className="pointer-events-none absolute top-0 left-3 z-10 select-none translate-y-2 text-[11px] text-muted-foreground">
        {label}
      </label>
    </div>
  );
}

type Props = {
  value: Date;
  onChangeAction: (date: Date) => void;
  dateLabel?: string;
  timeLabel?: string;
  allowPastDates?: boolean;
  error?: string;
  className?: string;
  dateFormat?: DateFormat;
};

export function DateInputFloat({
  value,
  onChangeAction,
  dateLabel = 'Date',
  timeLabel = 'Time',
  allowPastDates = false,
  error,
  className,
  dateFormat = DEFAULT_DATE_FORMAT,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-3">
        <DateFloatField
          label={dateLabel}
          displayValue={formatDate(value, dateFormat)}
          icon={<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />}
          onClick={() => setOpen(true)}
          error={Boolean(error)}
          className="flex-1"
        />
        <DateFloatField
          label={timeLabel}
          displayValue={dayjs.utc(value).format('HH:mm')}
          icon={<ClockIcon className="size-4 shrink-0 text-muted-foreground" />}
          onClick={() => setOpen(true)}
          error={Boolean(error)}
          className="w-50 max-w-1/2"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <DateTimePicker
        value={value}
        onChangeAction={onChangeAction}
        allowPastDates={allowPastDates}
        open={open}
        onOpenChange={setOpen}
        dateFormat={dateFormat}
      />
    </div>
  );
}
