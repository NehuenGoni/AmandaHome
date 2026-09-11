import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ firstName, lastName, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos crear tu cuenta");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Creá tu cuenta" subtitle="Guardá tus datos para comprar más rápido la próxima vez.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Apellido" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
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
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" className="font-medium text-accent-deep hover:underline">
          Ingresá
        </Link>
      </p>
    </AuthCard>
  );
}
