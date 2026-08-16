-- AlterTable
ALTER TABLE "User" ADD COLUMN "bonusInvites" INTEGER NOT NULL DEFAULT 0;

-- Concede 3 convites bonus (one-time) a todos os usuarios atuais.
-- Cadastros futuros comecam com 0 (default da coluna).
UPDATE "User" SET "bonusInvites" = 3;
