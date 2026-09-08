"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { checkInvite } from "@/lib/invites";

export type SetupState = { error?: string };

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;

export async function completeSetup(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const code = String(formData.get("code") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Re-check the code here: the page rendering it is not a security boundary.
  const check = await checkInvite(code);
  if (!check.ok) {
    return { error: "This setup link is no longer valid. Ask for a new one." };
  }

  if (!USERNAME_RE.test(username)) {
    return {
      error:
        "Username must be 3–32 characters, lowercase letters, numbers, dots, dashes or underscores.",
    };
  }
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== confirm) return { error: "The two passwords do not match." };

  const taken = await db.user.findUnique({ where: { username } });
  if (taken) return { error: "That username is taken. Pick another." };

  const passwordHash = await hashPassword(password);

  try {
    // Consuming the invite and setting the credentials must succeed or fail
    // together, so a link can never be spent without an account being usable.
    await db.$transaction([
      db.user.update({
        where: { id: check.invite.userId },
        data: { username, passwordHash },
      }),
      db.invite.update({
        where: { id: check.invite.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
  } catch {
    // Either the username was claimed a moment ago, or the link was just used.
    return { error: "That username is taken, or the link was just used." };
  }

  await createSession(check.invite.userId);
  redirect("/welcome");
}
