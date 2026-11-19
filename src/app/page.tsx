import Link from "next/link";
import { readDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDB();
  const live = db.requests.filter((r) => r.status === "active").length;
  const donors = db.users.filter((u) => u.role === "donor").length;
  const done = db.requests.filter((r) => r.status === "fulfilled").length;

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-16">
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 items-stretch">
          <div className="flex flex-col justify-between py-2">
            <div>
              <p className="label">Emergency blood · Bengaluru · 24×7</p>
              <h1 className="font-display text-[38px] md:text-[64px] mt-5">
                One screenshot.<br /><span className="text-rakt">The right donor.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted">Take a screenshot of the patient&apos;s details. Our AI reads the name, hospital and blood group, posts the request, and alerts only donors who can actually give, near the hospital.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/need" className="btn btn-primary !px-6 !py-4">🏥 I need blood</Link>
              <Link href="/live" className="btn btn-ghost !px-6 !py-4">🩸 I want to donate</Link>
            </div>
          </div>

          {/* Red live panel */}
          <div className="rounded-md bg-rakt text-white p-7 flex flex-col justify-between min-h-[320px]">
            <div className="flex items-center justify-between text-xs uppercase tracking-[.18em] text-white/80">
              <span className="flex items-center gap-2"><span className="relative inline-flex h-2 w-2"><span className="ripple absolute inset-0 rounded-full" /><span className="relative h-2 w-2 rounded-full bg-white" /></span>Live now</span>
              <span>RaktSetu</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-8">
              <Stat n={live} l="need blood now" />
              <Stat n={donors} l="donors ready" />
              <Stat n={done} l="already helped" />
            </div>
            <p className="mt-8 text-sm text-white/85 border-t border-white/30 pt-4">Real requests only. Old forwards expire. Requests close with a blood bank slip.</p>
          </div>
        </div>
      </section>

      {/* Two doors */}
      <section className="mx-auto max-w-6xl px-4 mt-16 grid md:grid-cols-2 gap-6">
        <Door href="/need" n="01" title="I need blood" cta="Post with a screenshot"
          points={["Screenshot the patient details or hospital form", "AI fills in name, hospital, blood group", "Check it, press Post. Donors get an alert"]} red />
        <Door href="/live" n="02" title="I want to donate" cta="See who needs you"
          points={["See requests your blood group can help", "Nearest first, with distance", "Say yes, go, confirm with a 4-digit code"]} />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <p className="label">How it works</p>
        <div className="mt-6 grid md:grid-cols-4 border-t hair">
          {[
            ["01", "Screenshot in", "Hospital form, doctor's note or WhatsApp message. Any language."],
            ["02", "AI reads it", "Patient, hospital, blood group, units and contact, filled in for you."],
            ["03", "Right donors only", "Matching blood group, within 15 km, alerted in Kannada, Hindi or English."],
            ["04", "Closed with proof", "Upload the blood bank slip. Every shared link now says DONE."],
          ].map(([n, t, d]) => (
            <div key={n} className="py-6 md:pr-6 border-b md:border-b-0 md:border-r hair last:border-r-0 md:pl-6 first:md:pl-0">
              <p className="wordmark text-4xl text-rakt">{n}</p>
              <h3 className="font-semibold text-lg mt-4">{t}</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 mt-20 grid lg:grid-cols-[1fr_1.4fr] gap-10">
        <div>
          <p className="label">Why you can trust it</p>
          <h2 className="font-display text-3xl md:text-4xl mt-4">No fake donors.<br />No empty promises.</h2>
        </div>
        <div className="grid grid-cols-2 border-t border-l hair">
          {[
            ["🔐", "Everyone signs in with a phone code"],
            ["🔢", "Donor confirms arrival with a code from the family"],
            ["⭐", "Donors who don't show up lose trust"],
            ["🧾", "Requests close only with a blood bank slip"],
          ].map(([i, t]) => (
            <div key={t} className="p-5 border-r border-b hair flex items-start gap-3"><span className="text-xl">{i}</span><span className="font-medium text-sm">{t}</span></div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="wordmark text-5xl md:text-6xl">{n}</p>
      <p className="text-xs text-white/80 mt-3">{l}</p>
    </div>
  );
}

function Door({ href, n, title, cta, points, red }: { href: string; n: string; title: string; cta: string; points: string[]; red?: boolean }) {
  return (
    <Link href={href} className={`group rounded-md p-7 flex flex-col border transition ${red ? "bg-ink text-white border-ink" : "card hover:border-ink"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs uppercase tracking-[.18em] ${red ? "text-white/60" : "text-muted"}`}><span className="text-rakt font-bold">{"//"}</span> {n}</span>
        <span className="text-2xl transition group-hover:translate-x-1">→</span>
      </div>
      <h2 className="font-display text-3xl md:text-4xl mt-6">{title}</h2>
      <ul className={`mt-5 space-y-2 text-sm ${red ? "text-white/75" : "text-muted"}`}>
        {points.map((p) => <li key={p} className="flex gap-2"><span className="text-rakt">■</span>{p}</li>)}
      </ul>
      <span className={`btn mt-7 ${red ? "btn-primary" : "btn-dark"}`}>{cta}</span>
    </Link>
  );
}
