import Link from "next/link";
import { notFound } from "next/navigation";
import { RunActions } from "@/components/product/run-actions";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getRun } from "@/lib/runs/service";
import { formatUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata = { title: "Run" };

function resultText(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return JSON.stringify(value, null, 2);
}

export default async function RunConsolePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const db = getDb();
  const user = await readSessionUser(db);
  const run = user ? getRun(db, id, user.id) : null;
  if (!run) notFound();
  const waiting = run.steps.find((step) => step.status === "needs_approval");

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <Link href="/runs" className="text-sm font-medium underline decoration-lime decoration-2 underline-offset-4">
        My Runs
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-5xl tracking-tight">{run.workflowTitle}</h1>
        {run.purpose === "dry_run" ? <Badge>Dry run</Badge> : null}
        <StatusPill status={run.status} />
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        Version {run.version} · Started {formatUtc(run.startedAt)}
        {run.completedAt ? ` · Finished ${formatUtc(run.completedAt)}` : ""}
        {run.cancelledAt ? ` · Stopped ${formatUtc(run.cancelledAt)}` : ""}
      </p>
      <div className="mt-4">
        <RunActions runId={run.id} status={run.status} waitingStepId={waiting?.stepId ?? null} />
      </div>
      <ol className="mt-6 space-y-3">
        {run.steps.map((step) => (
          <li key={step.id} className="rounded-3xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl tracking-tight">
                {step.ordinal}. {step.title}
              </h2>
              <StatusPill status={step.status} />
            </div>
            <p className="mt-1 text-sm text-muted">Attempt {step.attempt}</p>
            {step.error ? <p className="mt-3 text-sm text-danger">{step.error}</p> : null}
            {step.safeResult ? (
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6">
                {resultText(step.safeResult)}
              </pre>
            ) : null}
          </li>
        ))}
      </ol>
      <section className="mt-6">
        <h2 className="font-display text-3xl tracking-tight">Consent receipts</h2>
        <ul className="mt-3 space-y-2">
          {run.approvals.map((approval) => (
            <li key={`${approval.stepId}-${approval.decision}-${approval.createdAt}`} className="text-sm leading-6">
              <span className="font-medium">{approval.decision.replaceAll("_", " ")}</span>
              <span className="text-muted"> · {formatUtc(approval.createdAt)} · {approval.consentText}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
