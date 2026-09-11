import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function QuantityStepper({ value, min = 1, max, onChange, disabled, size = "md" }: QuantityStepperProps) {
  const buttonSize = size === "sm" ? "size-7" : "size-9";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          buttonSize,
          "flex items-center justify-center rounded-full text-text transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Restar unidad"
      >
        <Minus className="size-3.5" />
      </button>
      <span className={cn("min-w-8 text-center font-medium tabular-nums", textSize)}>{value}</span>
      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className={cn(
          buttonSize,
          "flex items-center justify-center rounded-full text-text transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Sumar unidad"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
