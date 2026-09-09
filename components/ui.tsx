/**
 * The handful of shapes every screen is built from. Keeping them here is what
 * stops one screen drifting into looking like a different product.
 */

/** Initial in a filled circle. Reads at a glance where a small dot does not. */
export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
  }[size];

  return (
    <span
      aria-hidden
      className={`${dimensions} grid shrink-0 place-items-center rounded-full font-semibold text-white`}
      style={{ background: color }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** A soft grouped surface. Space does the separating, not hairlines. */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-surface p-4 ${className ?? ""}`}>{children}</div>
  );
}

export function ScreenTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {aside ? <span className="shrink-0 text-sm text-muted">{aside}</span> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight">{children}</h2>;
}

/** One person in a list: avatar, name, a line about them, something on the right. */
export function PersonRow({
  name,
  color,
  detail,
  trailing,
  badge,
  action,
  tone = "plain",
}: {
  name: string;
  color: string;
  detail: string;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "plain" | "live" | "quiet";
}) {
  const surface = {
    plain: "bg-surface",
    live: "bg-live-soft",
    quiet: "bg-surface opacity-70",
  }[tone];

  return (
    <li className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${surface}`}>
      <Avatar name={name} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {name}
          {badge}
        </p>
        <p className="truncate text-sm text-muted">{detail}</p>
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
      {action}
    </li>
  );
}

/** Money over its token count, the pairing used everywhere figures appear. */
export function MoneyPair({
  money,
  tokens,
  size = "sm",
}: {
  money: string;
  tokens: string;
  size?: "sm" | "lg";
}) {
  return (
    <span className="block">
      <span
        className={`block font-semibold tabular-nums ${
          size === "lg" ? "text-3xl tracking-tight" : "text-base"
        }`}
      >
        {money}
      </span>
      <span className="block text-sm text-muted tabular-nums">{tokens}</span>
    </span>
  );
}

export const BUTTON =
  "w-full rounded-2xl bg-accent-strong px-5 py-4 text-base font-medium text-on-accent disabled:opacity-60";

export const BUTTON_QUIET =
  "w-full rounded-2xl border border-line px-5 py-4 text-base font-medium";

export const FIELD =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base outline-none focus:border-accent";
