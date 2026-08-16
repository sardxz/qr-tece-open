import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`upload-cover:${session.sub}`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitos uploads. Aguarde um momento." }, { status: 429 });
  }

  const formData = (await request.formData()) as unknown as FormData;
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
  const uploadsDir = join(process.cwd(), "uploads", "communities");

  try {
    await mkdir(uploadsDir, { recursive: true });
    const outputPath = join(uploadsDir, filename);
    await sharp(buffer)
      .resize(1200, 400, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toFile(outputPath);
  } catch {
    return NextResponse.json({ error: "Erro ao processar imagem" }, { status: 500 });
  }

  return NextResponse.json({ url: `/uploads/communities/${filename}` });
}
