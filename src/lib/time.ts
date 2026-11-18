export function formatUtc(iso: string | null | undefined) {
  if (!iso) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[1]} ${match[2]} UTC`;
}

export function verifiedLabel(lastVerifiedAt: string | null) {
  const formatted = formatUtc(lastVerifiedAt);
  return formatted ? `Verified ${formatted}` : "Not verified by a run yet";
}
