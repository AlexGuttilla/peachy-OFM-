"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { INVITE_TTL_DAYS, newInviteCode } from "@/lib/invites";

export type TeamState = { error?: string; ok?: string };

const NAME_MAX = 40;
const ROLES = ["MODEL", "EMPLOYEE"] as const;

/**
 * Distinct from each other and from the orange interface, and dark enough to
 * carry a white initial in an avatar circle.
 */
const PALETTE = [
  "#c2405f", "#96690e", "#357439", "#7448b0",
  "#256b78", "#9c3468", "#5c7a1f", "#5f7080",
];

export async function addPerson(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  await requireOwner();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const chaturbate = String(formData.get("chaturbateUsername") ?? "").trim();

  if (!displayName) return { error: "Give them a name." };
  if (displayName.length > NAME_MAX) return { error: "That name is too long." };
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return { error: "Pick creator or team." };
  }

  const taken = await db.user.count();
  await db.user.create({
    data: {
      displayName,
      role,
      color: PALETTE[taken % PALETTE.length],
      chaturbateUsername: role === "MODEL" && chaturbate ? chaturbate : null,
      // No username or password yet — they choose those from the setup link.
    },
  });

  revalidatePath("/team");
  return { ok: `${displayName} added. Send them a setup link.` };
}

/** Issues a fresh link and retires any earlier unused one for that person. */
export async function createInvite(formData: FormData): Promise<void> {
  await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const person = await db.user.findUnique({ where: { id: userId } });
  if (!person || !person.active) return;

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000);

  await db.$transaction([
    db.invite.deleteMany({ where: { userId, usedAt: null } }),
    db.invite.create({ data: { code: newInviteCode(), userId, expiresAt } }),
  ]);

  revalidatePath("/team");
}

export async function revokeInvite(formData: FormData): Promise<void> {
  await requireOwner();

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return;

  await db.invite.deleteMany({ where: { id: inviteId, usedAt: null } });
  revalidatePath("/team");
}

/** Deactivating keeps their history but ends their access immediately. */
export async function setActive(formData: FormData): Promise<void> {
  const owner = await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!userId || userId === owner.id) return;

  await db.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/team");
}
