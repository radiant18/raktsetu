import Link from "next/link";
import Checker from "@/components/Checker";
import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDB();
  const live = db.requests.filter((r) => r.status === "active").length;
  const donors = db.users.filter((u) => u.role === "donor").length;

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rakt/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-24 relative">
          <div className="inline-flex items-center gap-2 chip bg-white border border-line text-muted">
            <span className="relative inline-flex h-2 w-2"><span className="ripple absolute inset-0 rounded-full" /><span className="relative h-2 w-2 rounded-full bg-rakt" /></span>
            {live} live requests · {donors} verified donors in Bengaluru
          </div>
          <h1 className="font-display text-[44px] leading-[1.02] md:text-[84px] mt-6 max-w-4xl">
            Every blood forward, <span className="italic text-rakt">verified</span> in seconds.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
            India finds emergency blood through WhatsApp forwards that never die. RaktSetu turns any forwarded screenshot into a live, verified request — matched only to compatible donors nearby — and kills the forward the moment the patient is safe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#check" className="btn btn-primary">Check a forward</a>
            <Link href="/voice" className="btn btn-ghost">🎙️ Need blood? Just speak</Link>
          </div>
        </div>
      </section>

      {/* Checker */}
      <section id="check" className="mx-auto max-w-6xl px-5 scroll-mt-24">
        <Checker />
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-5 mt-24">
        <p className="text-xs uppercase tracking-[.25em] text-muted">The jugaad we&apos;re replacing</p>
        <h2 className="font-display text-4xl md:text-5xl mt-3 max-w-3xl">A forward has no expiry date, no owner and no off switch.</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            ["🧟", "Forwards that never die", "A request met on Monday is still circulating weeks later. Donors travel for a patient who no longer needs them."],
            ["📵", "300 calls at 3 AM", "The family is in the ICU, and their number is on every group in the city."],
            ["🎯", "The wrong 500 people", "An O− request reaches hundreds who can't donate, while the right donor 2 km away never sees it."],
            ["💸", "Scams in the panic", "Fake requests ask for 'processing fees' over UPI from desperate people."],
            ["🤷", "Nobody knows the status", "Is it still needed? How many units are left? Who is already on the way?"],
            ["🚫", "No accountability", "Anyone can say 'I'm coming' and never show up. Nothing happens."],
          ].map(([i, t, d]) => (
            <div key={t} className="card p-6">
              <div className="text-2xl">{i}</div>
              <h3 className="font-semibold mt-3">{t}</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section className="mx-auto max-w-6xl px-5 mt-24">
        <div className="rounded-[28px] bg-ink text-white p-8 md:p-12">
          <p className="text-xs uppercase tracking-[.25em] text-white/50">How RaktSetu works</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3">People keep screenshotting. We make the screenshot do the work.</h2>
          <div className="mt-10 grid md:grid-cols-4 gap-6">
            {[
              ["01", "Screenshot in", "Any forward, any language. AI reads blood group, units, hospital, patient, contact and date."],
              ["02", "Verified", "Duplicates merge into one request. Old forwards expire. Money requests get flagged."],
              ["03", "Matched", "Only compatible, eligible donors within 15 km are alerted — in their own language."],
              ["04", "Closed with proof", "The blood bank slip screenshot closes the request. Every copy of the forward now says FULFILLED."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="font-display text-5xl text-rakt">{n}</p>
                <h3 className="font-semibold mt-2">{t}</h3>
                <p className="text-sm text-white/60 mt-1 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-5 mt-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-muted">Built for trust</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3">No fake donors. No ghost promises.</h2>
          <p className="text-muted mt-4 leading-relaxed">Every donor and family is verified with a one-time code. Donors who accept get an arrival code that only the family holds — so we know who really showed up.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["🔐", "OTP-verified accounts"],
            ["🔢", "Arrival code at the hospital"],
            ["⭐", "Trust score per donor"],
            ["⏱️", "Auto-release after 2 hours"],
            ["☝️", "One active promise at a time"],
            ["🩸", "90-day donation gap enforced"],
            ["🚩", "3 reports hide a request"],
            ["🧾", "Verified close with bank slip"],
          ].map(([i, t]) => (
            <div key={t} className="card p-4 flex items-center gap-3"><span className="text-xl">{i}</span><span className="font-medium">{t}</span></div>
          ))}
        </div>
      </section>
    </main>
  );
}
