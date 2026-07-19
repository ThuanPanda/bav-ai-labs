import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, error, errorClassName, wrapperClassName, ...props }: React.ComponentProps<"input"> & { wrapperClassName?: string, error?: string, errorClassName?: string }) {
  return (
    <div className={wrapperClassName}>
      <input
        translate="no"
        type={type}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 rounded-button border border-input bg-transparent px-4.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground/30 focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
          className
        )}
        {...props}
      />
      {error && <p className={cn("mt-1 text-xs text-destructive", errorClassName)}>{error}</p>}
    </div>
  )
}

export { Input }
