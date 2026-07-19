'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

type TextareaFloatProps = Omit<React.ComponentProps<'textarea'>, 'placeholder'> & {
  label: string;
  placeholder?: string;
  error?: string;
  hint?: string;
};

function TextareaFloat({
  label,
  placeholder,
  error,
  hint,
  className,
  id,
  value,
  onFocus,
  onBlur,
  disabled,
  maxLength,
  ...props
}: TextareaFloatProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [focused, setFocused] = useState(false);
  const currentLength = String(value ?? '').length;
  const isFloating = focused || currentLength > 0 || !!error;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          'relative w-full rounded-[10px] border bg-background transition-colors overflow-hidden',
          focused
            ? error ? 'border-destructive' : 'border-primary'
            : error ? 'border-destructive' : 'border-input hover:border-primary',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <textarea
          {...props}
          translate="no"
          id={inputId}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={isFloating ? placeholder : undefined}
          aria-invalid={error ? true : undefined}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className={cn(
            '_custom-scroll min-h-32 w-full resize-none overflow-y-auto bg-transparent px-3 text-[13px] font-medium outline-none transition-[padding] duration-150',
            isFloating ? 'pt-7 pb-2' : 'py-3',
            'disabled:cursor-not-allowed',
            className,
          )}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute z-10 select-none transition-all duration-150',
            isFloating
              ? 'left-0 right-0 top-0 bg-background px-3 pb-2 pt-2 text-[11px]'
              : 'left-3 top-3 text-[13px]',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {label}
        </label>
      </div>
      <div className="flex items-center justify-between">
        <span>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        </span>
        {maxLength && (
          <p className="text-xs text-muted-foreground">
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

export { TextareaFloat };
