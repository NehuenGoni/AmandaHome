import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-base font-medium text-text">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 rounded-xl border-2 border-field bg-surface px-4 text-base text-text placeholder:text-text-muted",
          "transition-colors duration-150 outline-none",
          "focus:border-accent focus:ring-2 focus:ring-accent/30",
          error && "border-accent2 focus:border-accent2 focus:ring-accent2/30",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm text-accent2-deep">{error}</p>
      ) : hint ? (
        <p className="text-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
});
