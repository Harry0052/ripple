"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function ReportForm({ workflowId }: { workflowId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workflowId,
          reason: String(form.get("reason") ?? ""),
          details: String(form.get("details") ?? ""),
        }),
      });
      const body = (await response.json()) as { message?: string; error?: { message?: string } };
      setMessage(body.message ?? body.error?.message ?? "The report was not stored.");
      setPending(false);
    } catch {
      setMessage("The network request failed. The report was not confirmed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-display text-2xl tracking-tight">Report</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Reports are stored on Ripple for review. There is no outside moderator connected.
      </p>
      <label className="mt-3 block text-sm font-medium" htmlFor="report-reason">
        Reason
        <select id="report-reason" name="reason" className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4" defaultValue="misleading">
          <option value="misleading">Misleading</option>
          <option value="unsafe">Unsafe</option>
          <option value="spam">Spam</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium" htmlFor="report-details">
        Details
        <textarea id="report-details" name="details" rows={3} maxLength={500} className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base" />
      </label>
      <Button type="submit" variant="secondary" className="mt-3" disabled={pending}>
        {pending ? "Sending…" : "Submit report"}
      </Button>
      {message ? (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
