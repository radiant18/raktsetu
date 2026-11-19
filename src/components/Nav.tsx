import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "./Logo";
import { LangSwitch } from "./Lang";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

const LINKS: [string, string][] = [
  ["/need", "I need blood"],
  ["/live", "I want to donate"],
];

export default async function Nav() {
  const [user, lang] = await Promise.all([currentUser(), getLang()]);
  const t = (s: string) => tr(lang, s);
  const today = new Date().toLocaleDateString(lang === "en" ? "en-IN" : `${lang}-IN`, { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-paper/85 border-b hair">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2"><Logo /><span className="wordmark text-base sm:text-xl hidden min-[360px]:inline">RaktSetu</span></Link>
        <p className="hidden lg:block text-xs text-muted">{today} · {t("Bengaluru")}</p>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden md:flex items-center gap-1 text-sm mr-2">
            {LINKS.map(([h, l]) => <Link key={h} href={h} className="px-3 py-2 rounded-2xl hover:bg-mist font-medium">{t(l)}</Link>)}
          </nav>
          <LangSwitch />
          {user ? (
            <Link href="/me" className="btn btn-ghost !py-2 !px-3 sm:!px-4 text-sm max-w-[110px] truncate">{user.name.split(" ")[0] || t("My account")}</Link>
          ) : (
            <Link href="/login" className="btn btn-dark !py-2 !px-3 sm:!px-4 text-sm whitespace-nowrap">{t("Sign in")}</Link>
          )}
        </div>
      </div>
      <nav className="md:hidden flex gap-2 px-4 pb-2 text-sm">
        {LINKS.map(([h, l]) => <Link key={h} href={h} className="flex-1 text-center px-2 py-2 rounded-2xl border border-ink font-medium text-[13px] leading-tight flex items-center justify-center">{t(l)}</Link>)}
      </nav>
    </header>
  );
}
