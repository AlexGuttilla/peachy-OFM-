import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayKey, fmt } from "@/lib/time";
import { TOKEN_RATE_USD, formatTokens, formatUsd, tokensToUsd } from "@/lib/tokens";
import { Avatar, MoneyPair, ScreenTitle, SectionTitle } from "@/components/ui";
import { deleteTokenEntry } from "./actions";
import TokenForm from "./TokenForm";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

/** "Tue 9 Sep" */
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
  return Array.from({ length: count }, (_, i) =>
    fmt(new Date(Date.UTC(y, m - 1, d - i)), "yyyy-MM-dd"),
  );
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
    <div className="flex flex-col gap-7">
      <ScreenTitle aside="last 7 days">Tokens</ScreenTitle>

      <div className="rounded-3xl bg-accent-soft px-5 py-5">
        <p className="text-sm text-muted">
          {canRecord ? "Everyone this week" : "You this week"}
        </p>
        <div className="mt-1">
          <MoneyPair
            size="lg"
            money={formatUsd(tokensToUsd(weekTotal))}
            tokens={formatTokens(weekTotal)}
          />
        </div>
      </div>

      {canRecord ? (
        <TokenForm models={models} today={today} rate={TOKEN_RATE_USD} />
      ) : null}

      {leaderboard.length > 0 && canRecord ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>By creator</SectionTitle>
          <ul className="flex flex-col gap-2">
            {leaderboard.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3"
              >
                <Avatar name={row.name} color={row.color} />
                <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                <MoneyPair
                  money={formatUsd(tokensToUsd(row.total))}
                  tokens={formatTokens(row.total)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionTitle>Recent nights</SectionTitle>

        {entries.length === 0 ? (
          <p className="text-muted">Nothing logged in the last {WINDOW_DAYS} days.</p>
        ) : (
          [...byDate.entries()].map(([date, rows]) => (
            <div key={date} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">
                  {date === today ? "Tonight" : shortDate(date)}
                </h3>
                <span className="text-sm tabular-nums text-muted">
                  {formatUsd(tokensToUsd(rows.reduce((sum, r) => sum + r.tokens, 0)))}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {rows.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex gap-3 rounded-2xl bg-surface px-3.5 py-3"
                  >
                    <Avatar name={entry.user.displayName} color={entry.user.color} />

                    {/* Both figures stack on the right of the first line, so
                        the second line is the note's alone and never clipped. */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate pt-0.5 font-medium">
                          {entry.user.displayName}
                        </p>
                        <MoneyPair
                          money={formatUsd(tokensToUsd(entry.tokens))}
                          tokens={formatTokens(entry.tokens)}
                        />
                      </div>

                      <div className="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
                        <p className="min-w-0 flex-1 truncate">
                          {entry.recordedBy.displayName}
                          {entry.note ? ` · ${entry.note}` : ""}
                        </p>
                        {canRecord ? (
                          <form action={deleteTokenEntry} className="shrink-0">
                            <input type="hidden" name="entryId" value={entry.id} />
                            <button
                              type="submit"
                              aria-label={`Remove ${entry.tokens} tokens for ${entry.user.displayName}`}
                              className="text-accent-strong underline underline-offset-4"
                            >
                              Undo
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
