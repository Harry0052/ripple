import Link from "next/link";
import { AccountForm } from "@/components/product/account-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-display text-5xl tracking-tight">Create account</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Email and a password. If you already ran a recipe as a guest in this browser, the account
        keeps those runs. No email is sent.
      </p>
      <AccountForm mode="signup" />
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline decoration-lime decoration-2 underline-offset-4">
          Log in
        </Link>
      </p>
    </main>
  );
}
