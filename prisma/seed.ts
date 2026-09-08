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
  { username: "owner", displayName: "Owner", role: "OWNER", color: "#0f172a" },

  { username: "model1", displayName: "Model 1", role: "MODEL", color: "#f472b6", chaturbateUsername: "model1" },
  { username: "model2", displayName: "Model 2", role: "MODEL", color: "#a78bfa", chaturbateUsername: "model2" },
  { username: "model3", displayName: "Model 3", role: "MODEL", color: "#38bdf8", chaturbateUsername: "model3" },
  { username: "model4", displayName: "Model 4", role: "MODEL", color: "#34d399", chaturbateUsername: "model4" },
  { username: "model5", displayName: "Model 5", role: "MODEL", color: "#fbbf24" },
  { username: "model6", displayName: "Model 6", role: "MODEL", color: "#fb7185" },
  { username: "model7", displayName: "Model 7", role: "MODEL", color: "#c084fc" },

  { username: "va1", displayName: "VA 1", role: "EMPLOYEE", color: "#94a3b8" },
  { username: "manager1", displayName: "Stream Manager 1", role: "EMPLOYEE", color: "#64748b" },
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
