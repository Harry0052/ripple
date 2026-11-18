"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#FAFAF7",
          color: "#111318",
          fontFamily: "Georgia, serif",
          padding: "2.5rem 1.25rem",
        }}
      >
        <main>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 520, letterSpacing: "-0.03em" }}>
            Ripple failed to load
          </h1>
          <p style={{ maxWidth: "36rem", fontSize: "1.125rem", lineHeight: 1.6 }}>
            The app shell crashed. Retry the page. If it keeps failing, the local server log has the
            error.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              background: "#C8F36A",
              color: "#111318",
              border: 0,
              borderRadius: "999px",
              minHeight: "3rem",
              padding: "0 1.25rem",
              font: "inherit",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
