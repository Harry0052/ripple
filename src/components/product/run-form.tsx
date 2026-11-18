"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { InputField } from "@/lib/workflows/steps";

type RunStep = {
  id: string;
  ordinal: number;
  title: string;
  type: string;
  lines: string[];
  fields?: InputField[];
};

export function RunForm({
  slug,
  title,
  steps,
  permissions,
}: {
  slug: string;
  title: string;
  steps: RunStep[];
  permissions: string[];
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const inputs: Record<string, string> = {};
    for (const step of steps) {
      for (const field of step.fields ?? []) {
        inputs[field.key] = String(form.get(field.key) ?? "");
      }
    }
    const consents = steps.filter((step) => form.get(`consent-${step.id}`) === "on").map((step) => step.id);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, inputs, consents, idempotencyKey }),
      });
      const body = (await response.json()) as {
        run?: { id: string };
        error?: { message?: string; fields?: Record<string, string> };
      };
      if (!response.ok || !body.run) {
        setMessage(body.error?.message ?? "The run did not start.");
        setFieldErrors(body.error?.fields ?? {});
        setPending(false);
        return;
      }
      router.push(`/runs/${body.run.id}`);
      router.refresh();
    } catch {
      setMessage("The network request failed. Nothing was confirmed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">Nothing has started. Ripple waits until you submit this form.</p>
      {steps.map((step) => (
        <fieldset key={step.id} className="rounded-3xl border border-line bg-card p-5">
          <legend className="px-1 text-sm tabular-nums text-muted">Step {step.ordinal}</legend>
          <h2 className="font-display text-2xl tracking-tight">{step.title}</h2>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-muted">
            {step.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-4 space-y-3">
            {(step.fields ?? []).map((field) => {
              const error = fieldErrors[field.key];
              const inputId = `field-${field.key}`;
              return (
                <div key={field.key}>
                  <label htmlFor={inputId} className="text-sm font-medium">
                    {field.label}
                  </label>
                  {field.type === "text" && (field.maxLength ?? 0) > 120 ? (
                    <textarea
                      id={inputId}
                      name={field.key}
                      rows={4}
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${inputId}-error` : field.help ? `${inputId}-help` : undefined}
                      className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base"
                    />
                  ) : (
                    <input
                      id={inputId}
                      name={field.key}
                      type={field.type === "number" ? "text" : "text"}
                      inputMode={field.type === "number" ? "decimal" : "text"}
                      maxLength={field.maxLength ?? 40}
                      placeholder={field.placeholder}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${inputId}-error` : field.help ? `${inputId}-help` : undefined}
                      className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4 text-base"
                    />
                  )}
                  {field.help ? (
                    <p id={`${inputId}-help`} className="mt-1 text-sm text-muted">
                      {field.help}
                    </p>
                  ) : null}
                  {error ? (
                    <p id={`${inputId}-error`} className="mt-1 text-sm text-danger" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <label className="mt-4 flex min-h-12 items-start gap-3 text-sm leading-6">
            <input
              name={`consent-${step.id}`}
              type="checkbox"
              className="mt-1 size-5 accent-ink"
            />
            <span>I allow “{step.title}” before Ripple runs it.</span>
          </label>
        </fieldset>
      ))}
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl tracking-tight">You are allowing Ripple to</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {permissions.map((permission) => (
            <li key={permission}>{permission}</li>
          ))}
        </ul>
      </section>
      {message ? (
        <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {message}
        </p>
      ) : null}
      {fieldErrors._form ? (
        <p role="alert" className="text-sm text-danger">
          {fieldErrors._form}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Running…" : `Run ${title}`}
      </Button>
    </form>
  );
}
