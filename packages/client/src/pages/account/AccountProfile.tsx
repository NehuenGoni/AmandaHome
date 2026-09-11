import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { updateProfile } from "@/lib/usersApi";

export default function AccountProfile() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateProfile({ firstName, lastName, phone });
      setUser(result.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Mis datos</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" value={user.email} disabled hint="El email no se puede modificar" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Apellido" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {error && <InlineMessage tone="error">{error}</InlineMessage>}
          {saved && <InlineMessage tone="success">Datos actualizados</InlineMessage>}

          <Button type="submit" isLoading={isSubmitting} className="w-fit">
            Guardar cambios
          </Button>
        </form>
      </Card>
    </div>
  );
}
