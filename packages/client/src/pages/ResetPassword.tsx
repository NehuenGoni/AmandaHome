import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import { resetPassword } from "@/lib/authApi";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "El link es inválido o expiró");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Link inválido">
        <InlineMessage tone="error">Este link de restablecimiento no es válido.</InlineMessage>
        <p className="mt-6 text-center text-sm text-text-muted">
          <Link to="/forgot-password" className="font-medium text-accent-deep hover:underline">
            Pedir uno nuevo
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Elegí una nueva contraseña">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Al menos 8 caracteres"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {error && <InlineMessage tone="error">{error}</InlineMessage>}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
          Restablecer contraseña
        </Button>
      </form>
    </AuthCard>
  );
}
