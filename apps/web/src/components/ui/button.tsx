import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-xs font-bold uppercase tracking-[1.17px] whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-ghost-surface text-spectral-white border-ghost-border hover:bg-spectral-white/20 hover:text-white",
        outline:
          "border-ghost-border bg-transparent text-spectral-white hover:bg-ghost-surface",
        secondary:
          "bg-hud-bg text-spectral-white border-hud-border hover:bg-hud-active",
        ghost:
          "text-spectral-white hover:bg-ghost-surface",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
        link: "text-spectral-white underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        default: "h-10 px-6",
        xs: "h-6 px-3 text-[10px] tracking-[1px]",
        sm: "h-8 px-4 text-[11px]",
        lg: "h-12 px-8 text-sm",
        icon: "size-10 rounded-full",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
