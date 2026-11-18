import Link from "next/link";
import { LogoutButton } from "@/components/product/logout-button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listRuns } from "@/lib/runs/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const runs = user ? listRuns(db, user.id) : [];
  const completed = runs.filter((run) => run.status === "succeeded").length;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <h1 className="font-display text-5xl tracking-tight">Profile</h1>
      {user ? (
        <section className="mt-6 rounded-3xl border border-line bg-card p-5">
          <h2 className="font-display text-3xl tracking-tight">{user.displayName}</h2>
          <p className="mt-2 text-base leading-7">
            @{user.handle} · {user.kind}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {user.kind === "guest"
              ? "This is a guest session in an httpOnly cookie. Create an account to publish, and this browser keeps these runs."
              : `Signed in as ${user.email ?? user.handle}. The password is stored as a hash.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.kind === "guest" ? (
              <Link href="/signup" className="inline-flex min-h-12 items-center rounded-full bg-lime px-5 font-medium">
                Create account
              </Link>
            ) : (
              <LogoutButton />
            )}
          </div>
          <p className="mt-4 text-sm">
            Verified completed runs in this session: <span className="tabular-nums font-medium">{completed}</span>
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-ink/20 bg-card p-5">
          <h2 className="font-display text-3xl tracking-tight">No session yet</h2>
          <p className="mt-2 text-base leading-7 text-muted">
            Ripple creates a guest session when you run a recipe. You can also{" "}
            <Link href="/login" className="underline decoration-lime decoration-2 underline-offset-4">
              log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="underline decoration-lime decoration-2 underline-offset-4">
              create an account
            </Link>
            .
          </p>
        </section>
      )}
      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl tracking-tight">Not connected</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
          <li>Password reset email is off. No mail provider is configured.</li>
          <li>OAuth and third-party accounts are off.</li>
          <li>Payments are off. Ripple does not move money.</li>
        </ul>
      </section>
    </main>
  );
}
