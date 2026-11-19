import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readDB } from "@/lib/db";
import { eligibility, trustLabel, DONATION_GAP_DAYS } from "@/lib/blood";
import Passport from "./Passport";
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
          <p className="text-xs uppercase tracking-[.2em] text-muted">{u.role === "donor" ? "Donor" : "Family"} · verified {u.contact.includes("@") ? "email" : "mobile"}</p>
          <h1 className="font-display text-5xl">{u.name}</h1>
        </div>
        <Logout />
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <div className="card p-6 bg-rakt text-white border-0">
          <p className="text-xs uppercase tracking-widest opacity-80">Donor passport</p>
          <p className="text-6xl font-bold mt-2">{u.bloodGroup ?? "—"}</p>
          <p className="mt-2 text-sm opacity-90">{u.passportVerified ? "✓ Verified with donation record" : "Not verified yet"}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest text-muted">Trust score</p>
          <p className="text-6xl font-bold mt-2">{u.trust}</p>
          <p className="text-sm text-muted mt-2">{trustLabel(u.trust)} · {u.donations} donations · {u.noShows} no-shows{u.blocked ? " · restricted" : ""}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest text-muted">Next donation</p>
          <p className="text-5xl font-bold mt-2">{e.ok ? "Today" : `${e.daysLeft}d`}</p>
          <p className="text-sm text-muted mt-2">{u.lastDonation ? `Last donated ${new Date(u.lastDonation).toLocaleDateString("en-IN")}` : "No donation on record"} · {DONATION_GAP_DAYS}-day safe gap</p>
          {!e.ok && <div className="mt-3 h-2 rounded-full bg-mist overflow-hidden"><div className="h-full bg-pulse" style={{ width: `${100 - (e.daysLeft / DONATION_GAP_DAYS) * 100}%` }} /></div>}
        </div>
      </div>

      {u.role === "donor" && <Passport />}

      <section className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold">My requests</h2>
          {mine.length === 0 ? <p className="text-sm text-muted mt-2">None yet. <Link className="underline" href="/voice">Request blood by voice</Link> or upload a screenshot on the home page.</p> : (
            <ul className="mt-3 space-y-2">{mine.map((r) => <li key={r.id}><Link className="flex justify-between rounded-xl border border-line p-3 hover:bg-mist" href={`/r/${r.id}`}><span><b>{r.bloodGroup}</b> · {r.hospital}</span><span className="text-sm text-muted">{r.status}</span></Link></li>)}</ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">My promises</h2>
          {promises.length === 0 ? <p className="text-sm text-muted mt-2">You haven&apos;t accepted any request yet. <Link className="underline" href="/live">See live requests</Link>.</p> : (
            <ul className="mt-3 space-y-2">{promises.map((r) => { const a = r.acceptances.find((x) => x.donorId === u.id)!; return <li key={r.id}><Link className="flex justify-between rounded-xl border border-line p-3 hover:bg-mist" href={`/r/${r.id}`}><span><b>{r.bloodGroup}</b> · {r.hospital}</span><span className="text-sm text-muted">{a.status.replace("_", " ")}</span></Link></li>; })}</ul>
          )}
        </div>
      </section>
    </main>
  );
}
