"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NewDraftButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          const response = await fetch("/api/workflows", { method: "POST" });
          const body = (await response.json()) as { id?: string; error?: { message?: string } };
          if (!response.ok || !body.id) {
            setMessage(body.error?.message ?? "The draft was not created.");
            setPending(false);
            return;
          }
          router.push(`/studio/${body.id}`);
        }}
      >
        New recipe
      </Button>
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </div>
  );
}
