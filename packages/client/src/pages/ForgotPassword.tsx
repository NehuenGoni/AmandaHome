import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import { forgotPassword } from "@/lib/authApi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ocurrió un error, intentá de nuevo");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviamos un link para restablecerla.">
      {sent ? (
        <InlineMessage tone="success">
          Si el email existe en nuestro sistema, vas a recibir instrucciones para restablecer tu contraseña.
        </InlineMessage>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <InlineMessage tone="error">{error}</InlineMessage>}
          <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
            Enviar instrucciones
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link to="/login" className="font-medium text-accent-deep hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </AuthCard>
  );
}
