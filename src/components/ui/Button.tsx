import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong shadow-xs",
  secondary: "bg-surface text-text border border-border hover:bg-surface-subtle",
  ghost: "text-text-muted hover:text-text hover:bg-surface-subtle",
  subtle: "bg-accent-soft text-accent hover:brightness-105",
  danger: "bg-absent text-white hover:opacity-90",
  outline: "border border-border-strong text-text hover:bg-surface-subtle",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-9 px-4 text-sm rounded-[10px] gap-2",
  lg: "h-11 px-5 text-sm rounded-[10px] gap-2",
  icon: "h-9 w-9 rounded-[10px] justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "icon", children, ...props }, ref) => (
    <Button ref={ref} variant={variant} size={size} className={cn("shrink-0", className)} {...props}>
      {children}
    </Button>
  ),
);
IconButton.displayName = "IconButton";