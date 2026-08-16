export function formatPostDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLongDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMemberSince(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function formatLocation(city: string | null, state: string | null) {
  if (!city && !state) return null;
  if (city && state) return `${city}, ${state}`;
  return city ?? state;
}

export function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
}
