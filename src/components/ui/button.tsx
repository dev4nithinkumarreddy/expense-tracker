import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-100 ease-out active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
          {
            "bg-primary text-primary-foreground shadow-xs hover:brightness-105 active:brightness-95": variant === "default",
            "bg-destructive text-destructive-foreground shadow-xs hover:brightness-105 active:brightness-95": variant === "destructive",
            "border border-border bg-background text-foreground shadow-xs hover:bg-secondary hover:text-foreground": variant === "outline",
            "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80": variant === "secondary",
            "hover:bg-secondary hover:text-foreground": variant === "ghost",
            "text-primary underline-offset-4 hover:underline active:scale-100": variant === "link",
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-lg px-3 text-xs": size === "sm",
            "h-11 rounded-xl px-8 text-base": size === "lg",
            "h-9 w-9 rounded-xl": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
