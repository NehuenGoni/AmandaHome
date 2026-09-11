import { z } from "zod";

export const inviteAdminSchema = z.object({
  email: z.string().email("Email inválido"),
});
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
