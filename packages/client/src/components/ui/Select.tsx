import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, error, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-border bg-surface px-4 pr-10 text-sm text-text",
            "transition-colors duration-150 outline-none",
            "focus:border-accent focus:ring-2 focus:ring-accent/30",
            error && "border-accent2 focus:border-accent2 focus:ring-accent2/30",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      </div>
      {error && <p className="text-xs text-accent2-deep">{error}</p>}
    </div>
  );
});
