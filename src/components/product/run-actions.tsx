"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RunActions({
  runId,
  status,
  waitingStepId,
}: {
  runId: string;
  status: string;
  waitingStepId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function post(url: string, body?: unknown) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That did not work.");
        setPending(false);
        return;
      }
      setPending(false);
      router.refresh();
    } catch {
      setMessage("The network request failed. The run was not confirmed changed.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "needs_approval" && waitingStepId ? (
        <Button type="button" disabled={pending} onClick={() => post(`/api/runs/${runId}/approvals`, { stepId: waitingStepId })}>
          Save on Ripple
        </Button>
      ) : null}
      {status === "needs_approval" || status === "running" || status === "pending" ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => post(`/api/runs/${runId}/cancel`)}>
          Stop
        </Button>
      ) : null}
      {status === "failed" ? (
        <Button type="button" disabled={pending} onClick={() => post(`/api/runs/${runId}/retry`)}>
          Retry failed step
        </Button>
      ) : null}
      {message ? (
        <p role="alert" className="basis-full text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
