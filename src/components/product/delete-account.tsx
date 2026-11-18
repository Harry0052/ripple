"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 rounded-3xl border border-danger/30 bg-card p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirm || pending) return;
        setPending(true);
        const response = await fetch("/api/account/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        });
        const body = (await response.json()) as { error?: { message?: string } };
        if (!response.ok) {
          setMessage(body.error?.message ?? "The data was not deleted.");
          setPending(false);
          return;
        }
        router.push("/");
        router.refresh();
      }}
    >
      <h2 className="font-display text-2xl tracking-tight">Delete this session’s data</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Runs, reports, and the password hash in this session are removed. Recipes you published are
        withdrawn from Explore. Other people’s runs of those recipes stay, titled “Deleted recipe”.
      </p>
      <label className="mt-3 flex min-h-12 items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-5"
          checked={confirm}
          onChange={(event) => setConfirm(event.target.checked)}
        />
        <span>I understand this session’s runs will be removed.</span>
      </label>
      <Button type="submit" variant="secondary" className="mt-3" disabled={!confirm || pending}>
        {pending ? "Deleting…" : "Delete my Ripple data"}
      </Button>
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </form>
  );
}
