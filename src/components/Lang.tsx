"use client";
import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGS, tr, type Lang } from "@/lib/i18n";

const Ctx = createContext<Lang>("en");
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export function useLang() { return useContext(Ctx); }
export function useT() { const l = useContext(Ctx); return (s: string) => tr(l, s); }

// Pill switch in the top bar: EN · हिं · ಕ
export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState<Lang | null>(null);
  function pick(l: Lang) {
    if (l === lang) return;
    setBusy(l);
    document.cookie = `rs_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    router.refresh();
    setTimeout(() => setBusy(null), 900);
  }
  return (
    <div role="radiogroup" aria-label="Language" className="flex items-center rounded-full border border-line bg-[var(--surface)] p-0.5 text-xs">
      {LANGS.map((x) => (
        <button key={x.code} role="radio" aria-checked={lang === x.code} title={x.name} onClick={() => pick(x.code)}
          className={`min-w-8 sm:min-w-9 h-8 px-2 sm:px-2.5 rounded-full font-semibold transition ${lang === x.code ? "bg-rakt text-white" : "text-muted hover:text-ink"} ${busy === x.code ? "animate-pulse" : ""}`}>
          {x.short}
        </button>
      ))}
    </div>
  );
}
