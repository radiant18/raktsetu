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
      {/* Hero: one sentence + three clear choices */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rakt/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-10 md:pt-20 relative">
          <div className="inline-flex items-center gap-2 chip bg-white border border-line text-muted">
            <span className="relative inline-flex h-2 w-2"><span className="ripple absolute inset-0 rounded-full" /><span className="relative h-2 w-2 rounded-full bg-rakt" /></span>
            {live} people need blood right now · {donors} donors ready in Bengaluru
          </div>
          <h1 className="font-display text-[42px] leading-[1.05] md:text-[72px] mt-5 max-w-4xl">
            Find blood fast. <span className="italic text-rakt">Stop fake forwards.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">Send us a screenshot of any blood request message. We tell you if it&apos;s real, and send it only to donors who can actually help.</p>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Choice href="#check" icon="📸" title="Check a message" text="Got a blood request on WhatsApp? Upload the screenshot. We tell you if it's still needed, already done, or a scam." cta="Check it" primary />
            <Choice href="/need" icon="🏥" title="I need blood" text="Post your request with a screenshot or your voice. Matching donors nearby get an alert." cta="Ask for blood" />
            <Choice href="/live" icon="🩸" title="I want to donate" text="See who needs your blood group near you. Say yes, go to the hospital, save a life." cta="Help someone" />
          </div>
        </div>
      </section>

      {/* Checker */}
      <section id="check" className="mx-auto max-w-6xl px-4 scroll-mt-28">
        <h2 className="font-display text-4xl md:text-5xl">📸 Check a blood request message</h2>
        <p className="text-muted mt-2 mb-5">Upload, drag, or paste (Ctrl/⌘ + V) a screenshot. Takes about 5 seconds.</p>
        <Checker />
      </section>

      {/* How it works, in 3 plain steps */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="rounded-[28px] bg-ink text-white p-7 md:p-12">
          <h2 className="font-display text-4xl md:text-5xl">How it works</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-8">
            {[
              ["1", "Upload the screenshot", "The same message people forward on WhatsApp. Any language. AI reads the blood group, hospital, units and date."],
              ["2", "We check it", "Same request twice? Merged. Too old? Marked old. Asks for money? Marked as a scam."],
              ["3", "The right donors come", "Only donors with a matching blood group within 15 km get an alert, in their language. When the blood is arranged, every copy says DONE."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4">
                <span className="shrink-0 h-12 w-12 rounded-full bg-rakt flex items-center justify-center font-bold text-xl">{n}</span>
                <div>
                  <h3 className="font-semibold text-lg">{t}</h3>
                  <p className="text-sm text-white/70 mt-1 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety, short */}
      <section className="mx-auto max-w-6xl px-4 mt-16">
        <h2 className="font-display text-4xl">Why you can trust it</h2>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ["🔐", "Everyone signs in with a phone code"],
            ["🔢", "Donors confirm arrival with a code from the family"],
            ["⭐", "Donors who don't show up lose trust"],
            ["🧾", "Requests close only with a blood bank slip"],
          ].map(([i, t]) => (
            <div key={t} className="card p-4 flex items-center gap-3"><span className="text-2xl">{i}</span><span className="font-medium">{t}</span></div>
          ))}
        </div>
        <p className="text-sm text-muted mt-4"><Link href="/impact" className="underline">See our impact so far →</Link></p>
      </section>
    </main>
  );
}

function Choice({ href, icon, title, text, cta, primary }: { href: string; icon: string; title: string; text: string; cta: string; primary?: boolean }) {
  return (
    <Link href={href} className={`card p-6 flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition ${primary ? "ring-2 ring-rakt" : ""}`}>
      <span className="text-4xl">{icon}</span>
      <h3 className="font-display text-3xl mt-3">{title}</h3>
      <p className="text-sm text-muted mt-2 flex-1 leading-relaxed">{text}</p>
      <span className={`btn mt-5 ${primary ? "btn-primary" : "btn-dark"}`}>{cta} →</span>
    </Link>
  );
}
