import Link from "next/link";
import { NewDraftButton } from "@/components/product/new-draft-button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listOwnedWorkflows } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create" };

export default async function CreatePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user || user.kind !== "member") {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="font-display text-5xl tracking-tight">Create</h1>
        <p className="mt-3 max-w-xl text-lg leading-8 text-muted">
          Publishing needs an account. A guest session can run public recipes, and signup keeps that
          session’s runs.
        </p>
        <Link href="/signup" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-lime px-5 font-medium">
          Create account
        </Link>
      </main>
    );
  }
  const mine = listOwnedWorkflows(db, user.id);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-tight">Create</h1>
        <NewDraftButton />
      </div>
      <p className="mt-3 max-w-xl text-base leading-7 text-muted">
        Drafts stay private until a dry run succeeds and you publish. Published versions do not
        change afterward.
      </p>
      {mine.length === 0 ? (
        <p className="mt-8 text-muted">You have not saved a recipe yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {mine.map((workflow) => (
            <li key={workflow.id}>
              <Link href={`/studio/${workflow.id}`} className="block rounded-3xl border border-line bg-card p-5">
                <h2 className="font-display text-2xl">{workflow.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {workflow.visibility} · {workflow.draftVersionId ? "draft open" : "no open draft"} ·{" "}
                  {workflow.publishedVersionId ? "published" : "not published"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
