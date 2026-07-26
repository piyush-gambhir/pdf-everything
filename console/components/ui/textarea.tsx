import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ui-body min-h-36 w-full resize-y rounded-xl bg-input/30 px-3 py-2.5 leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
