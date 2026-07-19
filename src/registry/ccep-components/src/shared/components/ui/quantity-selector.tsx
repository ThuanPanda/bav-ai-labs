'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onChange?: (value: number) => void;
  onSubmit?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  size?: 'default' | 'sm';
  className?: string;
};

export function QuantitySelector({
  value,
  min = 1,
  max = Infinity,
  onIncrease,
  onDecrease,
  onChange,
  onSubmit,
  onBlur,
  disabled,
  size = 'default',
  className,
}: Props) {
  const isSm = size === 'sm';

  return (
    <div className={cn('flex items-center gap-1 rounded-xl bg-background p-1', className)}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={value <= min || disabled}
        className={cn(
          'flex items-center justify-center rounded-lg text-primary transition-opacity',
          isSm ? 'size-4' : 'size-7',
          (value <= min || disabled) && 'cursor-not-allowed opacity-40',
        )}
      >
        <MinusIcon className={isSm ? 'size-3' : 'size-4'} />
      </button>

      {onChange ? (
        <input
          translate="no"
          type="number"
          value={value === 0 ? '' : value.toString()}
          disabled={disabled}
          onChange={(e) => {
            const str = e.target.value;
            if (str === '') { onChange(0); return; }
            const v = parseInt(str, 10);
            if (!isNaN(v) && v >= 0 && v <= max) onChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const safe = Math.min(max, Math.max(min, value || min));
              if (safe !== value) onChange(safe);
              onSubmit?.();
            }
          }}
          onBlur={() => {
            const safe = Math.min(max, Math.max(min, value || min));
            if (safe !== value) onChange(safe);
            onBlur?.();
          }}
          className={cn(
            'bg-transparent text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            isSm ? 'h-6 w-10 text-sm' : 'h-8 w-12 text-base',
          )}
        />
      ) : (
        <span className={cn('flex items-center justify-center font-semibold', isSm ? 'h-6 w-8 text-sm' : 'h-8 w-10 text-base')}>
          {value}
        </span>
      )}

      <button
        type="button"
        onClick={onIncrease}
        disabled={value >= max || disabled}
        className={cn(
          'flex items-center justify-center rounded-lg text-primary transition-opacity',
          isSm ? 'size-4' : 'size-7',
          (value >= max || disabled) && 'cursor-not-allowed opacity-40',
        )}
      >
        <PlusIcon className={isSm ? 'size-3' : 'size-4'} />
      </button>
    </div>
  );
}
