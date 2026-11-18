import { Button } from "@/components/ui/button";
import { ExploreResults } from "@/components/product/explore-results";
import { CATEGORIES } from "@/lib/categories";
import { getDb } from "@/lib/db/client";
import { exploreQuerySchema, firstParam } from "@/lib/validators/explore";
import { listPublishedWorkflows } from "@/lib/workflows/list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore",
  description: "Search public Ripple recipes. Nothing runs until you open one and consent.",
};

export default async function ExplorePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await props.searchParams;
  const parsed = exploreQuerySchema.safeParse({
    q: firstParam(raw.q),
    category: firstParam(raw.category),
  });

  const query = parsed.success ? (parsed.data.q ?? "") : "";
  const category = parsed.success ? (parsed.data.category ?? "all") : "all";
  const result = parsed.success
    ? listPublishedWorkflows(getDb(), { query, category })
    : null;
  const fieldError = parsed.success ? undefined : parsed.error.issues[0]?.message;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:pt-14">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">Shareable actions</p>
      <h1 className="mt-2 max-w-4xl font-display text-[2.35rem] leading-[1.02] tracking-tight md:mt-3 md:text-7xl">
        Run the recipe. See every step.
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-muted md:mt-5 md:text-lg md:leading-8">
        Search recipes stored in this database. You preview every step before anything runs.
      </p>

      <form action="/" method="get" className="mt-5 rounded-[1.75rem] border border-line bg-card p-3 shadow-[0_1px_0_rgba(17,19,24,0.04)] md:mt-8" role="search">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="q">
            Search recipes
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            maxLength={80}
            placeholder="Try a chore, like splitting a bill"
            className="h-12 w-full rounded-full border border-line bg-paper px-4 text-base text-ink placeholder:text-muted/80"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "search-error" : undefined}
          />
          {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
          <Button type="submit" className="sm:min-w-36">
            Search
          </Button>
        </div>
        {fieldError ? (
          <p id="search-error" className="px-4 pt-2 text-sm text-danger" role="alert">
            {fieldError}
          </p>
        ) : null}
      </form>

      <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label="Topics">
        {CATEGORIES.map((item) => {
          const selected = category === item.id || (item.id === "all" && category === "all");
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (item.id !== "all") params.set("category", item.id);
          const href = params.size > 0 ? `/?${params.toString()}` : "/";
          return (
            <a
              key={item.id}
              href={href}
              aria-current={selected ? "true" : undefined}
              className={
                selected
                  ? "inline-flex min-h-11 shrink-0 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper"
                  : "inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink"
              }
            >
              {item.label}
            </a>
          );
        })}
      </div>

      <div className="mt-5 md:mt-8">
        {result ? (
          <ExploreResults result={result} />
        ) : (
          <p role="alert" className="text-danger">
            {fieldError}
          </p>
        )}
      </div>
    </main>
  );
}
