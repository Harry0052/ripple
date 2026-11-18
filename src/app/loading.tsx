import { ExploreSkeleton } from "@/components/product/explore-skeleton";

export default function Loading() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:pt-14">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">Shareable actions</p>
      <div className="mt-3 h-16 max-w-xl animate-pulse rounded-2xl bg-ink/10" />
      <div className="mt-8">
        <ExploreSkeleton />
      </div>
      <p className="sr-only" role="status">
        Loading recipes
      </p>
    </main>
  );
}
