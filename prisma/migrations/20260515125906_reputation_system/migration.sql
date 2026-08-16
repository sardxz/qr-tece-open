-- Drop wallpaperUrl column (removed from schema)
ALTER TABLE "User" DROP COLUMN IF EXISTS "wallpaperUrl";

-- Add reputationScore with default 200 for all users
ALTER TABLE "User" ADD COLUMN "reputationScore" INTEGER NOT NULL DEFAULT 200;

-- Add invitedById (self-referential FK — padrinho/madrinha)
ALTER TABLE "User" ADD COLUMN "invitedById" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create ReputationEvent table
CREATE TABLE "ReputationEvent" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "delta"        INTEGER NOT NULL,
    "reason"       TEXT NOT NULL,
    "sourceUserId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReputationEvent_userId_createdAt_idx"
  ON "ReputationEvent"("userId", "createdAt");

ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
