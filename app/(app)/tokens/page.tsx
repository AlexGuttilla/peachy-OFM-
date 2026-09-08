import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayKey, fmt } from "@/lib/time";
import { formatTokens, formatUsd, tokensToUsd } from "@/lib/tokens";
import { deleteTokenEntry } from "./actions";
import TokenForm from "./TokenForm";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

/** "2026-09-09" -> "Tue 9 Sep" */
function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function daysBack(from: string, count: number): string[] {
  const [y, m, d] = from.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d - i));
    return fmt(date, "yyyy-MM-dd");
  });
}

export default async function TokensPage() {
  const viewer = await requireUser();
  const canRecord = viewer.role === "OWNER" || viewer.role === "EMPLOYEE";
  const today = todayKey();
  const window = daysBack(today, WINDOW_DAYS);
  const earliest = window[window.length - 1];

  const [models, entries] = await Promise.all([
    db.user.findMany({
      where: { active: true, role: "MODEL" },
      select: { id: true, displayName: true, color: true },
      orderBy: { displayName: "asc" },
    }),
    db.tokenEntry.findMany({
      // A model only ever sees her own numbers.
      where: {
        streamDate: { gte: earliest },
        ...(viewer.role === "MODEL" ? { userId: viewer.id } : {}),
      },
      include: {
        user: { select: { displayName: true, color: true } },
        recordedBy: { select: { displayName: true } },
      },
      orderBy: [{ streamDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const weekTotal = entries.reduce((sum, entry) => sum + entry.tokens, 0);

  const byDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    byDate.set(entry.streamDate, [...(byDate.get(entry.streamDate) ?? []), entry]);
  }

  // Per-model totals across the window, biggest earner first.
  const perModel = new Map<string, { name: string; color: string; total: number }>();
  for (const entry of entries) {
    const row = perModel.get(entry.userId) ?? {
      name: entry.user.displayName,
      color: entry.user.color,
      total: 0,
    };
    row.total += entry.tokens;
    perModel.set(entry.userId, row);
  }
  const leaderboard = [...perModel.values()].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Tokens</h1>
        <p className="text-xs text-muted">last {WINDOW_DAYS} days</p>
      </div>

      <div className="rounded-2xl border border-line bg-accent-soft px-4 py-3.5">
        <p className="text-xs text-muted">Total this week</p>
        <p className="mt-0.5 text-3xl font-semibold tabular-nums">
          {formatUsd(tokensToUsd(weekTotal))}
        </p>
        <p className="mt-0.5 text-sm text-muted tabular-nums">
          {formatTokens(weekTotal)}
        </p>
      </div>

      {canRecord ? <TokenForm models={models} today={today} /> : null}

      {leaderboard.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold">By model</h2>
          <ul className="mt-2 space-y-2">
            {leaderboard.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
                <span className="flex-1 truncate text-sm font-medium">{row.name}</span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-medium tabular-nums">
                    {formatUsd(tokensToUsd(row.total))}
                  </span>
                  <span className="block text-xs text-muted tabular-nums">
                    {formatTokens(row.total)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold">Night by night</h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing logged in the last {WINDOW_DAYS} days.
          </p>
        ) : (
          <div className="mt-2 space-y-4">
            {[...byDate.entries()].map(([date, rows]) => (
              <div key={date}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-medium text-muted">
                    {date === today ? "Tonight" : shortDate(date)}
                  </h3>
                  <span className="text-xs tabular-nums text-muted">
                    {formatUsd(tokensToUsd(rows.reduce((sum, r) => sum + r.tokens, 0)))}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  {rows.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: entry.user.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {entry.user.displayName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          by {entry.recordedBy.displayName}
                          {entry.note ? ` · ${entry.note}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-medium tabular-nums">
                          {formatUsd(tokensToUsd(entry.tokens))}
                        </span>
                        <span className="block text-xs text-muted tabular-nums">
                          {formatTokens(entry.tokens)}
                        </span>
                      </span>
                      {canRecord ? (
                        <form action={deleteTokenEntry}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <button
                            type="submit"
                            aria-label={`Remove ${entry.tokens} tokens for ${entry.user.displayName}`}
                            className="shrink-0 text-xs text-accent-strong underline underline-offset-4"
                          >
                            Undo
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
