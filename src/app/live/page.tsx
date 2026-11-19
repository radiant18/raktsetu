import Link from "next/link";
import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Live() {
  const db = await readDB();
  const active = db.requests.filter((r) => r.status === "active");
  const closed = db.requests.filter((r) => r.status === "fulfilled").slice(0, 6);
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[.25em] text-muted">Bengaluru · right now</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">Live requests</h1>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.length === 0 && <p className="text-muted">No live requests. Upload a forward on the <Link className="underline" href="/#check">home page</Link>.</p>}
        {active.map((r) => (
          <Link key={r.id} href={`/r/${r.id}`} className="card p-5 hover:shadow-xl transition flex gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-rakt text-white flex items-center justify-center text-2xl font-bold">{r.bloodGroup ?? "?"}</div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{r.hospital ?? "Hospital"}</p>
              <p className="text-sm text-muted truncate">{r.area ?? r.city} · {r.unitsArranged}/{r.units} units</p>
              <p className="text-xs text-muted mt-1">{r.acceptances.filter((a) => a.status === "on_the_way").length} on the way · checked {r.timesChecked}×{r.scamFlags.length ? " · ⚠ unverified" : ""}</p>
            </div>
          </Link>
        ))}
      </div>
      {closed.length > 0 && (
        <>
          <h2 className="font-display text-3xl mt-14">Recently fulfilled</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {closed.map((r) => (
              <Link key={r.id} href={`/r/${r.id}`} className="rounded-2xl border border-line p-4 flex items-center justify-between bg-white">
                <span><b>{r.bloodGroup}</b> · {r.hospital}</span>
                <span className="chip bg-ink text-white">{r.verified ? "✓ verified" : "done"}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
