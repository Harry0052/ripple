import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RunForm } from "@/components/product/run-form";
import { getDb } from "@/lib/db/client";
import { getPublicWorkflow } from "@/lib/workflows/detail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preview and run" };

export default async function RunPreviewPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const detail = getPublicWorkflow(getDb(), slug);
  if (detail.status === "not-found") notFound();
  if (detail.status === "unreadable") {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="font-display text-5xl tracking-tight">This recipe cannot run</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {detail.title} uses a block Ripple does not run. Nothing started.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <Link href={`/w/${detail.slug}`} className="text-sm font-medium underline decoration-lime decoration-2 underline-offset-4">
        {detail.title}
      </Link>
      <h1 className="mt-3 font-display text-5xl tracking-tight">Preview and run</h1>
      <p className="mt-3 text-lg leading-8 text-muted">
        Version {detail.version}. Allow every step, then run. A second click uses the same submit key
        and does not start another run.
      </p>
      <div className="mt-6">
        <RunForm
          slug={detail.slug}
          title={detail.title}
          steps={detail.steps.map((step) => ({
            id: step.id,
            ordinal: step.ordinal,
            title: step.title,
            type: step.type,
            lines: step.lines,
            fields: step.type === "input" ? step.fields : undefined,
          }))}
        />
      </div>
    </main>
  );
}
