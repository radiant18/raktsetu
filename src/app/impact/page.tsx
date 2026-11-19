import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Impact() {
  const db = await readDB();
  const s = db.stats;
  const arrived = db.requests.flatMap((r) => r.acceptances).filter((a) => a.status === "arrived").length;
  const noShows = db.requests.flatMap((r) => r.acceptances).filter((a) => a.status === "no_show").length;
  const fulfilled = db.requests.filter((r) => r.status === "fulfilled").length;
  const verified = db.requests.filter((r) => r.verified).length;
  const tiles: [string, number, string][] = [
    ["Forwards checked", s.forwardsChecked, "screenshots read by RaktSetu"],
    ["Stale forwards stopped", s.staleStopped, "old or fulfilled requests caught before a wasted trip"],
    ["Duplicates merged", s.duplicatesMerged, "copies folded into one live request"],
    ["Scams flagged", s.scamsFlagged, "requests asking for money"],
    ["Donors arrived", arrived, "confirmed with an arrival code"],
    ["Requests fulfilled", fulfilled, `${verified} verified with a blood bank slip`],
    ["No-shows caught", noShows, "promises broken, trust lowered"],
    ["Verified donors", db.users.filter((u) => u.role === "donor").length, "OTP-verified accounts"],
  ];
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[.25em] text-muted">Making the invisible visible</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3 max-w-3xl">What the forwards never told us.</h1>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(([k, v, d], i) => (
          <div key={k} className={`card p-6 ${i === 1 ? "bg-rakt text-white border-0" : ""}`}>
            <p className={`text-xs uppercase tracking-widest ${i === 1 ? "text-white/80" : "text-muted"}`}>{k}</p>
            <p className="text-6xl font-bold mt-3">{v}</p>
            <p className={`text-sm mt-2 ${i === 1 ? "text-white/80" : "text-muted"}`}>{d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
