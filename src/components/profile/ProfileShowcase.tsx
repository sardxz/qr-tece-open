"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShowcaseItem, ShowcaseCollectionItem } from "@/types";

type Props = {
  items: ShowcaseItem[];
  collectionItems?: ShowcaseCollectionItem[];
  isOwnProfile: boolean;
};

const TOTAL_SLOTS = 6;

function getRarityBorder(rarity: ShowcaseCollectionItem["rarity"]) {
  switch (rarity) {
    case "rare":
      return "rgba(49,213,222,.24)";
    case "epic":
      return "rgba(253,101,160,.22)";
    case "legendary":
      return "rgba(255,190,92,.24)";
    default:
      return "var(--color-border)";
  }
}

function RarityBadge({ rarity }: { rarity: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    common: { bg: "rgba(148,163,184,0.14)", color: "#94a3b8", label: "comum" },
    rare: { bg: "rgba(49,213,222,0.14)", color: "var(--color-tece-500)", label: "raro" },
    epic: { bg: "rgba(139,92,246,0.16)", color: "#a78bfa", label: "épico" },
    legendary: { bg: "rgba(251,191,36,0.14)", color: "#fbbf24", label: "lendário" },
  };
  const s = styles[rarity] ?? styles.common;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        borderRadius: "999px",
        padding: "2px 7px",
        border: `1px solid ${s.color}`,
        display: "inline-block",
        marginTop: "4px",
      }}
    >
      {s.label}
    </span>
  );
}

export default function ProfileShowcase({ items, collectionItems = [], isOwnProfile }: Props) {
  const router = useRouter();
  const initialSlots = useMemo(
    () => Array.from({ length: TOTAL_SLOTS }, (_, index) => items[index] ?? null),
    [items],
  );
  const [slots, setSlots] = useState<Array<ShowcaseItem | null>>(initialSlots);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openEditor() {
    setSlots(initialSlots);
    setSelectedSlot(0);
    setError("");
    setIsEditing(true);
  }

  function cancelEditor() {
    setSlots(initialSlots);
    setSelectedSlot(0);
    setError("");
    setIsEditing(false);
  }

  function assignItem(item: ShowcaseCollectionItem) {
    const nextIndex = selectedSlot ?? slots.findIndex((slot) => slot === null);
    if (nextIndex < 0 || nextIndex >= TOTAL_SLOTS) return;

    setSlots((prev) => {
      const next = prev.map((slot) => (slot?.id === item.id ? null : slot));
      next[nextIndex] = {
        id: item.id,
        type: "badge",
        name: item.name,
        icon: item.icon,
        rarity: item.rarity,
        editionNumber: item.editionNumber,
        totalSupply: item.totalSupply,
      };

      const nextEmpty = next.findIndex((slot, index) => index > nextIndex && slot === null);
      setSelectedSlot(nextEmpty >= 0 ? nextEmpty : nextIndex);

      return next;
    });
  }

  function clearSlot(index: number) {
    setSlots((prev) => prev.map((slot, slotIndex) => (slotIndex === index ? null : slot)));
    setSelectedSlot(index);
  }

  async function saveShowcase() {
    setLoading(true);
    setError("");

    try {
      const payload = slots
        .map((slot, index) => (slot ? { position: index + 1, itemId: slot.id } : null))
        .filter((slot): slot is { position: number; itemId: string } => slot !== null);

      const res = await fetch("/api/users/me/showcase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: payload }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Nao foi possivel salvar a vitrine.");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Erro de conexao ao salvar a vitrine.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ✦
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            em destaque
          </h2>
        </div>
        {isOwnProfile && (
          <button
            type="button"
            onClick={isEditing ? cancelEditor : openEditor}
            className="text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-tece-500)" }}
          >
            {isEditing ? "fechar edicao" : "editar vitrine"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {slots.map((item, index) => {
          const isSelected = isEditing && selectedSlot === index;

          if (item && !isEditing) {
            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-[120px] flex-col items-center justify-between rounded-xl border px-3 py-3 text-center transition-all hover:-translate-y-0.5 hover:opacity-95"
                style={{
                  borderColor: getRarityBorder(item.rarity ?? "common"),
                  background: "rgba(7, 16, 34, 0.18)",
                }}
              >
                <span className="grid h-[62px] w-[62px] place-items-center rounded-xl" style={{ background: "rgba(49,213,222,.08)" }}>
                  <img src={item.icon} alt={item.name} className="h-11 w-11 object-contain" />
                </span>
                <span className="text-[11px] font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                  {item.name}
                </span>
                <RarityBadge rarity={item.rarity ?? "common"} />
              </Link>
            ) : (
              <div
                key={item.id}
                className="flex min-h-[120px] flex-col items-center justify-between rounded-xl border px-3 py-3 text-center"
                style={{
                  borderColor: getRarityBorder(item.rarity ?? "common"),
                  background: "rgba(7, 16, 34, 0.18)",
                }}
              >
                <span className="grid h-[62px] w-[62px] place-items-center rounded-xl" style={{ background: "rgba(49,213,222,.08)" }}>
                  <img src={item.icon} alt={item.name} className="h-11 w-11 object-contain" />
                </span>
                <span className="text-[11px] font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                  {item.name}
                </span>
                <RarityBadge rarity={item.rarity ?? "common"} />
              </div>
            );
          }

          return (
            <div key={item ? item.id : `empty-${index}`} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!isEditing) {
                    openEditor();
                    setSelectedSlot(index);
                    return;
                  }
                  setSelectedSlot(index);
                }}
                className="flex min-h-[120px] w-full flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition-all hover:opacity-85"
                style={{
                  borderColor: isSelected
                    ? "rgba(49,213,222,.34)"
                    : item
                      ? getRarityBorder(item.rarity ?? "common")
                      : "var(--color-border)",
                  background: item ? "rgba(7, 16, 34, 0.18)" : "rgba(7, 16, 34, 0.12)",
                  boxShadow: isSelected ? "0 0 0 1px rgba(49,213,222,.16)" : "none",
                }}
              >
                {item ? (
                  <>
                    <span className="grid h-[62px] w-[62px] place-items-center rounded-xl" style={{ background: "rgba(49,213,222,.08)" }}>
                      <img src={item.icon} alt={item.name} className="h-11 w-11 object-contain" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                      {item.name}
                    </span>
                    <RarityBadge rarity={item.rarity ?? "common"} />
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-light" style={{ color: "var(--color-tece-500)" }}>+</span>
                    <span className="mt-2 text-[11px] font-medium leading-tight" style={{ color: "var(--color-text-muted)" }}>
                      adicionar item
                    </span>
                  </>
                )}
              </button>

              {item && isEditing && (
                <button
                  type="button"
                  onClick={() => clearSlot(index)}
                  className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-xs"
                  style={{
                    background: "rgba(7,16,34,.72)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                  aria-label={`Remover ${item.name} da vitrine`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "rgba(7,16,34,.12)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                escolha itens da sua colecao
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                clique em um slot acima e depois em um item abaixo para preencher a vitrine.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={cancelEditor} disabled={loading}>
                cancelar
              </button>
              <button type="button" className="btn-primary" onClick={saveShowcase} disabled={loading}>
                {loading ? "salvando..." : "salvar vitrine"}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="mt-3 rounded-xl px-3 py-2 text-sm"
              style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
            >
              {error}
            </div>
          )}

          {collectionItems.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 min-[560px]:grid-cols-4">
              {collectionItems.map((item) => {
                const alreadySelected = slots.some((slot) => slot?.id === item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => assignItem(item)}
                    className="flex min-h-[112px] flex-col items-center justify-between rounded-xl border px-3 py-3 text-center transition-all hover:-translate-y-0.5 hover:opacity-95"
                    style={{
                      borderColor: alreadySelected ? "rgba(49,213,222,.28)" : getRarityBorder(item.rarity),
                      background: alreadySelected ? "rgba(49,213,222,.08)" : "rgba(7, 16, 34, 0.18)",
                    }}
                  >
                    <span className="grid h-[58px] w-[58px] place-items-center rounded-xl" style={{ background: "rgba(49,213,222,.08)" }}>
                      <img src={item.icon} alt={item.name} className="h-10 w-10 object-contain" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                      {item.name}
                    </span>
                    <RarityBadge rarity={item.rarity} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="mt-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              sua colecao ainda nao tem itens para exibir na vitrine.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
