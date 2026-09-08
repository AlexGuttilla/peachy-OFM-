import { decrypt } from "@/lib/crypto";

/**
 * Chaturbate Events API adapter.
 *
 * The model generates an Events API URL in her own Chaturbate account settings
 * (Settings -> API access). It looks like:
 *
 *   https://eventsapi.chaturbate.com/events/<room>/<token>/
 *
 * She shares only that URL. It is scoped to her room, never gives account
 * access, and she can revoke it at any time. We never see or store a password.
 *
 * Each request returns events recorded since the cursor, plus a `nextUrl` to
 * poll next time. We care about three kinds:
 *
 *   broadcastStart  -> she went live
 *   broadcastStop   -> she went offline
 *   tip             -> tokens earned
 *
 * NOTE: the exact response shape should be re-verified against Chaturbate's
 * current API docs when real credentials are wired in. Everything that depends
 * on that shape is confined to `parseEvents` below, so a correction is a small,
 * local edit rather than a rewrite.
 */

export type PresenceProbe = {
  /** Explicit signals seen in this batch, oldest first. */
  signals: Array<
    | { kind: "went_live"; at: Date }
    | { kind: "went_offline"; at: Date }
    | { kind: "tip"; tokens: number; at: Date }
  >;
  /** True if we had any positive evidence she is broadcasting right now. */
  sawActivity: boolean;
  /** Cursor to persist and pass to the next poll. */
  nextCursor: string | null;
};

export interface PresenceProvider {
  probe(input: {
    eventsUrl: string | null;
    cursor: string | null;
    username: string;
  }): Promise<PresenceProbe>;
}

type RawEvent = {
  method?: string;
  object?: { tip?: { tokens?: number }; broadcaster?: string };
  id?: string;
};

function parseEvents(payload: unknown): {
  signals: PresenceProbe["signals"];
  nextCursor: string | null;
} {
  const body = payload as { events?: RawEvent[]; nextUrl?: string } | null;
  const signals: PresenceProbe["signals"] = [];
  const at = new Date();

  for (const ev of body?.events ?? []) {
    switch (ev.method) {
      case "broadcastStart":
        signals.push({ kind: "went_live", at });
        break;
      case "broadcastStop":
        signals.push({ kind: "went_offline", at });
        break;
      case "tip": {
        const tokens = ev.object?.tip?.tokens;
        if (typeof tokens === "number" && tokens > 0) {
          signals.push({ kind: "tip", tokens, at });
        }
        break;
      }
      default:
        break;
    }
  }

  return { signals, nextCursor: body?.nextUrl ?? null };
}

export class ChaturbateProvider implements PresenceProvider {
  async probe({
    eventsUrl,
    cursor,
  }: {
    eventsUrl: string | null;
    cursor: string | null;
    username: string;
  }): Promise<PresenceProbe> {
    if (!eventsUrl) {
      return { signals: [], sawActivity: false, nextCursor: cursor };
    }

    // The cursor is a full URL handed back by the previous poll.
    const url = cursor ?? decrypt(eventsUrl);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      // Short timeout: this runs on a 60s cron, we must not hang it.
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      // A dead cursor (410/404) means start over from the base URL next time.
      const reset = res.status === 404 || res.status === 410;
      return {
        signals: [],
        sawActivity: false,
        nextCursor: reset ? null : cursor,
      };
    }

    const { signals, nextCursor } = parseEvents(await res.json());

    // Any event at all is evidence the room is being watched by the API;
    // only a broadcast/tip signal counts as evidence she is actually live.
    const sawActivity = signals.some(
      (s) => s.kind === "went_live" || s.kind === "tip",
    );

    return { signals, sawActivity, nextCursor };
  }
}

/**
 * Dev/demo provider. Reads a JSON file of usernames that are "live" right now
 * so the whole clock-in flow can be exercised before real tokens exist:
 *
 *   echo '["ruby","jade"]' > .live-mock.json
 */
export class MockProvider implements PresenceProvider {
  async probe({ username }: { username: string }): Promise<PresenceProbe> {
    const { readFile } = await import("node:fs/promises");
    let live: string[] = [];
    try {
      live = JSON.parse(await readFile(".live-mock.json", "utf8"));
    } catch {
      live = [];
    }
    const isLive = live.includes(username);
    return {
      signals: isLive ? [{ kind: "went_live", at: new Date() }] : [],
      sawActivity: isLive,
      nextCursor: null,
    };
  }
}

export function getProvider(): PresenceProvider {
  return process.env.PRESENCE_PROVIDER === "chaturbate"
    ? new ChaturbateProvider()
    : new MockProvider();
}
