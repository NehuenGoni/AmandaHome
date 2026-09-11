import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import type { AddressInput } from "@/lib/usersApi";

interface AddressFormProps {
  initialValue?: Partial<AddressInput>;
  onSubmit: (input: AddressInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function AddressForm({ initialValue, onSubmit, onCancel, submitLabel = "Guardar dirección" }: AddressFormProps) {
  const [values, setValues] = useState<AddressInput>({
    label: initialValue?.label ?? "",
    street: initialValue?.street ?? "",
    number: initialValue?.number ?? "",
    city: initialValue?.city ?? "",
    province: initialValue?.province ?? "",
    postalCode: initialValue?.postalCode ?? "",
    country: initialValue?.country ?? "Argentina",
    phone: initialValue?.phone ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la dirección");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre de la dirección (opcional)"
        placeholder="Casa, trabajo…"
        value={values.label}
        onChange={(e) => set("label", e.target.value)}
      />
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Input
          label="Calle"
          required
          value={values.street}
          onChange={(e) => set("street", e.target.value)}
        />
        <Input label="Número" value={values.number} onChange={(e) => set("number", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ciudad" required value={values.city} onChange={(e) => set("city", e.target.value)} />
        <Input
          label="Provincia"
          required
          value={values.province}
          onChange={(e) => set("province", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Código postal"
          required
          value={values.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
        />
        <Input label="Teléfono (opcional)" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
