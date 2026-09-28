import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

function FieldShell({
  label,
  htmlFor,
  helper,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  helper?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = htmlFor;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-absent">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-xs text-text-faint">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[13px] font-medium text-text-muted", className)}
      {...props}
    />
  );
}

const BASE_INPUT =
  "h-9 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text placeholder:text-text-faint " +
  "transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(BASE_INPUT, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(BASE_INPUT, "h-auto min-h-[90px] py-2 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(BASE_INPUT, "appearance-none bg-surface pr-8", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

FieldShell.displayName = "FieldShell";

export { FieldShell };