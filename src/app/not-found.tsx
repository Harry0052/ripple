import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">That page is not in Ripple</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        The address does not match a screen Ripple serves. Nothing was invented to fill it.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 w-fit items-center rounded-full bg-lime px-5 font-medium text-ink"
      >
        Back to Explore
      </Link>
    </main>
  );
}
