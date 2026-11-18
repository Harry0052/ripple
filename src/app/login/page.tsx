import Link from "next/link";
import { AccountForm } from "@/components/product/account-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-display text-5xl tracking-tight">Log in</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Logging in does not merge a guest session from this browser. Signup does, when you are still
        that guest.
      </p>
      <AccountForm mode="login" />
      <p className="mt-4 text-sm">
        Need an account?{" "}
        <Link href="/signup" className="underline decoration-lime decoration-2 underline-offset-4">
          Create one
        </Link>
      </p>
    </main>
  );
}
