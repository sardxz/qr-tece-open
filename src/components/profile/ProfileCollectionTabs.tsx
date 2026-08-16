"use client";

type CollectionTab = "badges" | "mascotes" | "itens" | "eventos" | "especiais";

type Props = {
  activeTab: CollectionTab;
  onChange: (tab: CollectionTab) => void;
};

const tabs: Array<{ id: CollectionTab; label: string }> = [
  { id: "badges", label: "badges" },
  { id: "mascotes", label: "mascotes" },
  { id: "itens", label: "itens" },
  { id: "eventos", label: "eventos" },
  { id: "especiais", label: "especiais" },
];

export default function ProfileCollectionTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
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
  );
}
