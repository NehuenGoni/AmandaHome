import type { StoreDiscountType } from "@amanda/shared";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/Select";
import type { StoreDiscountInput } from "@/lib/storeSalesApi";

interface DiscountInputProps {
  value?: StoreDiscountInput;
  onChange: (value?: StoreDiscountInput) => void;
}

/** Descuento manual en % o en pesos. Un valor vacío o 0 equivale a "sin descuento" (undefined). */
export function DiscountInput({ value, onChange }: DiscountInputProps) {
  // El tipo se recuerda aparte: si el valor queda vacío no debe volver a "%" solo.
  const [type, setType] = useState<StoreDiscountType>(value?.type ?? "percent");

  function changeType(next: StoreDiscountType) {
    setType(next);
    onChange(undefined);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-20 shrink-0">
        <Select
          aria-label="Tipo de descuento"
          value={type}
          onChange={(e) => changeType(e.target.value as StoreDiscountType)}
        >
          <option value="percent">%</option>
          <option value="amount">$</option>
        </Select>
      </div>
      <div className="min-w-0 flex-1">
        {type === "percent" ? (
          <Input
            aria-label="Porcentaje de descuento"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            placeholder="0"
            value={value?.value ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isNaN(n) || n <= 0 ? undefined : { type: "percent", value: Math.min(n, 100) });
            }}
          />
        ) : (
          <MoneyInput
            value={value?.value ?? 0}
            onChange={(cents) => onChange(cents <= 0 ? undefined : { type: "amount", value: cents })}
          />
        )}
      </div>
    </div>
  );
}
