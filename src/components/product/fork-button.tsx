"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ForkButton({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const response = await fetch(`/api/workflows/${workflowId}/draft`, { method: "POST" });
          const body = (await response.json()) as { error?: { message?: string }; version?: number };
          setPending(false);
          if (!response.ok) {
            setMessage(body.error?.message ?? "The next version was not created.");
            return;
          }
          setMessage(`Editing version ${body.version}.`);
          router.refresh();
        }}
      >
        Start next version
      </Button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
