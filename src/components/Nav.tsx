import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "./Logo";

export default async function Nav() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-paper/80 border-b border-line">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2"><Logo /><span className="font-semibold text-lg tracking-tight">RaktSetu</span></Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <Link href="/#check" className="hover:text-ink">Check a forward</Link>
          <Link href="/voice" className="hover:text-ink">Request by voice</Link>
          <Link href="/live" className="hover:text-ink">Live requests</Link>
          <Link href="/impact" className="hover:text-ink">Impact</Link>
        </nav>
        {user ? (
          <Link href="/me" className="btn btn-ghost !py-2 !px-4 text-sm">{user.name.split(" ")[0]} · {user.bloodGroup ?? user.role}</Link>
        ) : (
          <Link href="/login" className="btn btn-dark !py-2 !px-4 text-sm">Sign in</Link>
        )}
      </div>
    </header>
  );
}
