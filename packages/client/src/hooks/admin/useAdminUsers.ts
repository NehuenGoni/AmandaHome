import type { User } from "@amanda/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listAdmins, listPendingInvites, type AdminInvite } from "@/lib/adminUsersApi";

export function useAdminUsers() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([listAdmins(), listPendingInvites()])
      .then(([adminsResult, invitesResult]) => {
        if (!cancelled) {
          setAdmins(adminsResult.admins);
          setInvites(invitesResult.invites);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No pudimos cargar los administradores");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { admins, invites, isLoading, error, reload };
}
