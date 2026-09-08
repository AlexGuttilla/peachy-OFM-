# Peachy

Internal web app for the agency. Mobile-first — open it in your phone browser
and add it to your home screen. No app store, no download for anyone.

Opening the app lands on a Peachy welcome screen with a **Next** button, then
a home screen with the two things people actually came for. The wording
changes with who is signed in:

| | Owner sees | Creator sees |
| --- | --- | --- |
| First button | Creators' Schedules | Mark Your Schedule |
| Second button | Clocked In Hours | Clock In Hours |

Behind those:

1. **Schedule** — a month calendar. Each model signs in and enters her own
   hours; the owner sees everybody's and can edit anyone's. Shifts that run
   past midnight (9:30 PM → 4:00 AM) are entered as one shift and shown on
   both days, solid on the day it starts and faded on the day it finishes.

   Tapping a day shows what was **scheduled** and, under it, what was
   **actually streamed** — start, end and length, e.g. `9:32 PM – 4:07 AM ·
   6h 35m`. Days that were streamed carry a green ring on the calendar.

2. **Who's on now** — a live board. Models currently broadcasting, the team
   currently clocked in, and anyone scheduled right now who is neither.

3. **Tokens** — what each girl earned, typed in after the stream, shown in
   dollars with the token count underneath. One token is five cents; change
   `TOKEN_RATE_USD` if that ever moves. Tap a name,
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

## Signing in

Nobody is ever handed a password. The owner opens **Team**, taps *Create setup
link* next to a person, and sends them the link. They open it once, choose
their own username and password, and are signed in from that moment. The link
works exactly once and expires after 14 days.

Sessions last a year, so a phone stays signed in between shifts. Signing out
is in the header if someone needs it.

Add new creators from the same Team page — no seed script, no redeploy.

## Who sees what

A creator sees **only herself**, everywhere: her own calendar, her own hours,
her own tokens. No other creator's name appears anywhere in her app, and the
Team page is closed to her. This is enforced in the queries, not by hiding
things in the interface.

The owner and the team see everyone, because logging tokens requires it.

## Branding

**To use the real logo, put the artwork at `public/logo.png`** (or `.svg`,
`.webp`, `.jpg`). Every place the brand appears picks it up automatically —
the header, the login screen, the welcome screen and the setup page. Nothing
else to change.

Until that file exists, a drawn stand-in is used: a peach and a "Peachy"
wordmark as SVG in `components/Logo.tsx`. The same drawing supplies the
browser tab icon (`app/icon.svg`), the iOS home-screen icon
(`app/apple-icon.tsx`) and the PWA manifest (`app/manifest.ts`) — those three
still need replacing by hand once the real artwork is in.

Brand colours are sampled by eye from the logo artwork and live at the top of
`app/globals.css`. If there are official hex values, those few lines are the
only place to change them. One note on the orange: `--accent` fills shapes,
while `--accent-strong` is the darker rust that sits behind any text, because
the logo orange only reaches 2.3:1 against white. Every text pairing in the
app clears 4.5:1 in both light and dark mode.

## Roster

Creators go by first name throughout: **Chelsea**, **Amelia**, **Brooks** and
**Tessa**, plus employee accounts for the VAs and stream managers. Add anyone
else from the Team page.

## Setup

```bash
npm install
cp .env.example .env      # then fill in the values below
npx prisma migrate deploy
npm run seed              # creates accounts, prints one-time passwords
npm run dev
```

`npm run seed` creates the roster and prints the owner's password once. Save
it. Everyone else gets a setup link from the Team page.

### Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` locally. Point at Postgres in production (see below). |
| `SESSION_SECRET` | Long random string. Signs login cookies and encrypts stored Chaturbate URLs. Changing it signs everyone out. |
| `APP_TIMEZONE` | The one timezone all times are shown in. Default `America/New_York`. |
| `PRESENCE_PROVIDER` | `mock` for development, `chaturbate` for real data. |
| `CRON_SECRET` | Shared secret the scheduler sends to `POST /api/cron/poll`. |
| `TOKEN_RATE_USD` | Dollars per token. Defaults to `0.05`. |

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
