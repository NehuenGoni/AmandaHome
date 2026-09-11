import { centsToPesos, pesosToCents } from "@amanda/shared";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  label?: string;
  value: number;
  onChange: (cents: number) => void;
  error?: string;
  disabled?: boolean;
}

/** Muestra/edita el monto en pesos pero siempre reporta centavos enteros hacia arriba. */
export function MoneyInput({ label, value, onChange, error, disabled }: MoneyInputProps) {
  const id = useId();
  const [text, setText] = useState(() => String(centsToPesos(value)));

  useEffect(() => {
    setText(String(centsToPesos(value)));
  }, [value]);

  function handleChange(raw: string) {
    setText(raw);
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isNaN(parsed) && raw.trim() !== "") onChange(pesosToCents(parsed));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-surface pl-7 pr-4 text-sm text-text",
            "transition-colors duration-150 outline-none",
            "focus:border-accent focus:ring-2 focus:ring-accent/30",
            error && "border-accent2 focus:border-accent2 focus:ring-accent2/30",
          )}
        />
      </div>
      {error && <p className="text-xs text-accent2-deep">{error}</p>}
    </div>
  );
}
