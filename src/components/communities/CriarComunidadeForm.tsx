"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function CriarComunidadeForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [rules, setRules] = useState("");
  const [limitMembers, setLimitMembers] = useState(false);
  const [maxMembers, setMaxMembers] = useState<string>("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    const auto = val.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setSlug(auto.slice(0, 60));
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!coverFile) {
      setError("A capa é obrigatória");
      return;
    }

    const maxNum = limitMembers ? parseInt(maxMembers, 10) : null;
    if (limitMembers && (isNaN(maxNum!) || maxNum! < 2 || maxNum! > 500)) {
      setError("Limite de membros deve ser entre 2 e 500.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", coverFile);

      const uploadRes = await fetch("/api/upload/community-cover", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "Erro ao enviar imagem");
        return;
      }

      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description,
          coverImageUrl: uploadData.url,
          isPrivate,
          rules: rules.trim() || undefined,
          maxMembers: maxNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar comunidade");
        return;
      }

      router.push(`/comunidades/${data.slug}`);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="text-sm px-3 py-2 rounded-lg"
          style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          nome
        </label>
        <input type="text" className="input-base" value={name} onChange={handleNameChange}
          required maxLength={80} placeholder="Ex: Filmes dos Anos 90" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          slug (URL)
        </label>
        <div className="input-base flex items-center gap-0 p-0 overflow-hidden">
          <span className="px-3 text-xs whitespace-nowrap shrink-0"
            style={{ color: "var(--color-text-muted)" }}>
            /comunidades/
          </span>
          <input
            type="text"
            className="flex-1 bg-transparent outline-none py-2 pr-3 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            required maxLength={60} placeholder="filmes-dos-anos-90"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          descrição
        </label>
        <textarea className="input-base resize-none" value={description}
          onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500}
          placeholder="Do que se trata esta comunidade?" />
      </div>

      {/* Tipo de comunidade */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          tipo de comunidade
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-left transition-all"
            style={{
              border: `2px solid ${!isPrivate ? "var(--color-tece-300)" : "var(--color-border)"}`,
              background: !isPrivate ? "rgba(49,213,222,.08)" : "white",
              color: !isPrivate ? "var(--color-tece-600)" : "var(--color-text-muted)",
            }}
          >
            <div className="text-base mb-0.5">🔓 aberta</div>
            <div className="text-xs font-normal">qualquer pessoa pode entrar</div>
          </button>
          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-left transition-all"
            style={{
              border: `2px solid ${isPrivate ? "var(--color-tece-300)" : "var(--color-border)"}`,
              background: isPrivate ? "rgba(49,213,222,.08)" : "white",
              color: isPrivate ? "var(--color-tece-600)" : "var(--color-text-muted)",
            }}
          >
            <div className="text-base mb-0.5">🔒 fechada</div>
            <div className="text-xs font-normal">entrada por convite</div>
          </button>
        </div>
      </div>

      {/* Limite de membros */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          limite de membros
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setLimitMembers(false)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-left transition-all"
            style={{
              border: `2px solid ${!limitMembers ? "var(--color-tece-300)" : "var(--color-border)"}`,
              background: !limitMembers ? "rgba(49,213,222,.08)" : "white",
              color: !limitMembers ? "var(--color-tece-600)" : "var(--color-text-muted)",
            }}
          >
            <div className="text-base mb-0.5">∞ ilimitado</div>
            <div className="text-xs font-normal">sem teto de membros</div>
          </button>
          <button
            type="button"
            onClick={() => setLimitMembers(true)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-left transition-all"
            style={{
              border: `2px solid ${limitMembers ? "var(--color-tece-300)" : "var(--color-border)"}`,
              background: limitMembers ? "rgba(49,213,222,.08)" : "white",
              color: limitMembers ? "var(--color-tece-600)" : "var(--color-text-muted)",
            }}
          >
            <div className="text-base mb-0.5">👥 com limite</div>
            <div className="text-xs font-normal">máximo 500 pessoas</div>
          </button>
        </div>
        {limitMembers && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              className="input-base"
              style={{ maxWidth: "140px" }}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              min={2}
              max={500}
              placeholder="Ex: 100"
            />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              máximo de membros (2–500)
            </span>
          </div>
        )}
      </div>

      {/* Regras */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          regras da comunidade <span className="font-normal">(opcional)</span>
        </label>
        <textarea
          className="input-base resize-none"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={"1. Respeite todos os membros\n2. Sem spam ou conteúdo irrelevante\n3. ..."}
        />
        <span className="text-xs text-right" style={{ color: "var(--color-text-muted)" }}>
          {rules.length}/2000
        </span>
      </div>

      {/* Capa */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          capa da comunidade <span style={{ color: "#b91c1c" }}>*</span>
        </label>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          1200 × 400px recomendado — JPG, PNG ou WebP — máx. 5MB
        </p>

        {coverPreview ? (
          <div className="relative rounded-xl overflow-hidden" style={{ height: "160px" }}>
            <img src={coverPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button
              type="button"
              onClick={() => { setCoverFile(null); setCoverPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              trocar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl flex items-center justify-center text-sm transition-colors"
            style={{
              height: "160px",
              border: "2px dashed var(--color-border)",
              color: "var(--color-text-muted)",
              background: "var(--color-tece-50)",
            }}
          >
            + selecionar imagem
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCoverChange}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "criando…" : "criar comunidade"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          cancelar
        </button>
      </div>
    </form>
  );
}
