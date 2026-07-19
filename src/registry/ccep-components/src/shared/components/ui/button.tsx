'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"
import { LoadingIcon } from "../common/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-button border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/50",
        link: "text-primary underline-offset-4 hover:underline",
        "light-gray": "bg-light-gray text-foreground hover:bg-light-gray/80",
        "outline-primary": "border-primary text-primary hover:bg-primary/10",
        "ghost-primary": "text-primary hover:bg-primary/10 hover:text-primary",
      },
      size: {
        default:
          "h-10.5 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 text-base",
        xs: "h-6 gap-1 rounded-button px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-button px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xl: "h-12 gap-2 px-6 text-xl has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-button in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-button in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const loaderSizeMap: Record<string, string> = {
  xs: "size-3.5",
  sm: "size-4",
  default: "size-5",
  lg: "size-5",
  xl: "size-7",
  icon: "size-5",
  "icon-xs": "size-3",
  "icon-sm": "size-3.5",
  "icon-lg": "size-5",
}

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    href?: string
    isLoading?: boolean
    tooltip?: React.ReactNode
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  href,
  isLoading = false,
  disabled,
  children,
  tooltip,
  ...props
}: ButtonProps) {
  const cls = cn(buttonVariants({ variant, size, className }))
  const dataAttrs = { "data-slot": "button", "data-variant": variant, "data-size": size }

  const Comp = asChild ? Slot.Root : "button"
  const element = href ? (
    <Link href={href} {...dataAttrs} className={cls} {...(props as React.ComponentProps<"a">)}>
      {children}
    </Link>
  ) : (
    <Comp {...dataAttrs} className={cls} disabled={isLoading || disabled} {...props}>
      {isLoading
        ? <LoadingIcon className={cn(loaderSizeMap[size ?? "default"], 'text-current')} />
        : children}
    </Comp>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {element}
        </TooltipTrigger>
        <TooltipContent>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return element
}

export { Button, buttonVariants }
