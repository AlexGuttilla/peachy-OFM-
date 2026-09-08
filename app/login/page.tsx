import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/live");

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Peachy Ops</h1>
        <p className="mt-2 text-sm text-muted">
          Schedules and hours for the roster.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
