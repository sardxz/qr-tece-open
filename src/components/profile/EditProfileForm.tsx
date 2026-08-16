"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UserData = {
  username: string;
  gender: "H" | "M";
  bio: string | null;
  city: string | null;
  state: string | null;
  birthYear: number | null;
  profilePhrase: string | null;
  profileImageUrl: string | null;
};

export default function EditProfileForm({ user }: { user: UserData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    username: user.username,
    gender: user.gender,
    bio: user.bio ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    birthYear: user.birthYear ? String(user.birthYear) : "",
    profilePhrase: user.profilePhrase ?? "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.profileImageUrl);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/profile-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error ?? "Erro ao enviar foto");
        return;
      }
      setPhotoUrl(data.url);
      router.refresh();
    } catch {
      setPhotoError("Erro de conexão.");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setSuccess(false);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          gender: form.gender,
          birthYear: form.birthYear ? parseInt(form.birthYear, 10) : null,
          bio: form.bio || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          profilePhrase: form.profilePhrase || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--color-tece-50)",
            color: "var(--color-tece-700)",
            border: "1px solid var(--color-tece-200)",
          }}
        >
          Perfil atualizado! ✦
        </div>
      )}

      {/* Foto de perfil */}
      <div className="flex flex-col gap-2">
        <FieldLabel>foto de perfil</FieldLabel>
        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-full overflow-hidden flex-shrink-0 grid place-items-center text-2xl font-black border-2"
            style={{
              background: "rgba(49,213,222,.18)",
              color: "var(--color-tece-blue)",
              borderColor: "var(--color-border)",
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="foto" className="h-full w-full object-cover" />
            ) : (
              form.username[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading}
              className="btn-secondary text-sm"
            >
              {photoLoading ? "enviando..." : "trocar foto"}
            </button>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              JPG, PNG ou WebP · max 2MB
            </p>
            {photoError && (
              <p className="text-xs" style={{ color: "#b91c1c" }}>{photoError}</p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <div className="h-px" style={{ background: "var(--color-border)" }} />

      {/* Linha 1: username + gênero */}
      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel>nome de usuário</FieldLabel>
          <div
            className="flex overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span
              className="flex items-center border-r px-3 text-sm font-bold"
              style={{
                color: "var(--color-text-muted)",
                background: "var(--color-tece-50)",
                borderColor: "var(--color-border)",
              }}
            >
              @
            </span>
            <input
              type="text"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              value={form.username}
              onChange={update("username")}
              maxLength={20}
              placeholder="seu_username"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel>gênero</FieldLabel>
          <div className="flex gap-1">
            {(["H", "M"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => { setForm((f) => ({ ...f, gender: g })); setSuccess(false); }}
                className="h-[38px] w-10 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: form.gender === g ? "var(--color-tece-500)" : "transparent",
                  color: form.gender === g ? "white" : "var(--color-text-muted)",
                  border: `1.5px solid ${form.gender === g ? "var(--color-tece-500)" : "var(--color-border)"}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>frase do perfil</FieldLabel>
        <input
          type="text"
          className="input-base"
          value={form.profilePhrase}
          onChange={update("profilePhrase")}
          maxLength={140}
          placeholder="Uma frase que te define"
        />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>bio</FieldLabel>
        <textarea
          className="input-base resize-none"
          value={form.bio}
          onChange={update("bio")}
          rows={3}
          maxLength={300}
          placeholder="Conte um pouco sobre você"
        />
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {form.bio.length}/300
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel>cidade</FieldLabel>
          <input
            type="text"
            className="input-base"
            value={form.city}
            onChange={update("city")}
            maxLength={80}
            placeholder="São Paulo"
          />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel>estado (sigla)</FieldLabel>
          <input
            type="text"
            className="input-base"
            value={form.state}
            onChange={update("state")}
            maxLength={2}
            placeholder="SP"
            style={{ textTransform: "uppercase" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>ano de nascimento</FieldLabel>
        <input
          type="number"
          className="input-base"
          value={form.birthYear}
          onChange={update("birthYear")}
          min={1900}
          max={new Date().getFullYear()}
          placeholder="1990"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "salvando..." : "salvar perfil"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()} disabled={loading}>
          cancelar
        </button>
      </div>
    </form>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}
