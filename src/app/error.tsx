"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-danger">Something failed</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">This screen did not load</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        Ripple hit an error while rendering. Your data was not changed by this message.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-sm text-muted">Reference {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 inline-flex min-h-12 w-fit items-center rounded-full bg-lime px-5 font-medium text-ink"
      >
        Try again
      </button>
    </main>
  );
}
