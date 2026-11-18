import Link from "next/link";
import { ReportForm } from "@/components/product/report-form";
import { ShareLink } from "@/components/product/share-link";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/categories";
import type { WorkflowRead } from "@/lib/workflows/detail";

export function WorkflowDetail({
  detail,
  publicUrl,
}: {
  detail: Exclude<WorkflowRead, { status: "not-found" }>;
  publicUrl?: string;
}) {
  if (detail.status === "unreadable") {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm font-medium text-ink underline decoration-lime decoration-2 underline-offset-4">
          Explore
        </Link>
        <h1 className="mt-4 font-display text-5xl tracking-tight">This recipe cannot be shown</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {detail.title} is stored, but its steps do not match a block Ripple understands. Nothing
          will run.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:pt-10">
      <Link href="/" className="text-sm font-medium text-ink underline decoration-lime decoration-2 underline-offset-4">
        Explore
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {detail.origin === "demo_seed" ? <Badge>Demo</Badge> : null}
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {categoryLabel(detail.category)}
        </span>
      </div>
      <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
        {detail.title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{detail.summary}</p>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
        <div>{detail.estimatedMinutes} min</div>
        <div>
          {detail.creatorName} <span className="text-muted">@{detail.creatorHandle}</span>
        </div>
        <div>Version {detail.version}</div>
        <div>{detail.publishedLabel ? `Published ${detail.publishedLabel}` : "Unpublished"}</div>
        <div>{detail.verified}</div>
      </dl>

      <section className="mt-6 rounded-3xl border border-line bg-card p-5" aria-labelledby="run-heading">
        <h2 id="run-heading" className="font-display text-3xl tracking-tight">
          Preview and run
        </h2>
        <p className="mt-2 max-w-xl text-base leading-7 text-muted">
          Nothing starts on this page. Next you enter the values and allow every step.
        </p>
        <Link
          href={`/w/${detail.slug}/run`}
          className="mt-4 inline-flex min-h-12 items-center rounded-full bg-lime px-5 font-medium text-ink"
        >
          Preview and run
        </Link>
      </section>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.8fr)]">
        <section className="order-2 md:order-1" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="font-display text-3xl tracking-tight">
            Steps
          </h2>
          <ol className="mt-4 space-y-3">
            {detail.steps.map((step) => (
              <li key={step.id} className="rounded-3xl border border-line bg-card p-5">
                <p className="text-sm tabular-nums text-muted">Step {step.ordinal}</p>
                <h3 className="mt-1 font-display text-2xl tracking-tight">{step.title}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  {step.type.replaceAll("_", " ")}
                </p>
                <ul className="mt-3 space-y-1 text-sm leading-6">
                  {step.lines.map((line) => (
                    <li key={line} className="break-words font-mono text-[0.92rem] leading-6">
                      {line}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <aside className="order-1 space-y-4 md:order-2">
          <InfoBlock title="Permissions" items={detail.permissions} />
          <InfoBlock title="Before you start" body={detail.prerequisites} />
          <InfoBlock title="Done looks like" body={detail.successCriteria} />
          <InfoBlock title="Risks" body={detail.risks} />
          <p className="text-sm leading-6 text-muted">
            Source:{" "}
            {detail.origin === "demo_seed"
              ? "Demo content shipped with Ripple. It is not a live third-party service."
              : `${detail.creatorName} (@${detail.creatorHandle}).`}
          </p>
          {detail.visibility === "public" && publicUrl ? <ShareLink url={publicUrl} /> : null}
          {detail.visibility === "public" ? <ReportForm workflowId={detail.id} /> : (
            <p className="text-sm leading-6 text-muted">This recipe is private. There is no public link.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function InfoBlock({ title, body, items }: { title: string; body?: string; items?: string[] }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      {body ? <p className="mt-2 text-sm leading-6 text-ink">{body}</p> : null}
      {items ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
