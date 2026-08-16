import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL ?? "postgresql://tece:tece_dev_pass@localhost:5432/tecedb";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function generateCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

async function main() {
  console.log("🌱 Iniciando seed...");

  // Sem fallback de propósito: um seed que cria admin com senha padrão em
  // silêncio vira porta aberta se rodado em produção por engano.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("✅ Admin já existe, pulando criação.");
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: "admin",
        gender: "H",
        passwordHash,
        role: "ADMIN",
        profilePhrase: "Quem faz a rede.",
      },
    });

    console.log(`✅ Admin criado: ${admin.email}`);

    const invites = Array.from({ length: 10 }, () => ({
      code: generateCode(),
      createdById: admin.id,
    }));

    await prisma.invite.createMany({ data: invites });

    console.log("✅ 10 convites gerados:");
    invites.forEach((inv) => console.log(`   → ${inv.code}`));
  }

  console.log("🌱 Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
