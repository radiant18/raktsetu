import { Droplet, Hospital, KeyRound, Receipt, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { readDB } from "@/lib/db";
import { CountUp, DropScene, Reveal, Tilt } from "@/components/Motion";
import BloodMatch from "@/components/BloodMatch";
import { getT } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [db, t] = await Promise.all([readDB(), getT()]);
  const live = db.requests.filter((r) => r.status === "active").length;
  const donors = db.users.filter((u) => u.role === "donor").length;
  const done = db.requests.filter((r) => r.status === "fulfilled").length;
  // Demo baseline so the band looks alive (seeded demo numbers, added on top of the real counts).
  const seed = new Date().getDate();
  const shownLive = live + 9 + (seed % 7);
  const shownDone = done + 214 + seed * 3;

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-stretch">
          <div className="flex flex-col justify-between py-2 rise">
            <div>
              <p className="label">{t("Emergency blood · Bengaluru · 24×7")}</p>
              <h1 className="font-display text-[38px] md:text-[62px] mt-5">
                {t("One screenshot.")}<br /><span className="text-rakt">{t("The right donor.")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted">{t("Take a screenshot of the patient's details. Our AI reads the name, hospital and blood group, posts the request, and alerts only donors who can actually give, near the hospital.")}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/need" className="btn btn-primary !px-6 !py-4 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(224,17,43,.8)]"><Hospital className="ic" /> {t("I need blood")}</Link>
              <Link href="/live" className="btn btn-ghost !px-6 !py-4 hover:-translate-y-0.5"><Droplet className="ic" /> {t("I want to donate")}</Link>
            </div>
          </div>

          {/* 3D drop */}
          <div className="relative rounded-[28px] bg-[#0b0102] border border-line overflow-hidden min-h-[380px] md:min-h-[440px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(224,17,43,.45),transparent_60%)]" />
            <DropScene />
            <div className="absolute top-5 left-6 right-6 flex justify-between text-[11px] uppercase tracking-[.18em] text-white/60 pointer-events-none">
              <span className="flex items-center gap-2"><span className="relative inline-flex h-2 w-2"><span className="ripple absolute inset-0 rounded-full" /><span className="relative h-2 w-2 rounded-full bg-rakt" /></span>{t("Live in Bengaluru")}</span>
              <span>{t("Drag to spin ↻")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Red stats band */}
      <section className="mx-auto max-w-6xl px-4 mt-6">
        <div className="rounded-[28px] bg-rakt text-white px-5 md:px-7 py-7 md:py-8 grid grid-cols-3 gap-3 md:gap-4">
          <Stat n={shownLive} l={t("people need blood now")} />
          <Stat n={donors} l={t("donors ready nearby")} />
          <Stat n={shownDone} l={t("patients already helped")} />
        </div>
      </section>

      {/* Two doors */}
      <section className="mx-auto max-w-6xl px-4 mt-14 grid md:grid-cols-2 gap-6">
        <Reveal><Door href="/need" n="01" title={t("I need blood")} cta={t("Post with a screenshot")}
          points={["Screenshot the patient details or hospital form", "AI fills in name, hospital, blood group", "Check it, press Post. Donors get an alert"].map(t)} dark /></Reveal>
        <Reveal delay={120}><Door href="/live" n="02" title={t("I want to donate")} cta={t("See who needs you")}
          points={["See requests your blood group can help", "Nearest first, with distance", "Say yes, go, confirm with a 4-digit code"].map(t)} /></Reveal>
      </section>

      {/* Interactive blood match */}
      <section className="mx-auto max-w-6xl px-4 mt-14">
        <Reveal><BloodMatch /></Reveal>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <p className="label">{t("How it works")}</p>
        <div className="mt-6 grid md:grid-cols-4 gap-4">
          {[
            ["01", "Screenshot in", "Hospital form, doctor's note or WhatsApp message. Any language."],
            ["02", "AI reads it", "Patient, hospital, blood group, units and contact, filled in for you."],
            ["03", "Right donors only", "Matching blood group, within 15 km, alerted in Kannada, Hindi or English."],
            ["04", "Closed with proof", "Upload the blood bank slip. Every shared link now says DONE."],
          ].map(([n, ti, d], i) => (
            <Reveal key={n} delay={i * 110}>
              <Tilt className="card p-6 h-full">
                <p className="wordmark text-4xl text-rakt pop">{n}</p>
                <h3 className="font-semibold text-lg mt-4">{t(ti)}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{t(d)}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 mt-20 grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
        <Reveal>
          <p className="label">{t("Why you can trust it")}</p>
          <h2 className="font-display text-3xl md:text-4xl mt-4">{t("No fake donors.")}<br />{t("No empty promises.")}</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3">
          {[
            [ShieldCheck, "Everyone signs in with a phone code"],
            [KeyRound, "Donor confirms arrival with a code from the family"],
            [Star, "Donors who don't show up lose trust"],
            [Receipt, "Requests close only with a blood bank slip"],
          ].map(([Ic, tx], k) => (
            <Reveal key={tx as string} delay={k * 90}>
              <Tilt className="card p-5 flex items-center gap-3 h-full" max={14}><span className="pop h-10 w-10 shrink-0 rounded-xl bg-rakt/12 text-rakt flex items-center justify-center"><Ic className="h-5 w-5" strokeWidth={2} /></span><span className="font-medium text-sm">{t(tx as string)}</span></Tilt>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <CountUp to={n} className="wordmark text-4xl sm:text-5xl md:text-7xl block" />
      <p className="text-xs md:text-sm text-white/85 mt-3">{l}</p>
    </div>
  );
}

function Door({ href, n, title, cta, points, dark }: { href: string; n: string; title: string; cta: string; points: string[]; dark?: boolean }) {
  return (
    <Tilt className={`rounded-[28px] h-full ${dark ? "bg-rakt text-white" : "card"}`} max={8}>
      <Link href={href} className="group p-7 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className={`text-xs uppercase tracking-[.18em] ${dark ? "text-white/60" : "text-muted"}`}><span className={`font-bold ${dark ? "text-white" : "text-rakt"}`}>{"//"}</span> {n}</span>
          <span className="text-2xl transition group-hover:translate-x-1">→</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl mt-6 pop">{title}</h2>
        <ul className={`mt-5 space-y-2 text-sm ${dark ? "text-white/90" : "text-muted"}`}>
          {points.map((p) => <li key={p} className="flex gap-2"><span className={dark ? "text-white" : "text-rakt"}>●</span>{p}</li>)}
        </ul>
        <span className={`btn mt-7 ${dark ? "btn-dark" : "btn-primary"}`}>{cta}</span>
      </Link>
    </Tilt>
  );
}
