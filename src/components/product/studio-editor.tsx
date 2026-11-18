"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { blankStep, type DraftInput } from "@/lib/workflows/draft";
import type { WorkflowStep } from "@/lib/workflows/steps";

type EditorDraft = DraftInput & { id: string; version: number; readyToPublish: boolean };

export function StudioEditor({ workflowId, initial }: { workflowId: string; initial: EditorDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [ready, setReady] = useState(initial.readyToPublish);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function edit(next: DraftInput) {
    setDraft({ ...draft, ...next });
    setReady(false);
  }

  async function save() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        summary: draft.summary,
        category: draft.category,
        estimatedMinutes: draft.estimatedMinutes,
        visibility: draft.visibility,
        sampleInputs: draft.sampleInputs,
        steps: draft.steps,
      }),
    });
    const body = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "The draft was not saved.");
      return false;
    }
    setMessage("Draft saved.");
    return true;
  }

  async function dryRun() {
    if (pending) return;
    const saved = await save();
    if (!saved) return;
    setPending(true);
    const response = await fetch(`/api/workflows/${workflowId}/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    const body = (await response.json()) as {
      error?: { message?: string };
      run?: { status: string; steps: Array<{ title: string; safeResult: unknown; error: string | null }> };
    };
    setPending(false);
    if (!response.ok || body.run?.status !== "succeeded") {
      const failed = body.run?.steps.find((step) => step.error);
      setMessage(failed?.error ?? body.error?.message ?? "The dry run did not succeed.");
      setReady(false);
      return;
    }
    const written = body.run.steps.find((step) => step.title === "Write it")?.safeResult as { message?: string } | undefined;
    setMessage(written?.message ? `Dry run succeeded: ${written.message}` : "Dry run succeeded.");
    setReady(true);
    router.refresh();
  }

  async function publish() {
    if (pending || !ready) return;
    setPending(true);
    const response = await fetch(`/api/workflows/${workflowId}/publish`, { method: "POST" });
    const body = (await response.json()) as { error?: { message?: string }; version?: number };
    setPending(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "Publish did not happen.");
      return;
    }
    setMessage(`Published version ${body.version}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Editing version {draft.version}. Nothing is public until you publish.</p>
      <label className="block text-sm font-medium">
        Title
        <input
          value={draft.title}
          onChange={(event) => edit({ ...draft, title: event.target.value })}
          className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4 text-base"
        />
      </label>
      <label className="block text-sm font-medium">
        Summary
        <textarea
          value={draft.summary}
          onChange={(event) => edit({ ...draft, summary: event.target.value })}
          rows={3}
          className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Category
          <select
            value={draft.category}
            onChange={(event) => edit({ ...draft, category: event.target.value as DraftInput["category"] })}
            className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4"
          >
            <option value="everyday-math">Everyday math</option>
            <option value="text-tools">Text tools</option>
            <option value="demo-forms">Saved notes</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Minutes
          <input
            value={draft.estimatedMinutes}
            inputMode="numeric"
            onChange={(event) => edit({ ...draft, estimatedMinutes: Number(event.target.value) || 1 })}
            className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4"
          />
        </label>
        <label className="text-sm font-medium">
          Visibility
          <select
            aria-label="Visibility"
            value={draft.visibility}
            onChange={(event) => edit({ ...draft, visibility: event.target.value as DraftInput["visibility"] })}
            className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>
      {draft.steps.map((step, index) => (
        <fieldset key={`${step.type}-${index}`} className="rounded-3xl border border-line bg-card p-5">
          <legend className="px-1 text-sm text-muted">Step {index + 1}</legend>
          <label className="block text-sm font-medium">
            Step title
            <input
              value={step.title}
              onChange={(event) => {
                const steps = draft.steps.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: event.target.value } : item,
                );
                edit({ ...draft, steps });
              }}
              className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Block
            <select
              aria-label={`Block ${index + 1}`}
              value={step.type}
              onChange={(event) => {
                const steps = draft.steps.map((item, itemIndex) =>
                  itemIndex === index ? blankStep(event.target.value as WorkflowStep["type"]) : item,
                );
                edit({ ...draft, steps });
              }}
              className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4"
            >
              <option value="input">Input</option>
              <option value="calculate">Calculate</option>
              <option value="transform">Transform</option>
              <option value="demo_form">Save on Ripple</option>
            </select>
          </label>
          <StepFields
            step={step}
            onChange={(next) => {
              const steps = draft.steps.map((item, itemIndex) => (itemIndex === index ? next : item));
              edit({ ...draft, steps });
            }}
          />
          {draft.steps.length > 1 ? (
            <button
              type="button"
              className="mt-3 text-sm text-danger"
              onClick={() => edit({ ...draft, steps: draft.steps.filter((_, itemIndex) => itemIndex !== index) })}
            >
              Remove step
            </button>
          ) : null}
        </fieldset>
      ))}
      <Button type="button" variant="secondary" onClick={() => edit({ ...draft, steps: [...draft.steps, blankStep("transform")] })}>
        Add step
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(draft.sampleInputs).map(([key, value]) => (
          <label key={key} className="text-sm font-medium">
            Sample {key}
            <input
              value={value}
              onChange={(event) => edit({ ...draft, sampleInputs: { ...draft.sampleInputs, [key]: event.target.value } })}
              className="mt-1 h-12 w-full rounded-full border border-line bg-card px-4"
            />
          </label>
        ))}
      </div>
      {message ? (
        <p role="status" className="rounded-2xl bg-card px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void save()}>
          Save draft
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void dryRun()}>
          Dry-run sample
        </Button>
        <Button type="button" disabled={pending || !ready} onClick={() => void publish()}>
          Publish
        </Button>
      </div>
    </div>
  );
}

function StepFields({ step, onChange }: { step: WorkflowStep; onChange: (step: WorkflowStep) => void }) {
  if (step.type === "calculate") {
    return (
      <label className="mt-3 block text-sm font-medium">
        Expression
        <input
          value={step.expression}
          onChange={(event) => onChange({ ...step, expression: event.target.value })}
          className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4 font-mono"
        />
      </label>
    );
  }
  if (step.type === "transform") {
    return (
      <label className="mt-3 block text-sm font-medium">
        Template
        <input
          value={step.template ?? ""}
          onChange={(event) => onChange({ ...step, template: event.target.value })}
          className="mt-1 h-12 w-full rounded-full border border-line bg-paper px-4 font-mono"
        />
      </label>
    );
  }
  if (step.type === "demo_form") {
    return (
      <p className="mt-3 text-sm leading-6 text-muted">
        Saves {step.includeKeys.join(", ")} on Ripple after a separate approval. Nothing is emailed.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-1 text-sm text-muted">
      {step.fields.map((field) => (
        <li key={field.key}>
          {field.label} ({field.key}) · {field.type}
          {field.required ? " · required" : ""}
        </li>
      ))}
    </ul>
  );
}
