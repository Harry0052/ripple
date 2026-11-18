"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareLink({ url }: { url: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-display text-2xl tracking-tight">Share</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        This public link opens the recipe. It does not include anyone’s run, inputs, or outputs.
      </p>
      <label className="mt-3 block text-sm font-medium" htmlFor="public-link">
        Public link
        <input id="public-link" readOnly value={url} className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4 text-sm" />
      </label>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Copied the public link.");
          } catch {
            setMessage("Clipboard is unavailable. Select the link and copy it yourself.");
          }
        }}
      >
        Copy link
      </Button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
