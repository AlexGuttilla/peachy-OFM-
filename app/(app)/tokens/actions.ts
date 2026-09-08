"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, type Role } from "@/lib/auth";
import { parseTokenAmount } from "@/lib/tokens";

export type TokenFormState = { error?: string; saved?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Models see their own numbers; the owner and the team type them in. */
function canRecord(role: Role): boolean {
  return role === "OWNER" || role === "EMPLOYEE";
}

export async function recordTokens(
  _prev: TokenFormState,
  formData: FormData,
): Promise<TokenFormState> {
  const user = await requireUser();
  if (!canRecord(user.role)) {
    return { error: "Only the owner and the team can log tokens." };
  }

  const userId = String(formData.get("userId") ?? "");
  const streamDate = String(formData.get("streamDate") ?? "");
  const raw = String(formData.get("tokens") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!DATE_RE.test(streamDate)) return { error: "Pick a valid date." };

  const parsed = parseTokenAmount(raw);
  if ("error" in parsed) return { error: parsed.error };
  const { tokens } = parsed;

  const model = await db.user.findUnique({ where: { id: userId } });
  if (!model || !model.active || model.role !== "MODEL") {
    return { error: "Pick a model from the list." };
  }

  await db.tokenEntry.create({
    data: {
      userId: model.id,
      streamDate,
      tokens,
      note: note || null,
      recordedById: user.id,
    },
  });

  revalidatePath("/tokens");
  revalidatePath("/live");
  return { saved: `${tokens.toLocaleString()} tk logged for ${model.displayName}` };
}

export async function deleteTokenEntry(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canRecord(user.role)) return;

  const id = String(formData.get("entryId") ?? "");
  if (!id) return;

  const entry = await db.tokenEntry.findUnique({ where: { id } });
  if (!entry) return;

  // The team can undo its own mistakes; the owner can undo anyone's.
  if (user.role !== "OWNER" && entry.recordedById !== user.id) return;

  await db.tokenEntry.delete({ where: { id } });
  revalidatePath("/tokens");
  revalidatePath("/live");
}
