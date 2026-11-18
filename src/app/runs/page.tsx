import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listRuns } from "@/lib/runs/service";
import { formatUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Runs" };

export default async function RunsPage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const runs = user ? listRuns(db, user.id) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <h1 className="font-display text-5xl tracking-tight">My Runs</h1>
      <p className="mt-3 max-w-xl text-lg leading-8 text-muted">
        This list is private to the session in this browser. Another person cannot open these
        records.
      </p>
      {runs.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-ink/20 bg-card px-5 py-8">
          <h2 className="font-display text-3xl tracking-tight">No runs yet</h2>
          <p className="mt-2 text-base leading-7 text-muted">
            {user
              ? "You have a session, and it has no runs. Start from a recipe when you are ready."
              : "Starting a run creates a guest session and stores the result here."}
          </p>
          <Link href="/" className="mt-4 inline-flex min-h-12 items-center font-medium underline decoration-lime decoration-2 underline-offset-4">
            Browse recipes
          </Link>
        </section>
      ) : (
        <ul className="mt-8 space-y-3">
          {runs.map((run) => (
            <li key={run.id}>
              <Link href={`/runs/${run.id}`} className="block rounded-3xl border border-line bg-card p-5 hover:border-ink">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl tracking-tight">{run.workflowTitle}</h2>
                  <StatusPill status={run.status} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  Started {formatUtc(run.startedAt)}
                  {run.completedAt ? ` · Finished ${formatUtc(run.completedAt)}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
