export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm leading-6 text-muted">
        <p id="not-built">
          Accounts use an email and a password stored as a hash. OAuth, payments, and outbound
          email are not connected.
        </p>
        <p>Ripple does not sign in to other websites, move money, or send email.</p>
      </div>
    </footer>
  );
}
