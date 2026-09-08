-- CreateTable
CREATE TABLE "TokenEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "streamDate" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TokenEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TokenEntry_streamDate_idx" ON "TokenEntry"("streamDate");

-- CreateIndex
CREATE INDEX "TokenEntry_userId_streamDate_idx" ON "TokenEntry"("userId", "streamDate");
