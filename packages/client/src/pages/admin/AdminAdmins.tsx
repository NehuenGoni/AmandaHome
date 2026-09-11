import { Mail, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { ApiError } from "@/lib/apiClient";
import { revokeAdmin, revokeInvite } from "@/lib/adminUsersApi";

export default function AdminAdmins() {
  const { user: currentUser } = useAuth();
  const { admins, invites, isLoading, error, reload } = useAdminUsers();
  const [pendingRevoke, setPendingRevoke] = useState<{ type: "admin" | "invite"; id: string; label: string } | null>(
    null,
  );
  const [isRevoking, setIsRevoking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!pendingRevoke) return;
    setIsRevoking(true);
    setActionError(null);
    try {
      if (pendingRevoke.type === "admin") {
        await revokeAdmin(pendingRevoke.id);
      } else {
        await revokeInvite(pendingRevoke.id);
      }
      setPendingRevoke(null);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No pudimos completar la acción");
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Administradores</h1>

      <Card>
        <p className="mb-4 font-display text-lg text-text">Invitar administrador</p>
        <InviteAdminForm onInvited={reload} />
      </Card>

      {(error || actionError) && <InlineMessage tone="error">{error ?? actionError}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg text-text">Administradores activos</h2>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {admins.map((admin) => (
                <div key={admin._id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-4 text-accent-deep" />
                    <div>
                      <p className="text-sm font-medium text-text">
                        {admin.firstName} {admin.lastName}
                      </p>
                      <p className="text-xs text-text-muted">{admin.email}</p>
                    </div>
                  </div>
                  {admin._id !== currentUser?._id && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingRevoke({ type: "admin", id: admin._id, label: `${admin.firstName} ${admin.lastName}` })
                      }
                      aria-label={`Revocar a ${admin.firstName}`}
                      className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                    >
                      <UserX className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {invites.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-text">Invitaciones pendientes</h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {invites.map((invite) => (
                  <div key={invite._id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-text-muted" />
                      <div>
                        <p className="text-sm font-medium text-text">{invite.email}</p>
                        <p className="text-xs text-text-muted">
                          Vence el {new Date(invite.expiresAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone="warning">Pendiente</Badge>
                      <button
                        type="button"
                        onClick={() => setPendingRevoke({ type: "invite", id: invite._id, label: invite.email })}
                        aria-label={`Revocar invitación a ${invite.email}`}
                        className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                      >
                        <UserX className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingRevoke !== null}
        title={`¿Revocar a ${pendingRevoke?.label}?`}
        description={
          pendingRevoke?.type === "admin"
            ? "Perderá los permisos de administrador y se cerrarán todas sus sesiones."
            : "La invitación dejará de ser válida."
        }
        confirmLabel="Revocar"
        tone="danger"
        isLoading={isRevoking}
        onConfirm={handleRevoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  );
}
