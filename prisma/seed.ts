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

  // Creators go by first name everywhere in the app.
  // Colours are picked to stay apart from each other and from the orange UI.
  { username: "chelsea", displayName: "Chelsea", role: "MODEL", color: "#d94f70", chaturbateUsername: "chelsea" },
  { username: "amelia", displayName: "Amelia", role: "MODEL", color: "#c98a1b", chaturbateUsername: "amelia" },
  { username: "brooks", displayName: "Brooks", role: "MODEL", color: "#3f8a44", chaturbateUsername: "brooks" },
  { username: "tessa", displayName: "Tessa", role: "MODEL", color: "#8b5cc7", chaturbateUsername: "tessa" },

  { username: "va1", displayName: "VA 1", role: "EMPLOYEE", color: "#7a8b99" },
  { username: "manager1", displayName: "Stream Manager 1", role: "EMPLOYEE", color: "#5a6b7a" },
];

function tempPassword(): string {
  return crypto.randomBytes(6).toString("base64url");
}

async function main() {
  const created: Array<[string, string]> = [];

  for (const person of ROSTER) {
    const existing = await db.user.findUnique({ where: { username: person.username } });
    if (existing) continue;

    const password = tempPassword();
    await db.user.create({
      data: {
        username: person.username,
        displayName: person.displayName,
        role: person.role,
        color: person.color,
        chaturbateUsername: person.chaturbateUsername ?? null,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    created.push([person.username, password]);
  }

  if (created.length === 0) {
    console.log("Everyone in the roster already exists — nothing to do.");
    return;
  }

  console.log("\nAccounts created. Save these now, they are not shown again:\n");
  for (const [username, password] of created) {
    console.log(`  ${username.padEnd(12)} ${password}`);
  }
  console.log("\nEveryone can change their own password after logging in.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
