"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatFileSize } from "@/lib/utils";

type CoverFileMeta = {
  name: string;
  width: number;
  height: number;
  sizeLabel: string;
};

type Props = {
  initialCoverUrl: string | null;
  username: string;
  isOwnProfile: boolean;
};

const COVER_HEIGHT_CLASS = "h-[240px] min-[900px]:h-[280px] min-[1400px]:h-[320px]";
const COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const COVER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel ler a imagem."));
    };

    image.src = objectUrl;
  });
}

export default function ProfileCover({ initialCoverUrl, username, isOwnProfile }: Props) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverFileMeta, setCoverFileMeta] = useState<CoverFileMeta | null>(null);

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setCoverError("");

    try {
      if (!COVER_ALLOWED_TYPES.includes(file.type)) {
        setCoverError("Formato invalido. Use JPG, PNG ou WebP.");
        return;
      }

      if (file.size > COVER_MAX_SIZE_BYTES) {
        setCoverError("Arquivo muito grande. Maximo de 5 MB.");
        return;
      }

      const dimensions = await readImageDimensions(file);
      setCoverFileMeta({
        name: file.name,
        width: dimensions.width,
        height: dimensions.height,
        sizeLabel: formatFileSize(file.size),
      });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/profile-cover", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setCoverError(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Erro ao enviar capa.",
        );
        return;
      }

      if (data && typeof data === "object" && "url" in data && typeof data.url === "string") {
        setCoverUrl(data.url);
      }
      router.refresh();
    } catch {
      setCoverError("Erro de conexao.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  }

  return (
    <div
      className={`relative ${COVER_HEIGHT_CLASS}`}
      style={{ background: "var(--color-tece-100)" }}
    >
      {coverUrl ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 min-[1400px]:hidden"
            style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              filter: "blur(18px)",
              transform: "scale(1.06)",
            }}
          />
          <img
            src={coverUrl}
            alt={`capa do perfil de ${username}`}
            className="relative z-[1] h-full w-full object-contain object-center min-[1400px]:hidden"
          />
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            className="hidden h-full w-full object-cover object-center min-[1400px]:block"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(7,16,34,0.2) 0%, rgba(7,16,34,0.28) 100%)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.25))" }}
        />
      )}

      {isOwnProfile && (
        <>
          <div
            className="absolute left-3 right-[7.25rem] top-3 z-[2] rounded-2xl border px-3 py-2 text-left shadow-lg min-[560px]:bottom-3 min-[560px]:left-1/2 min-[560px]:right-auto min-[560px]:top-auto min-[560px]:w-[calc(56%-2rem)] min-[560px]:max-w-[314px] min-[560px]:-translate-x-1/2 min-[1400px]:w-[calc(100%-2rem)] min-[1400px]:max-w-[560px]"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              background: "rgba(10, 16, 32, 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p
              className="text-[10px] font-semibold leading-[1.35] min-[560px]:text-[13px] min-[560px]:leading-[1.3] min-[560px]:text-center min-[1400px]:text-[11px] min-[1400px]:leading-relaxed"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              <span className="block min-[1400px]:hidden">
                recomendado 1200 x 300 px (4:1)
              </span>
              <span className="hidden min-[1400px]:inline">
                {coverUrl ? "Editar capa" : "Adicionar capa"} · recomendado 1200 x 300 px (4:1)
              </span>
              <span className="block">max 5 MB · JPG, PNG ou WebP</span>
            </p>
            {coverFileMeta && (
              <p
                className="mt-1 hidden text-[9px] leading-relaxed min-[560px]:block min-[560px]:text-center min-[1400px]:text-[10px]"
                style={{ color: "rgba(255,255,255,0.74)" }}
              >
                {coverFileMeta.width} x {coverFileMeta.height} px · {coverFileMeta.sizeLabel}
              </p>
            )}
          </div>

          <label
            className={`absolute right-4 top-4 z-[3] cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition-opacity hover:opacity-80 ${isUploadingCover ? "pointer-events-none opacity-60" : ""}`}
            style={{
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            {isUploadingCover ? "enviando..." : (
              <>
                <span className="min-[560px]:hidden">editar</span>
                <span className="hidden min-[560px]:inline">
                  {coverUrl ? "editar capa" : "adicionar capa"}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleCoverChange}
            />
          </label>
        </>
      )}

      {coverError && (
        <div
          className="absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: "rgba(185,28,28,0.92)", color: "#fff" }}
        >
          {coverError}
        </div>
      )}
    </div>
  );
}
