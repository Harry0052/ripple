import Link from "next/link";
import { notFound } from "next/navigation";
import { ForkButton } from "@/components/product/fork-button";
import { StudioEditor } from "@/components/product/studio-editor";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getOwnedWorkflow } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export const metadata = { title: "Studio" };

export default async function StudioPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) notFound();
  const workflow = getOwnedWorkflow(db, id, user.id);
  if (!workflow) notFound();

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/create" className="text-sm font-medium underline decoration-lime decoration-2 underline-offset-4">
        Create
      </Link>
      <h1 className="mt-3 font-display text-5xl tracking-tight">{workflow.title}</h1>
      {workflow.publishedVersion ? (
        <p className="mt-3 text-sm text-muted">
          Published version {workflow.publishedVersion} ·{" "}
          <Link href={`/w/${workflow.slug}`} className="underline decoration-lime decoration-2 underline-offset-4">
            Open recipe
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Not published yet.</p>
      )}
      <div className="mt-6">
        {workflow.draft ? (
          <StudioEditor key={`${workflow.draft.id}-${workflow.draft.readyToPublish}`} workflowId={workflow.id} initial={workflow.draft} />
        ) : (
          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-display text-3xl">This version is published</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Version {workflow.publishedVersion} is frozen. Start the next version to change the
              recipe. Older runs keep the version they used.
            </p>
            <div className="mt-4">
              <ForkButton workflowId={workflow.id} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
