import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = (await request.formData()) as unknown as FormData;
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG, WebP ou GIF." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
  const uploadsDir = join(process.cwd(), "uploads", "badges");

  try {
    await mkdir(uploadsDir, { recursive: true });
    await sharp(buffer)
      .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(join(uploadsDir, filename));
  } catch {
    return NextResponse.json({ error: "Erro ao processar imagem" }, { status: 500 });
  }

  return NextResponse.json({ url: `/uploads/badges/${filename}` });
}
