import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { pollPresence } from "@/lib/presence";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Called every minute by an external scheduler. Checks each model's live
 * status, opens a session when she goes live, and closes one that has been
 * quiet past the grace window.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollPresence();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("presence poll failed", error);
    return NextResponse.json({ error: "poll failed" }, { status: 500 });
  }
}
