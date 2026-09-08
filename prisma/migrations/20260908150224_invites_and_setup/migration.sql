-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f472b6',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "chaturbateUsername" TEXT,
    "chaturbateEventsUrl" TEXT,
    "chaturbateCursor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "chaturbateCursor", "chaturbateEventsUrl", "chaturbateUsername", "color", "createdAt", "displayName", "id", "passwordHash", "role", "username") SELECT "active", "chaturbateCursor", "chaturbateEventsUrl", "chaturbateUsername", "color", "createdAt", "displayName", "id", "passwordHash", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_userId_idx" ON "Invite"("userId");
