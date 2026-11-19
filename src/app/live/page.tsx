import { AlertTriangle, CheckCircle2, Droplet } from "lucide-react";
import Link from "next/link";
import { readDB } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { CAN_RECEIVE_FROM, eligibility, km } from "@/lib/blood";
import type { BloodRequest } from "@/lib/types";
import { getT } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

export default async function Donate() {
  const [db, me, t] = await Promise.all([readDB(), currentUser(), getT()]);
  const active = db.requests.filter((r) => r.status === "active");
  const closed = db.requests.filter((r) => r.status === "fulfilled").slice(0, 6);
  const group = me?.bloodGroup ?? null;
  const dist = (r: BloodRequest) => (me ? km(r.lat, r.lng, me.lat, me.lng) : null);
  const matches = group ? active.filter((r) => r.bloodGroup && CAN_RECEIVE_FROM[r.bloodGroup].includes(group)).sort((a, b) => (dist(a) ?? 0) - (dist(b) ?? 0)) : [];
  const others = active.filter((r) => !matches.includes(r));
  const e = me ? eligibility(me) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-5xl md:text-6xl"><Droplet className="inline h-[.8em] w-[.8em] text-rakt -mt-2" strokeWidth={2.5} /> {t("I want to donate")}</h1>
      <p className="text-muted mt-2 text-lg">{t("Pick a request, tap Yes, I'll go, and reach the hospital within 2 hours.")}</p>

      {!me && (
        <div className="mt-6 card p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p>{t("Sign in as a donor and we'll show only the requests your blood group can help, nearest first.")}</p>
          <Link href="/login?next=/live" className="btn btn-primary shrink-0">{t("Sign in")}</Link>
        </div>
      )}
      {me && !group && (
        <div className="mt-6 card p-5"><Link className="underline" href="/me">{t("Add your blood group on your account page to see which requests you can help.")}</Link></div>
      )}
      {e && group && !e.ok && (
        <div className="mt-6 rounded-2xl bg-[#f5c451]/10 border border-[#f5c451]/35 p-4">{t("You donated recently. For your safety you can donate again in")} <b>{e.daysLeft} {t("days")}</b>. {t("You can still share these requests.")}</div>
      )}

      {group && (
        <>
          <h2 className="font-display text-3xl mt-10"><CheckCircle2 className="inline h-[.8em] w-[.8em] text-pulse -mt-1" /> {t("You can help these")} ({matches.length})</h2>
          <p className="text-muted">{t("Your blood group")} <b>{group}</b> {t("matches. Nearest first.")}</p>
          <List t={t} items={matches} dist={dist} empty={t("No one needs your blood group right now. Thank you for checking!")} highlight />
        </>
      )}

      <h2 className="font-display text-3xl mt-10">{group ? `${t("Other requests")} (${others.length})` : `${t("People who need blood now")} (${active.length})`}</h2>
      {group && <p className="text-muted">{t("Your blood group doesn't match these, but you can share them.")}</p>}
      <List t={t} items={group ? others : active} dist={dist} empty={t("No one needs blood right now.")} />

      {closed.length > 0 && (
        <>
          <h2 className="font-display text-3xl mt-12">{t("Recently done")}</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {closed.map((r) => (
              <Link key={r.id} href={`/r/${r.id}`} className="rounded-2xl border border-line p-4 flex items-center justify-between bg-[#141414]">
                <span><b>{r.bloodGroup}</b> · {r.hospital}</span>
                <span className="chip bg-[#1c1c1c] text-white">{t("done")}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function List({ t, items, dist, empty, highlight }: { t: (s: string) => string; items: BloodRequest[]; dist: (r: BloodRequest) => number | null; empty: string; highlight?: boolean }) {
  if (items.length === 0) return <p className="text-muted mt-4">{empty}</p>;
  return (
    <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((r) => {
        const d = dist(r);
        const going = r.acceptances.filter((a) => a.status === "on_the_way").length;
        return (
          <Link key={r.id} href={`/r/${r.id}`} className={`card p-5 hover:shadow-xl transition flex flex-col ${highlight ? "ring-2 ring-pulse" : ""}`}>
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-rakt text-white flex items-center justify-center text-2xl font-bold">{r.bloodGroup ?? "?"}</div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.hospital ?? t("Hospital")}</p>
                <p className="text-sm text-muted truncate">{r.area ?? r.city}{d !== null ? ` · ${d.toFixed(1)} ${t("km from you")}` : ""}</p>
                <p className="text-sm mt-1">{t("Needs")} <b>{r.units - r.unitsArranged}</b> {t("more unit(s)")}{going ? ` · ${going} ${t("on the way")}` : ""}</p>
              </div>
            </div>
            {r.scamFlags.length > 0 && <p className="text-xs text-[#f5c451] mt-3"><AlertTriangle className="ic" /> {t("Call before you go")}</p>}
            <span className={`btn mt-4 text-sm ${highlight ? "btn-primary" : "btn-ghost"}`}>{highlight ? t("See details and say yes →") : t("See details →")}</span>
          </Link>
        );
      })}
    </div>
  );
}
