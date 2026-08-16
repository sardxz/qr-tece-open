"use client";

import { useState } from "react";
import ProfileCollectionTabs from "@/components/profile/ProfileCollectionTabs";

type CollectionTab = "badges" | "mascotes" | "itens" | "eventos" | "especiais";

type CollectionItem = {
  id: string;
  name?: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  editionNumber?: number | null;
  totalSupply?: number | null;
};

type Props = {
  itemsByTab: Record<CollectionTab, CollectionItem[]>;
};

const TAB_ORDER: CollectionTab[] = ["badges", "mascotes", "itens", "eventos", "especiais"];
const VISIBLE_SLOTS = 18;

function getRarityBorder(rarity: CollectionItem["rarity"]) {
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

export default function ProfileCollection({ itemsByTab }: Props) {
  const [activeTab, setActiveTab] = useState<CollectionTab>("badges");
  const items = itemsByTab[activeTab] ?? [];
  const visibleItems = items.slice(0, VISIBLE_SLOTS);
  const emptySlots = Math.max(1, VISIBLE_SLOTS - visibleItems.length);

  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ◈
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            coleção completa
          </h2>
        </div>
        <button
          type="button"
          className="text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--color-tece-500)" }}
        >
          ver coleção completa
        </button>
      </div>

      <ProfileCollectionTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        <div className="grid grid-cols-5 gap-3 min-[560px]:grid-cols-6 min-[900px]:grid-cols-5">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name ?? "item da coleção"}
              className="flex min-h-[96px] w-full flex-col items-center justify-start rounded-xl border px-1 py-2 transition-opacity hover:opacity-85"
              style={{
                borderColor: getRarityBorder(item.rarity),
                background: "rgba(7, 16, 34, 0.18)",
              }}
            >
              <img src={item.icon} alt={item.name ?? "item da coleção"} className="h-8 w-8 shrink-0 object-contain" />
              {item.name && (
                <span
                  className="mt-1 w-full truncate text-center text-[10px] font-medium leading-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  {item.name}
                </span>
              )}
              <RarityBadge rarity={item.rarity} />
              {item.editionNumber && item.totalSupply && (
                <span style={{ color: "var(--color-text-muted)", fontSize: "9px", fontWeight: 700 }}>
                  {item.editionNumber}/{item.totalSupply}
                </span>
              )}
            </button>
          ))}

          {Array.from({ length: emptySlots }, (_, index) => (
            <button
              key={`empty-${TAB_ORDER.indexOf(activeTab)}-${index}`}
              type="button"
              className="grid min-h-[96px] w-full place-items-center rounded-xl border border-dashed text-2xl transition-opacity hover:opacity-80"
              style={{
                borderColor: "var(--color-border)",
                background: "rgba(7, 16, 34, 0.12)",
                color: "var(--color-tece-500)",
              }}
            >
              +
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
