import Link from "next/link";
import { PrimaryNav } from "./primary-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-full">
          <span className="ripple-mark" aria-hidden />
          <span className="font-display text-[1.7rem] leading-none tracking-tight">Ripple</span>
        </Link>
        <PrimaryNav variant="desktop" />
      </div>
    </header>
  );
}
