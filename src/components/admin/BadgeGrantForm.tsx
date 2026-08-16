"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Rarity = "common" | "rare" | "epic" | "legendary";
type BadgeTab = "manual" | "criteria";
type ManualMode = "existing" | "create";
type CriterionType =
  | "account_age_days"
  | "depos_received"
  | "depos_sent"
  | "friends_count"
  | "communities_joined"
  | "communities_created"
  | "likes_received"
  | "posts_count";

type BadgeListItem = {
  id: string;
  name: string;
  icon_url: string;
  rarity: string;
  total_supply: number | null;
  awarded_count: number;
  criteria: Array<{ type: CriterionType; min: number }> | null;
};

const CRITERIA_OPTIONS: Array<{ value: CriterionType; label: string }> = [
  { value: "account_age_days", label: "idade da conta (dias)" },
  { value: "depos_received", label: "depos recebidos" },
  { value: "depos_sent", label: "depos enviados" },
  { value: "friends_count", label: "quantidade de amigos" },
  { value: "communities_joined", label: "comunidades participadas" },
  { value: "communities_created", label: "comunidades criadas" },
  { value: "likes_received", label: "curtidas recebidas" },
  { value: "posts_count", label: "posts publicados" },
];

function BadgeIconUploader({
  iconUrl,
  uploading,
  onUpload,
}: {
  iconUrl: string;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        icone
      </span>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="grid h-[132px] place-items-center rounded-2xl border border-dashed transition-opacity hover:opacity-85"
        style={{
          borderColor: "var(--color-border)",
          background: "rgba(7,16,34,.12)",
        }}
      >
        {iconUrl ? (
          <img src={iconUrl} alt="Previa da badge" className="h-20 w-20 object-contain" />
        ) : (
          <span className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            {uploading ? "enviando..." : "upload da imagem"}
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await onUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}

function badgeCountLabel(badge: BadgeListItem) {
  const total = badge.total_supply ?? "∞";
  return `${badge.awarded_count}/${total} concedidas`;
}

export default function BadgeGrantForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BadgeTab>("manual");
  const [manualMode, setManualMode] = useState<ManualMode>("existing");

  const [manualUsername, setManualUsername] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  const [newBadgeUsername, setNewBadgeUsername] = useState("");
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeRarity, setNewBadgeRarity] = useState<Rarity>("common");
  const [newBadgeTotal, setNewBadgeTotal] = useState("");
  const [newBadgeIconUrl, setNewBadgeIconUrl] = useState("");

  const [criteriaName, setCriteriaName] = useState("");
  const [criteriaRarity, setCriteriaRarity] = useState<Rarity>("common");
  const [criteriaTotal, setCriteriaTotal] = useState("");
  const [criteriaIconUrl, setCriteriaIconUrl] = useState("");
  const [criterionType, setCriterionType] = useState<CriterionType>("posts_count");
  const [criterionMin, setCriterionMin] = useState("1");

  const [badges, setBadges] = useState<BadgeListItem[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [submittingCriteria, setSubmittingCriteria] = useState(false);
  const [distributingId, setDistributingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [distributionResult, setDistributionResult] = useState("");

  const selectedBadge = badges.find((badge) => badge.id === selectedBadgeId) ?? null;

  async function loadBadges(showLoading = true) {
    if (showLoading) setLoadingBadges(true);

    try {
      const res = await fetch("/api/admin/badges");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Nao foi possivel carregar as badges.");
        return;
      }

      const nextBadges = data?.badges ?? [];
      setBadges(nextBadges);
      setSelectedBadgeId((current) => {
        if (current && nextBadges.some((badge: BadgeListItem) => badge.id === current)) {
          return current;
        }
        return nextBadges[0]?.id ?? null;
      });
    } catch {
      setError("Erro de conexao ao carregar as badges.");
    } finally {
      setLoadingBadges(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchInitialBadges() {
      try {
        const res = await fetch("/api/admin/badges");
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(data?.error ?? "Nao foi possivel carregar as badges.");
          return;
        }

        const nextBadges = data?.badges ?? [];
        setBadges(nextBadges);
        setSelectedBadgeId(nextBadges[0]?.id ?? null);
      } catch {
        if (active) {
          setError("Erro de conexao ao carregar as badges.");
        }
      } finally {
        if (active) {
          setLoadingBadges(false);
        }
      }
    }

    void fetchInitialBadges();

    return () => {
      active = false;
    };
  }, []);

  async function uploadIcon(file: File, setter: (url: string) => void) {
    setUploading(true);
    setError("");
    setSuccess("");
    setDistributionResult("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/badge-icon", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Nao foi possivel enviar o icone.");
        return;
      }

      setter(data.url);
    } catch {
      setError("Erro de conexao ao enviar o icone.");
    } finally {
      setUploading(false);
    }
  }

  async function grantBadge(payload: {
    username: string;
    name: string;
    iconUrl: string;
    rarity: string;
    totalSupply?: number;
  }) {
    const res = await fetch("/api/admin/badges/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error ?? "Nao foi possivel enviar a badge.");
    }

    return data;
  }

  async function handleExistingManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedBadge) return;

    setSubmittingManual(true);
    setError("");
    setSuccess("");
    setDistributionResult("");

    try {
      const data = await grantBadge({
        username: manualUsername,
        name: selectedBadge.name,
        iconUrl: selectedBadge.icon_url,
        rarity: selectedBadge.rarity,
        totalSupply: selectedBadge.total_supply ?? undefined,
      });

      setSuccess(`badge "${selectedBadge.name}" enviada para @${data?.granted_to ?? manualUsername}`);
      setManualUsername("");
      router.refresh();
      await loadBadges(false);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Nao foi possivel enviar a badge.");
    } finally {
      setSubmittingManual(false);
    }
  }

  async function handleCreateAndGrantSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmittingManual(true);
    setError("");
    setSuccess("");
    setDistributionResult("");

    try {
      const data = await grantBadge({
        username: newBadgeUsername,
        name: newBadgeName,
        iconUrl: newBadgeIconUrl,
        rarity: newBadgeRarity,
        totalSupply: newBadgeTotal ? Number(newBadgeTotal) : undefined,
      });

      setSuccess(`badge "${data?.name ?? newBadgeName}" criada e enviada para @${data?.granted_to ?? newBadgeUsername}`);
      setNewBadgeUsername("");
      setNewBadgeName("");
      setNewBadgeRarity("common");
      setNewBadgeTotal("");
      setNewBadgeIconUrl("");
      setManualMode("existing");
      router.refresh();
      await loadBadges(false);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Nao foi possivel enviar a badge.");
    } finally {
      setSubmittingManual(false);
    }
  }

  async function handleCriteriaSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmittingCriteria(true);
    setError("");
    setSuccess("");
    setDistributionResult("");

    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: criteriaName,
          iconUrl: criteriaIconUrl,
          rarity: criteriaRarity,
          totalSupply: criteriaTotal ? Number(criteriaTotal) : undefined,
          criteria: [{ type: criterionType, min: Number(criterionMin) }],
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Nao foi possivel criar a badge.");
        return;
      }

      setSuccess(`badge "${data?.name ?? criteriaName}" criada com criterio`);
      setCriteriaName("");
      setCriteriaRarity("common");
      setCriteriaTotal("");
      setCriteriaIconUrl("");
      setCriterionType("posts_count");
      setCriterionMin("1");
      await loadBadges(false);
    } catch {
      setError("Erro de conexao ao criar a badge.");
    } finally {
      setSubmittingCriteria(false);
    }
  }

  async function distributeNow(badgeId: string) {
    setDistributingId(badgeId);
    setError("");
    setSuccess("");
    setDistributionResult("");

    try {
      const res = await fetch(`/api/admin/badges/${badgeId}/distribute`, {
        method: "POST",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Nao foi possivel distribuir a badge.");
        return;
      }

      setDistributionResult(`${data?.granted ?? 0} badges distribuidas, ${data?.skipped ?? 0} ja tinham`);
      await loadBadges(false);
      router.refresh();
    } catch {
      setError("Erro de conexao ao distribuir a badge.");
    } finally {
      setDistributingId(null);
    }
  }

  const tabs: Array<{ id: BadgeTab; label: string }> = [
    { id: "manual", label: "conceder manualmente" },
    { id: "criteria", label: "criar com criterios" },
  ];

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          badges
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          crie, conceda e distribua badges sem sair do painel admin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: isActive ? "rgba(49,213,222,.14)" : "transparent",
                color: isActive ? "var(--color-tece-500)" : "var(--color-text-muted)",
                border: `1px solid ${isActive ? "rgba(49,213,222,.22)" : "transparent"}`,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

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
          {success}
        </div>
      )}

      {distributionResult && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "rgba(49,213,222,.08)",
            color: "var(--color-text)",
            border: "1px solid rgba(49,213,222,.18)",
          }}
        >
          {distributionResult}
        </div>
      )}

      {activeTab === "manual" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {manualMode === "existing" ? "conceder badge existente" : "criar e conceder badge nova"}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {manualMode === "existing"
                  ? "escolha uma badge criada, informe o destinatario e envie."
                  : "use este caminho apenas quando a badge ainda nao existir."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setManualMode((current) => (current === "existing" ? "create" : "existing"))}
              className="text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--color-tece-500)" }}
            >
              {manualMode === "existing" ? "criar nova badge" : "usar badge existente"}
            </button>
          </div>

          {manualMode === "existing" ? (
            <>
              <div className="rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "rgba(7,16,34,.08)" }}>
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      badges disponiveis
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      selecione uma serie ja criada para evitar duplicacoes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadBadges()}
                    className="text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-tece-500)" }}
                  >
                    atualizar lista
                  </button>
                </div>

                <div className="p-4">
                  {loadingBadges ? (
                    <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      carregando badges...
                    </div>
                  ) : badges.length === 0 ? (
                    <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      nenhuma badge criada ainda.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {badges.map((badge) => {
                        const isSelected = selectedBadgeId === badge.id;

                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => setSelectedBadgeId(badge.id)}
                            className="flex items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:opacity-90"
                            style={{
                              borderColor: isSelected ? "rgba(49,213,222,.34)" : "var(--color-border)",
                              background: isSelected ? "rgba(49,213,222,.08)" : "rgba(7,16,34,.12)",
                              boxShadow: isSelected ? "0 0 0 1px rgba(49,213,222,.16)" : "none",
                            }}
                          >
                            <div
                              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border"
                              style={{ borderColor: "var(--color-border)", background: "rgba(49,213,222,.08)" }}
                            >
                              <img src={badge.icon_url} alt={badge.name} className="h-9 w-9 object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                                {badge.name}
                              </p>
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                {badge.rarity}
                              </p>
                              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                                {badgeCountLabel(badge)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleExistingManualSubmit} className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "rgba(7,16,34,.08)" }}>
                <div className="grid gap-4 min-[900px]:grid-cols-[1fr,auto]">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      username do destinatario
                    </span>
                    <input
                      type="text"
                      className="input-base"
                      value={manualUsername}
                      onChange={(event) => setManualUsername(event.target.value)}
                      placeholder="@usuario"
                      required
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingManual || !selectedBadge || loadingBadges}
                    >
                      {submittingManual ? "enviando..." : "enviar"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <form onSubmit={handleCreateAndGrantSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 min-[900px]:grid-cols-[140px,1fr]">
                <BadgeIconUploader
                  iconUrl={newBadgeIconUrl}
                  uploading={uploading}
                  onUpload={(file) => uploadIcon(file, setNewBadgeIconUrl)}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      username do destinatario
                    </span>
                    <input
                      type="text"
                      className="input-base"
                      value={newBadgeUsername}
                      onChange={(event) => setNewBadgeUsername(event.target.value)}
                      placeholder="@usuario"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      nome
                    </span>
                    <input
                      type="text"
                      className="input-base"
                      value={newBadgeName}
                      onChange={(event) => setNewBadgeName(event.target.value)}
                      placeholder="nome da badge"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      raridade
                    </span>
                    <select
                      className="input-base"
                      value={newBadgeRarity}
                      onChange={(event) => setNewBadgeRarity(event.target.value as Rarity)}
                    >
                      <option value="common">common</option>
                      <option value="rare">rare</option>
                      <option value="epic">epic</option>
                      <option value="legendary">legendary</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      estoque
                    </span>
                    <input
                      type="number"
                      className="input-base"
                      value={newBadgeTotal}
                      onChange={(event) => setNewBadgeTotal(event.target.value)}
                      min={1}
                      placeholder="opcional"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={submittingManual || uploading || !newBadgeIconUrl}>
                  {submittingManual ? "enviando..." : "enviar badge"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <form onSubmit={handleCriteriaSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 min-[900px]:grid-cols-[140px,1fr]">
              <BadgeIconUploader
                iconUrl={criteriaIconUrl}
                uploading={uploading}
                onUpload={(file) => uploadIcon(file, setCriteriaIconUrl)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    nome
                  </span>
                  <input
                    type="text"
                    className="input-base"
                    value={criteriaName}
                    onChange={(event) => setCriteriaName(event.target.value)}
                    placeholder="nome da badge"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    raridade
                  </span>
                  <select
                    className="input-base"
                    value={criteriaRarity}
                    onChange={(event) => setCriteriaRarity(event.target.value as Rarity)}
                  >
                    <option value="common">common</option>
                    <option value="rare">rare</option>
                    <option value="epic">epic</option>
                    <option value="legendary">legendary</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    estoque
                  </span>
                  <input
                    type="number"
                    className="input-base"
                    value={criteriaTotal}
                    onChange={(event) => setCriteriaTotal(event.target.value)}
                    min={1}
                    placeholder="opcional"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    criterio
                  </span>
                  <select
                    className="input-base"
                    value={criterionType}
                    onChange={(event) => setCriterionType(event.target.value as CriterionType)}
                  >
                    {CRITERIA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    minimo
                  </span>
                  <input
                    type="number"
                    className="input-base"
                    value={criterionMin}
                    onChange={(event) => setCriterionMin(event.target.value)}
                    min={1}
                    required
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={submittingCriteria || uploading || !criteriaIconUrl}>
                {submittingCriteria ? "criando..." : "criar badge"}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "rgba(7,16,34,.08)" }}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  badges criadas
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  distribua manualmente as badges que usam criterios.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadBadges()}
                className="text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--color-tece-500)" }}
              >
                atualizar lista
              </button>
            </div>

            <div className="flex flex-col">
              {loadingBadges ? (
                <div className="px-4 py-5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  carregando badges...
                </div>
              ) : badges.length === 0 ? (
                <div className="px-4 py-5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  nenhuma badge criada ainda.
                </div>
              ) : (
                badges.map((badge, index) => (
                  <div
                    key={badge.id}
                    className="flex flex-col gap-3 px-4 py-4 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between"
                    style={{
                      borderTop: index === 0 ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-12 w-12 place-items-center rounded-xl border"
                        style={{ borderColor: "var(--color-border)", background: "rgba(49,213,222,.08)" }}
                      >
                        <img src={badge.icon_url} alt={badge.name} className="h-8 w-8 object-contain" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                          {badge.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {badge.rarity} · {badgeCountLabel(badge)}
                        </p>
                        {badge.criteria?.[0] && (
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            criterio: {CRITERIA_OPTIONS.find((option) => option.value === badge.criteria?.[0]?.type)?.label ?? badge.criteria[0].type} · min {badge.criteria[0].min}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void distributeNow(badge.id)}
                      disabled={distributingId === badge.id || !badge.criteria?.length}
                    >
                      {distributingId === badge.id ? "distribuindo..." : "distribuir agora"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
