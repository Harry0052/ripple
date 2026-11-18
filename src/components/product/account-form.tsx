"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function AccountForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "signup"
        ? {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            handle: String(form.get("handle") ?? ""),
            displayName: String(form.get("displayName") ?? ""),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };
    try {
      const response = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: { message?: string; fields?: Record<string, string> } };
      if (!response.ok) {
        setMessage(body.error?.message ?? "That did not work.");
        setFields(body.error?.fields ?? {});
        setPending(false);
        return;
      }
      router.push("/create");
      router.refresh();
    } catch {
      setMessage("The network request failed. The account was not confirmed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" error={fields.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        error={fields.password}
      />
      {mode === "signup" ? (
        <>
          <Field label="Handle" name="handle" autoComplete="username" error={fields.handle} />
          <Field label="Display name" name="displayName" autoComplete="name" error={fields.displayName} />
        </>
      ) : null}
      {message ? (
        <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "signup" ? "Create account" : "Log in"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  const id = `account-${name}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4 text-base"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
