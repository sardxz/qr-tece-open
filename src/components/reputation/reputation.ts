export function getReputationTier(score: number): string {
  if (score >= 900) return "Lenda do tecê";
  if (score >= 700) return "OG";
  if (score >= 500) return "tecê raiz";
  if (score >= 200) return "Genin";
  return "NPC";
}
