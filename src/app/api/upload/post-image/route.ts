import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // WebP: RIFF????WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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

  if (!isImageBuffer(buffer)) {
    return NextResponse.json({ error: "Arquivo não é uma imagem válida." }, { status: 400 });
  }
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
  const uploadsDir = join(process.cwd(), "uploads", "posts");

  try {
    await mkdir(uploadsDir, { recursive: true });
    await sharp(buffer)
      .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(uploadsDir, filename));
  } catch {
    return NextResponse.json({ error: "Erro ao processar imagem" }, { status: 500 });
  }

  return NextResponse.json({ url: `/uploads/posts/${filename}` });
}
