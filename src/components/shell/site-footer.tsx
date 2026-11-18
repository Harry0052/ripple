export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm leading-6 text-muted">
        <p id="not-built">
          Create is switched off. Ripple can run a recipe and keep the record in this browser.
          Publishing an account and editing a recipe are not available yet.
        </p>
        <p>Ripple does not sign in to other websites, move money, or send email.</p>
      </div>
    </footer>
  );
}
