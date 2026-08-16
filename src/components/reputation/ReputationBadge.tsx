import { getReputationTier } from "@/components/reputation/reputation";

type Props = {
  score: number;
};

const TIER_STYLES: Record<string, { background: string; color: string; borderColor: string }> = {
  NPC: {
    background: "rgba(148, 163, 184, 0.22)",
    color: "var(--color-text-muted)",
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  Genin: {
    background: "rgba(49, 213, 222, 0.20)",
    color: "var(--color-tece-500)",
    borderColor: "rgba(49, 213, 222, 0.50)",
  },
  "tecê raiz": {
    background: "rgba(253, 101, 160, 0.20)",
    color: "var(--color-tece-pink)",
    borderColor: "rgba(253, 101, 160, 0.48)",
  },
  OG: {
    background: "rgba(245, 158, 11, 0.20)",
    color: "#d97706",
    borderColor: "rgba(245, 158, 11, 0.48)",
  },
};

export default function ReputationBadge({ score }: Props) {
  const tier = getReputationTier(score);

  if (tier === "Lenda do tecê") {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black leading-none"
        style={{
          background: "rgba(220, 50, 0, 0.13)",
          borderColor: "rgba(255, 100, 0, 0.60)",
        }}
      >
        <span
          style={{
            backgroundImage: "linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #ff2200 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 5px rgba(255, 100, 0, 0.85))",
          }}
        >
          {tier}
        </span>
      </span>
    );
  }

  const style = TIER_STYLES[tier] ?? TIER_STYLES.NPC;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black leading-none"
      style={style}
    >
      {tier}
    </span>
  );
}
