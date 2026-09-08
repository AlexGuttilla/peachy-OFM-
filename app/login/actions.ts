"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const user = await db.user.findUnique({ where: { username } });

  // Same message either way — a wrong username should not be distinguishable
  // from a wrong password.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That username and password do not match." };
  }

  await createSession(user.id);
  redirect("/live");
}
