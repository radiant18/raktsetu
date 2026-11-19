import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "./Logo";

const LINKS: [string, string][] = [
  ["/need", "I need blood"],
  ["/live", "I want to donate"],
];

export default async function Nav() {
  const user = await currentUser();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-paper/85 border-b hair">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2"><Logo /><span className="wordmark text-xl">RaktSetu</span></Link>
        <p className="hidden lg:block text-xs text-muted">{today} · Bengaluru</p>
        <div className="flex items-center gap-1">
          <nav className="hidden md:flex items-center gap-1 text-sm mr-2">
            {LINKS.map(([h, l]) => <Link key={h} href={h} className="px-3 py-2 rounded-2xl hover:bg-mist font-medium">{l}</Link>)}
          </nav>
          {user ? (
            <Link href="/me" className="btn btn-ghost !py-2 !px-4 text-sm">{user.name.split(" ")[0] || "My account"}</Link>
          ) : (
            <Link href="/login" className="btn btn-dark !py-2 !px-4 text-sm">Sign in</Link>
          )}
        </div>
      </div>
      <nav className="md:hidden flex gap-2 px-4 pb-2 text-sm">
        {LINKS.map(([h, l]) => <Link key={h} href={h} className="flex-1 text-center px-3 py-2 rounded-2xl border border-ink font-medium">{l}</Link>)}
      </nav>
    </header>
  );
}
