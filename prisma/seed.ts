import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const db = new PrismaClient();

// Placeholder roster — replace with the real names and rerun, or add people
// from the Team page once you are logged in as the owner.
const ROSTER: Array<{
  username: string;
  displayName: string;
  role: "OWNER" | "MODEL" | "EMPLOYEE";
  color: string;
  chaturbateUsername?: string;
}> = [
  { username: "owner", displayName: "Owner", role: "OWNER", color: "#3b2113" },

  // Creators go by first name everywhere in the app. Colours stay apart from
  // each other and from the orange UI, and are dark enough to carry a white
  // initial in the avatar circles.
  { username: "chelsea", displayName: "Chelsea", role: "MODEL", color: "#c2405f", chaturbateUsername: "chelsea" },
  { username: "amelia", displayName: "Amelia", role: "MODEL", color: "#96690e", chaturbateUsername: "amelia" },
  { username: "brooks", displayName: "Brooks", role: "MODEL", color: "#357439", chaturbateUsername: "brooks" },
  { username: "tessa", displayName: "Tessa", role: "MODEL", color: "#7448b0", chaturbateUsername: "tessa" },

  { username: "va1", displayName: "VA 1", role: "EMPLOYEE", color: "#5f7080" },
  { username: "manager1", displayName: "Stream Manager 1", role: "EMPLOYEE", color: "#7a6455" },
];

function tempPassword(): string {
  return crypto.randomBytes(6).toString("base64url");
}

async function main() {
  const created: Array<[string, string]> = [];

  for (const person of ROSTER) {
    const existing = await db.user.findFirst({
      where: { displayName: person.displayName },
    });
    if (existing) continue;

    // Only the owner is seeded with a password. Everyone else chooses their
    // own username and password from a setup link on the Team page.
    const isOwner = person.role === "OWNER";
    const password = isOwner ? tempPassword() : null;

    await db.user.create({
      data: {
        username: isOwner ? person.username : null,
        displayName: person.displayName,
        role: person.role,
        color: person.color,
        chaturbateUsername: person.chaturbateUsername ?? null,
        passwordHash: password ? await bcrypt.hash(password, 12) : null,
      },
    });

    if (password) created.push([person.username, password]);
  }

  if (created.length === 0) {
    console.log("Roster already in place — nothing to do.");
    return;
  }

  console.log("\nOwner account. Save this now, it is not shown again:\n");
  for (const [username, password] of created) {
    console.log(`  ${username.padEnd(12)} ${password}`);
  }
  console.log(
    "\nEveryone else signs in through a setup link — open the Team page,\n" +
      "create a link for each person, and send it to them.\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
