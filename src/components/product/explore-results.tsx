import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/categories";
import type { ExploreResult } from "@/lib/workflows/list";

export function ExploreResults({ result }: { result: ExploreResult }) {
  if (result.status === "unknown-category") {
    return (
      <section aria-live="polite" className="rounded-3xl border border-danger/30 bg-danger-bg px-6 py-8">
        <h2 className="font-display text-3xl tracking-tight">That topic is not in Ripple</h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-ink">
          “{result.category}” is not a filter this library understands. Choose All, Everyday math,
          Text tools, or Saved notes.
        </p>
      </section>
    );
  }

  if (result.status === "empty-library") {
    return (
      <section aria-live="polite" className="rounded-3xl border border-dashed border-ink/20 bg-card px-5 py-6 md:px-6 md:py-10">
        <h2 className="font-display text-3xl tracking-tight">The library is empty</h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">
          No public recipes are stored in this database. Ripple is not filling the gap with sample
          cards.
        </p>
      </section>
    );
  }

  if (result.status === "empty-search") {
    return (
      <section aria-live="polite" className="rounded-3xl border border-dashed border-ink/20 bg-card px-5 py-6 md:px-6 md:py-10">
        <h2 className="font-display text-3xl tracking-tight">Nothing matches</h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">
          {result.query
            ? `No public recipe title or summary contains “${result.query}”.`
            : "No public recipe is filed under that topic."}{" "}
          {result.publishedCount === 0
            ? "The library itself has no published recipes yet."
            : "Clear the search to see what is published."}
        </p>
      </section>
    );
  }

  return (
    <section aria-live="polite">
      <h2 className="sr-only">Matching recipes</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {result.workflows.map((workflow) => (
          <li key={workflow.id}>
            <article className="flex h-full flex-col rounded-3xl border border-line border-l-4 border-l-lime bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                {workflow.origin === "demo_seed" ? <Badge>Demo</Badge> : <span />}
                <p className="text-sm tabular-nums text-muted">{workflow.estimatedMinutes} min</p>
              </div>
              <h3 className="mt-3 font-display text-[1.7rem] leading-tight tracking-tight">
                {workflow.title}
              </h3>
              <p className="mt-2 text-base leading-7 text-muted">{workflow.summary}</p>
              <p className="mt-4 text-sm text-ink">
                {categoryLabel(workflow.category)} · {workflow.creatorName}
                <span className="text-muted"> @{workflow.creatorHandle}</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Recipe details are not available in this build, so this card does not open a page.
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
