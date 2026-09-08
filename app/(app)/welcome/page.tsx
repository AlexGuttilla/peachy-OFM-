import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BrandLogo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <BrandLogo className="w-64" />

      <p className="mt-2 text-sm text-muted">
        Hi {user.displayName.split(" ")[0]}
      </p>

      <Link
        href="/home"
        className="mt-10 w-full max-w-xs rounded-xl bg-accent-strong px-4 py-3.5 text-base font-medium text-on-accent"
      >
        Next
      </Link>
    </div>
  );
}
