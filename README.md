# Peachy Ops

Internal web app for the agency. Mobile-first — open it in your phone browser
and add it to your home screen. No app store, no download for anyone.

Three screens:

1. **Schedule** — a month calendar. Each model signs in and enters her own
   hours; the owner sees everybody's and can edit anyone's. Shifts that run
   past midnight (9:30 PM → 4:00 AM) are entered as one shift and shown on
   both days, solid on the day it starts and faded on the day it finishes.

2. **Who's on now** — a live board. Models currently broadcasting, the team
   currently clocked in, and anyone scheduled right now who is neither.

3. **Tokens** — what each girl earned, typed in after the stream. Tap a name,
   tap Tonight or Last night, type the number, save. The amount is usually
   pasted rather than typed, so `4,820`, `4820 tk` and `4 820` all read as
   4820. Every entry carries the name of whoever logged it, and is one tap to
   undo. Weekly totals, per-model totals, and a night-by-night list sit under
   the form.

   Only the owner and the team can log tokens. A model signing in sees her own
   numbers and nobody else's.

## How the automatic clock-in works

A poller checks each model's Chaturbate status every minute:

- She goes live → a session opens and `Model went live at 9:34 PM` appears
  in the activity feed.
- She goes offline → the session stays open through a **five minute grace
  window**, so a dropped connection or a quick restart does not split one
  shift into two.
- Still nothing after five minutes → the shift closes, backdated to the last
  moment she was actually seen live. The gap is never counted as worked time.
- She comes back later → that is a new, separate session.

Employees clock in and out with the button on the live board instead.

Tonight's logged tokens show against each live model on the board. Until
Chaturbate is connected those hand-entered numbers are the only real ones, so
they take precedence over the feed's own count.

## Setup

```bash
npm install
cp .env.example .env      # then fill in the values below
npx prisma migrate deploy
npm run seed              # creates accounts, prints one-time passwords
npm run dev
```

`npm run seed` prints a password for each account once. Save them, hand each
person theirs, and they can change it after signing in.

### Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` locally. Point at Postgres in production (see below). |
| `SESSION_SECRET` | Long random string. Signs login cookies and encrypts stored Chaturbate URLs. Changing it signs everyone out. |
| `APP_TIMEZONE` | The one timezone all times are shown in. Default `America/New_York`. |
| `PRESENCE_PROVIDER` | `mock` for development, `chaturbate` for real data. |
| `CRON_SECRET` | Shared secret the scheduler sends to `POST /api/cron/poll`. |

Generate a secret with `openssl rand -base64 32`.

### Running the poller

Locally: `npm run poll` — runs the same check on a loop.

In production, point a scheduler at the app once a minute:

```
POST /api/cron/poll
Authorization: Bearer <CRON_SECRET>
```

## Connecting Chaturbate

Each model generates an **Events API URL** in her own Chaturbate account
settings and sends you that URL — never her password. It is scoped to her room
and she can revoke it whenever she likes. Stored encrypted, keyed on
`SESSION_SECRET`.

Set `PRESENCE_PROVIDER=chaturbate` once the URLs are in.

> The response shape in `lib/chaturbate.ts` should be checked against
> Chaturbate's current API docs when the first real URL is wired in.
> Everything that depends on it lives in `parseEvents`, so a correction is a
> few lines, not a rewrite.

## Development without Chaturbate

`PRESENCE_PROVIDER=mock` reads a file of who is "live" right now, so the whole
clock-in flow can be exercised with no credentials:

```bash
echo '["model1","model3"]' > .live-mock.json
npm run poll
```

`npm run demo` fills the database with a plausible evening — two models live,
two staff clocked in, one model booked but absent.

## Tests

```bash
npm test              # calendar maths and the presence state machine
```

`test:presence` covers the part most worth protecting: that a shift ends at
the last seen time rather than five minutes later, that a brief drop does not
close a shift, and that a return opens a new one. `test:tokens` covers the
pasted-amount parsing, including what should bounce back.

## Moving to Postgres

SQLite is genuinely fine at this size, but to switch:

1. `provider = "postgresql"` in `prisma/schema.prisma`
2. Point `DATABASE_URL` at the Postgres instance
3. `rm -rf prisma/migrations && npx prisma migrate dev --name init`
4. `npm run seed`

## Not built yet

- Planned-vs-actual reporting across a whole month
- A page for adding and removing people (edit `prisma/seed.ts` and re-run)
- Push notifications when someone is scheduled but not on (the live board
  shows this in-app under "Scheduled but not on")
