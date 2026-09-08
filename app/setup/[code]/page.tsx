import Link from "next/link";
import { checkInvite } from "@/lib/invites";
import { BrandLogo } from "@/components/Logo";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

const REASONS = {
  unknown: "We don't recognise this setup link.",
  used: "This link has already been used. If that wasn't you, tell the owner.",
  expired: "This link has expired. Ask the owner for a new one.",
} as const;

export default async function SetupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const check = await checkInvite(code);

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="w-44" />
        </div>

        {check.ok ? (
          <>
            <h1 className="mt-8 text-center text-xl font-semibold tracking-tight">
              Welcome, {check.invite.displayName}
            </h1>
            <p className="mt-1.5 text-center text-sm text-muted">
              Pick a username and password. You only do this once — after that
              your phone stays signed in.
            </p>
            <SetupForm code={code} />
          </>
        ) : (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted">{REASONS[check.reason]}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl border border-line px-4 py-3 text-sm"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
