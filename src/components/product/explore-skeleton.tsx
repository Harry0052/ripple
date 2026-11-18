export function ExploreSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden>
      {["a", "b"].map((key) => (
        <div key={key} className="h-48 animate-pulse rounded-3xl border border-line bg-card" />
      ))}
    </div>
  );
}
