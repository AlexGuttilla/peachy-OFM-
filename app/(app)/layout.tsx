import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LogoLockup } from "@/components/Logo";
import { logout } from "./actions";
import NavTabs from "./NavTabs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/home" aria-label="Peachy home">
            <LogoLockup />
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{user.displayName}</span>
            <form action={logout}>
              <button type="submit" className="underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-32 pt-6">
        {children}
      </main>

      <NavTabs isOwner={user.role === "OWNER"} />
    </>
  );
}
