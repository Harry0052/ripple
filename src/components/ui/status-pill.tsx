import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  succeeded: "bg-lime text-ink",
  failed: "bg-danger-bg text-danger",
  needs_approval: "bg-ink text-paper",
  cancelled: "bg-ink/5 text-muted",
  running: "bg-ink/5 text-ink",
  pending: "bg-ink/5 text-muted",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em]",
        tones[status] ?? "bg-ink/5 text-ink",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
