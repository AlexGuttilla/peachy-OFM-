import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmt } from "@/lib/time";
import { createInvite, revokeInvite, setActive } from "./actions";
import AddPersonForm from "./AddPersonForm";
import CopyLink from "./CopyLink";

export const dynamic = "force-dynamic";

/** The address this app is actually being reached on, so links work anywhere. */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function TeamPage() {
  await requireOwner();

  const [people, origin] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["MODEL", "EMPLOYEE"] } },
      include: {
        invites: { where: { usedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ active: "desc" }, { role: "desc" }, { displayName: "asc" }],
    }),
    baseUrl(),
  ]);

  const creators = people.filter((p) => p.role === "MODEL");
  const staff = people.filter((p) => p.role !== "MODEL");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Team</h1>

      <AddPersonForm />

      <Group title="Creators" people={creators} origin={origin} />
      <Group title="Team" people={staff} origin={origin} />
    </div>
  );
}

type Person = Awaited<ReturnType<typeof db.user.findMany>>[number] & {
  invites: { id: string; code: string; expiresAt: Date }[];
};

function Group({
  title,
  people,
  origin,
}: {
  title: string;
  people: Person[];
  origin: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted">({people.length})</span>
      </h2>

      {people.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nobody here yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {people.map((person) => {
            const invite = person.invites[0];
            const status = person.username
              ? `signed up as ${person.username}`
              : invite
                ? `link sent, expires ${fmt(invite.expiresAt, "d MMM")}`
                : "no account yet";

            return (
              <li key={person.id} className="rounded-xl border border-line px-3 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: person.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person.displayName}
                      {person.active ? null : (
                        <span className="ml-2 text-xs font-normal text-muted">
                          deactivated
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{status}</p>
                  </div>

                  <form action={setActive}>
                    <input type="hidden" name="userId" value={person.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={person.active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-muted underline underline-offset-4"
                    >
                      {person.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </div>

                {invite ? (
                  <div className="mt-2.5">
                    <CopyLink url={`${origin}/setup/${invite.code}`} />
                    <form action={revokeInvite} className="mt-1.5">
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="text-xs text-accent-strong underline underline-offset-4"
                      >
                        Cancel this link
                      </button>
                    </form>
                  </div>
                ) : person.active ? (
                  <form action={createInvite} className="mt-2.5">
                    <input type="hidden" name="userId" value={person.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
                    >
                      {person.username ? "Send a new setup link" : "Create setup link"}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
