"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

/** Sliding-indicator tab list for variant="line". */
function TabsListLine({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0, ready: false })

  function updateIndicator() {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const active = wrapper.querySelector('[data-state="active"]') as HTMLElement | null
    if (!active) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    setIndicator({
      left: activeRect.left - wrapperRect.left + wrapper.scrollLeft,
      width: activeRect.width,
      ready: true,
    })
  }

  function handleTabChange() {
    updateIndicator()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const active = wrapper.querySelector('[data-state="active"]') as HTMLElement | null
    active?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }

  React.useEffect(() => {
    updateIndicator()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new MutationObserver(handleTabChange)
    observer.observe(wrapper, { attributes: true, subtree: true, attributeFilter: ['data-state'] })
    wrapper.addEventListener('scroll', updateIndicator)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      wrapper.removeEventListener('scroll', updateIndicator)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full overflow-x-auto _custom-scroll-x border-b border-border">
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant="line"
        className={cn(
          "group/tabs-list inline-flex w-fit gap-1 bg-transparent text-muted-foreground",
          className
        )}
        {...props}
      />
      {/* Single sliding indicator — transitions between active tabs */}
      <div
        aria-hidden
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-in-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
    </div>
  )
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  if (variant === "line") {
    return <TabsListLine className={className} {...props} />
  }
  return (
    <div className="w-full overflow-x-auto">
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </div>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // base
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-5 py-3 text-sm font-medium whitespace-nowrap transition-all",
        "text-foreground/60 hover:text-foreground",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default variant active
        "group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "dark:text-muted-foreground dark:hover:text-foreground",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-input dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30 dark:group-data-[variant=default]/tabs-list:data-active:text-foreground",
        // line variant — primary color on hover + active, no bg, no border
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:hover:text-primary",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-primary group-data-[variant=line]/tabs-list:data-active:shadow-none",
        "dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
