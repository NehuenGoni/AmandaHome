import type { User } from "@amanda/shared";
import { apiGet, apiPost } from "./apiClient.js";

export interface AdminInvite {
  _id: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export const inviteAdmin = (email: string) => apiPost<{ invite: AdminInvite }>("/admin/invites", { email });

export const listPendingInvites = () => apiGet<{ invites: AdminInvite[] }>("/admin/invites");

export const revokeInvite = (id: string) => apiPost<void>(`/admin/invites/${id}/revoke`);

export const listAdmins = () => apiGet<{ admins: User[] }>("/admin/admins");

export const revokeAdmin = (id: string) => apiPost<{ user: User }>(`/admin/admins/${id}/revoke`);
