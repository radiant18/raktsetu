import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readDB } from "@/lib/db";
import { eligibility, trustLabel, DONATION_GAP_DAYS } from "@/lib/blood";
import Passport from "./Passport";
import WhatsAppCard from "@/components/WhatsAppCard";
import Logout from "./Logout";

export const dynamic = "force-dynamic";

export default async function Me() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/me");
  if (!u.name) redirect("/login");
  const db = await readDB();
  const mine = db.requests.filter((r) => r.createdBy === u.id);
  const promises = db.requests.filter((r) => r.acceptances.some((a) => a.donorId === u.id));
  const e = eligibility(u);
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-muted">{u.role === "donor" ? "🩸 Donor" : "🏥 Family"} · phone verified ✓</p>
          <h1 className="font-display text-5xl">{u.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.role === "donor" ? <Link href="/live" className="btn btn-primary">🩸 See who needs blood</Link> : <Link href="/need" className="btn btn-primary">🏥 Ask for blood</Link>}
          <Logout />
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <div className="card p-6 bg-rakt text-white border-0">
          <p className="text-xs uppercase tracking-widest opacity-80">My blood group</p>
          <p className="text-6xl font-bold mt-2">{u.bloodGroup ?? "—"}</p>
          <p className="mt-2 text-sm opacity-90">{u.passportVerified ? "✓ Confirmed with donation certificate" : u.role === "donor" ? "Upload a certificate below to confirm" : ""}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest text-muted">Trust score (out of 100)</p>
          <p className="text-6xl font-bold mt-2">{u.trust}</p>
          <p className="text-sm text-muted mt-2">{trustLabel(u.trust)} · donated {u.donations}× · missed {u.noShows}×{u.blocked ? " · blocked for missing too often" : ""}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest text-muted">I can donate</p>
          <p className="text-5xl font-bold mt-2">{e.ok ? "Today ✓" : `in ${e.daysLeft} days`}</p>
          <p className="text-sm text-muted mt-2">{u.lastDonation ? `Last donated ${new Date(u.lastDonation).toLocaleDateString("en-IN")}` : "No donation on record"} · doctors advise a {DONATION_GAP_DAYS}-day gap</p>
          {!e.ok && <div className="mt-3 h-2 rounded-full bg-mist overflow-hidden"><div className="h-full bg-pulse" style={{ width: `${100 - (e.daysLeft / DONATION_GAP_DAYS) * 100}%` }} /></div>}
        </div>
      </div>

      {u.role === "donor" && <Passport />}
      <div className="mt-6"><WhatsAppCard phone={u.contact.startsWith("+") ? u.contact : null} /></div>

      <section className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold">Blood I asked for</h2>
          {mine.length === 0 ? <p className="text-sm text-muted mt-2">Nothing yet. <Link className="underline" href="/need">Ask for blood</Link>.</p> : (
            <ul className="mt-3 space-y-2">{mine.map((r) => <li key={r.id}><Link className="flex justify-between rounded-xl border border-line p-3 hover:bg-mist" href={`/r/${r.id}`}><span><b>{r.bloodGroup}</b> · {r.hospital}</span><span className="text-sm text-muted">{r.status === "active" ? "still needed" : r.status === "fulfilled" ? "done ✅" : r.status}</span></Link></li>)}</ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Requests I said yes to</h2>
          {promises.length === 0 ? <p className="text-sm text-muted mt-2">None yet. <Link className="underline" href="/live">See who needs blood</Link>.</p> : (
            <ul className="mt-3 space-y-2">{promises.map((r) => { const a = r.acceptances.find((x) => x.donorId === u.id)!; return <li key={r.id}><Link className="flex justify-between rounded-xl border border-line p-3 hover:bg-mist" href={`/r/${r.id}`}><span><b>{r.bloodGroup}</b> · {r.hospital}</span><span className="text-sm text-muted">{a.status === "on_the_way" ? "going" : a.status === "arrived" ? "donated ✅" : a.status === "no_show" ? "missed" : "cancelled"}</span></Link></li>; })}</ul>
          )}
        </div>
      </section>
    </main>
  );
}
