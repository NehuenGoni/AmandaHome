import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Ingresá a tu cuenta" subtitle="Accedé para ver tus pedidos y agilizar tus compras.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="-mt-1 text-right">
          <Link to="/forgot-password" className="text-xs font-medium text-accent-deep hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <InlineMessage tone="error">{error}</InlineMessage>}

        <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
          Ingresar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        ¿No tenés cuenta?{" "}
        <Link to="/registro" className="font-medium text-accent-deep hover:underline">
          Creá una
        </Link>
      </p>
    </AuthCard>
  );
}
