import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/Logo";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/welcome");

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="w-48" />
          <p className="mt-1 text-sm text-muted">
            Schedules and hours for the roster.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
