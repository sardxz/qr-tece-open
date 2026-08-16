-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('FEATURE', 'FIX', 'BUG');

-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxMembers" INTEGER,
ADD COLUMN     "rules" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenMentionsAt" TIMESTAMP(3),
ADD COLUMN     "profileImageUrl" TEXT;

-- CreateTable
CREATE TABLE "SiteUpdate" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "UpdateType" NOT NULL DEFAULT 'FEATURE',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateLike" (
    "userId" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpdateLike_pkey" PRIMARY KEY ("userId","updateId")
);

-- AddForeignKey
ALTER TABLE "SiteUpdate" ADD CONSTRAINT "SiteUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateLike" ADD CONSTRAINT "UpdateLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateLike" ADD CONSTRAINT "UpdateLike_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "SiteUpdate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
