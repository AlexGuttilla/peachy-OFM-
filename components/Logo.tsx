import fs from "node:fs";
import path from "node:path";

/**
 * The real logo artwork, if it has been added to the repo.
 *
 * Drop the company logo at `public/logo.png` (or .svg / .webp) and every place
 * the brand appears switches to it automatically. Until then the drawn peach
 * below stands in. Checked once at module load, not per render.
 */
const BRAND_FILE = ["logo.svg", "logo.png", "logo.webp", "logo.jpg"]
  .map((name) => ({ name, full: path.join(process.cwd(), "public", name) }))
  .find(({ full }) => {
    try {
      return fs.existsSync(full);
    } catch {
      return false;
    }
  });

/**
 * The brand lockup: the real artwork when present, the drawn stand-in when not.
 * Server component — it touches the filesystem.
 */
export function BrandLogo({ className }: { className?: string }) {
  if (BRAND_FILE) {
    return (
      // Plain img rather than next/image: the file is small, already the right
      // size, and this keeps the component usable anywhere without config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/${BRAND_FILE.name}`}
        alt="Peachy"
        className={`h-auto w-full max-w-full ${className ?? ""}`}
      />
    );
  }
  return (
    <span className={`flex flex-col items-center ${className ?? ""}`}>
      <PeachMark className="size-24" title="Peachy" />
      <Wordmark className="mt-3 h-20 w-56" />
    </span>
  );
}

/**
 * The Peachy mark, redrawn as SVG so it stays sharp at any size and can be
 * recoloured by theme. The proportions follow the company logo: a two-lobed
 * peach, a stem curling left, and a leaf angled up to the right.
 */
export function PeachMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Fruit. The dip at the top centre is what reads as "peach". */}
      <path
        d="M50 35C45 22 32 19.5 24.5 32.5 19 42 18 49 18 57c0 19.5 14.5 33 32 33s32-13.5 32-33c0-8-1-15-6.5-24.5C68 19.5 55 22 50 35Z"
        fill="var(--peach)"
        stroke="var(--rust)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Crease on the left lobe, the one interior detail the logo carries. */}
      <path
        d="M36 37c-5.5 7-8 15-8 23"
        fill="none"
        stroke="var(--rust)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Stem. */}
      <path
        d="M50 33c-2-8-5.5-13-11-16"
        fill="none"
        stroke="var(--leaf-deep)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Leaf. */}
      <path
        d="M52 24c4-13 18-19 32-16 1.5 13-9 24-32 16Z"
        fill="var(--leaf)"
        stroke="var(--leaf-deep)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M56 22c8-5 16-9 24-11"
        fill="none"
        stroke="var(--leaf-deep)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * "Peachy" set in the brand script. Drawn as SVG text so the pink halo can sit
 * behind the letters rather than over them — `paint-order` is honoured in SVG
 * but not on HTML text.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 88" className={className} role="img" aria-label="Peachy">
      <text
        x="8"
        y="62"
        fontFamily="var(--font-brand), Georgia, serif"
        fontSize="64"
        fill="var(--peach)"
        stroke="var(--halo)"
        strokeWidth="9"
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        Peachy
      </text>
      {/* Redrawn on top with a thin rust outline, the way the logo is inked. */}
      <text
        x="8"
        y="62"
        fontFamily="var(--font-brand), Georgia, serif"
        fontSize="64"
        fill="var(--peach)"
        stroke="var(--rust)"
        strokeWidth="2"
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        Peachy
      </text>
    </svg>
  );
}

/** Small horizontal lockup for the app header. */
export function LogoLockup({ className }: { className?: string }) {
  if (BRAND_FILE) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/${BRAND_FILE.name}`}
        alt="Peachy"
        className={`h-8 w-auto ${className ?? ""}`}
      />
    );
  }
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <PeachMark className="size-7 shrink-0" />
      <Wordmark className="h-6 w-[66px]" />
    </span>
  );
}
