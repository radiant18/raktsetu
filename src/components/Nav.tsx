import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "./Logo";

const LINKS: [string, string][] = [
  ["/#check", "📸 Check a message"],
  ["/need", "🏥 I need blood"],
  ["/live", "🩸 I want to donate"],
];

export default async function Nav() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-paper/85 border-b border-line">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2"><Logo /><span className="font-semibold text-lg tracking-tight">RaktSetu</span></Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map(([h, l]) => <Link key={h} href={h} className="px-3 py-2 rounded-full hover:bg-mist font-medium">{l}</Link>)}
        </nav>
        {user ? (
          <Link href="/me" className="btn btn-ghost !py-2 !px-4 text-sm">👤 {user.name.split(" ")[0] || "My account"}</Link>
        ) : (
          <Link href="/login" className="btn btn-dark !py-2 !px-4 text-sm">Sign in</Link>
        )}
      </div>
      {/* phones: same three choices, always visible */}
      <nav className="md:hidden flex gap-1 overflow-x-auto px-3 pb-2 text-sm">
        {LINKS.map(([h, l]) => <Link key={h} href={h} className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-line font-medium">{l}</Link>)}
      </nav>
    </header>
  );
}
