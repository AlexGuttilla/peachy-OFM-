import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const COOKIE = "peachy_session";
const MAX_AGE_DAYS = 30;

export type Role = "OWNER" | "MODEL" | "EMPLOYEE";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  color: string;
  chaturbateUsername: string | null;
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const issuedAt = Date.now().toString();
  const body = `${userId}.${issuedAt}`;
  const jar = await cookies();
  jar.set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The logged-in user, or null. Verifies the cookie signature and expiry. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAt, mac] = parts;
  if (!safeEqual(mac, sign(`${userId}.${issuedAt}`))) return null;

  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_DAYS * 86400_000) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as Role,
    color: user.color,
    chaturbateUsername: user.chaturbateUsername,
  };
}

/**
 * Use in pages and actions that require a login. Sends the caller to the login
 * page rather than throwing — a page and its layout render concurrently, so a
 * thrown error here surfaces as a 500 before the layout's redirect can land.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/live");
  return user;
}
