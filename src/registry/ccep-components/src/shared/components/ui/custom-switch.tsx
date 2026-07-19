"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type CustomSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function CustomSwitch({
  checked,
  onCheckedChange,
  className,
}: CustomSwitchProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onCheckedChange(!checked)
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.stopPropagation()
          onCheckedChange(!checked)
        }
      }}
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none cursor-pointer",
        "h-[18.4px] w-[32px]",
        checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform size-4 shadow-sm",
          checked ? "translate-x-[14px]" : "translate-x-[2px]"
        )}
      />
    </div>
  )
}
