import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import { inviteAdmin } from "@/lib/adminUsersApi";

export function InviteAdminForm({ onInvited }: { onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await inviteAdmin(email);
      setEmail("");
      setSuccess(true);
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar la invitación");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        required
        placeholder="nuevo.admin@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {success && <InlineMessage tone="success">Invitación enviada.</InlineMessage>}
      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Invitar administrador
        </Button>
      </div>
    </form>
  );
}
