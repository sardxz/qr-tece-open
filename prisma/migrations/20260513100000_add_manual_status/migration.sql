CREATE TYPE "ManualStatus" AS ENUM ('ONLINE', 'BUSY', 'AWAY', 'OFFLINE');
ALTER TABLE "User" ADD COLUMN "manualStatus" "ManualStatus";
