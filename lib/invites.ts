import crypto from "node:crypto";
import { db } from "@/lib/db";

/** How long a setup link stays usable before the owner has to reissue it. */
export const INVITE_TTL_DAYS = 14;

export function newInviteCode(): string {
  return crypto.randomBytes(18).toString("base64url");
}

export type InviteCheck =
  | { ok: true; invite: { id: string; userId: string; displayName: string } }
  | { ok: false; reason: "unknown" | "used" | "expired" };

/** Reads a setup code without consuming it, for rendering the setup page. */
export async function checkInvite(code: string): Promise<InviteCheck> {
  const invite = await db.invite.findUnique({
    where: { code },
    include: { user: { select: { displayName: true, active: true } } },
  });

  if (!invite || !invite.user.active) return { ok: false, reason: "unknown" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt < new Date()) return { ok: false, reason: "expired" };

  return {
    ok: true,
    invite: {
      id: invite.id,
      userId: invite.userId,
      displayName: invite.user.displayName,
    },
  };
}
