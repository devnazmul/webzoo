import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full border border-ghost-border bg-ghost-surface px-4 py-2 text-sm text-spectral-white transition-all outline-none placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wider focus-visible:border-spectral-white focus-visible:bg-spectral-white/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}

      {...props}
    />
  )
}

export { Input }
