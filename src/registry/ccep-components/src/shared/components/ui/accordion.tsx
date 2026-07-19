"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "ring-1 ring-light-gray bg-card text-card-foreground shadow-sm rounded-[12px] overflow-hidden border-none",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  tooltip,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  tooltip?: React.ReactNode
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-center justify-between py-4 px-5 text-left text-sm font-medium transition-all outline-none border-b border-transparent data-[state=open]:border-light-gray focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:!size-5 **:data-[slot=accordion-trigger-icon]:!text-primary **:data-[slot=accordion-trigger-icon]:shrink-0 **:data-[slot=accordion-trigger-icon]:my-auto",
          className
        )}
        {...props}
      >
        {children}
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span data-slot="accordion-trigger-icon" className="inline-flex shrink-0">
                <ChevronDownIcon className="pointer-events-none size-full group-aria-expanded/accordion-trigger:hidden" />
                <ChevronUpIcon className="pointer-events-none hidden size-full group-aria-expanded/accordion-trigger:inline" />
              </span>
            </TooltipTrigger>
            <TooltipContent onClick={(e) => e.stopPropagation()}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <ChevronDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
            <ChevronUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
          </>
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "p-5 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
