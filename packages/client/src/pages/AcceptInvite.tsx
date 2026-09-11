import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await acceptInvite({ token, firstName, lastName, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "La invitación es inválida o expiró");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Invitación inválida">
        <InlineMessage tone="error">Este link de invitación no es válido.</InlineMessage>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Aceptar invitación" subtitle="Completá tus datos para crear tu cuenta de administrador.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Apellido" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Al menos 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <InlineMessage tone="error">{error}</InlineMessage>}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
          Crear cuenta de administrador
        </Button>
      </form>
    </AuthCard>
  );
}
