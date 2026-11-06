"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const labelVariants = cva(
  "flex items-center gap-2 text-base leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "font-semibold",
        // The whole row is the label of a switch or checkbox, so the tap target is 44 px tall.
        row: "min-h-11 cursor-pointer justify-between gap-3 font-normal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Label({
  className,
  variant,
  ...props
}: React.ComponentProps<"label"> & VariantProps<typeof labelVariants>) {
  return (
    <label
      data-slot="label"
      className={cn(labelVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Label }
