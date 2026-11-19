"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BloodRequest } from "@/lib/types";
import { speak } from "@/lib/speak";

const DonorMap = dynamic(() => import("@/components/DonorMap"), { ssr: false, loading: () => <div className="h-[380px] rounded-2xl bg-mist animate-pulse" /> });

type Acc = BloodRequest["acceptances"][number] & { trust: number; trustLabel: string; group: string };
interface Props {
  r: Omit<BloodRequest, "acceptances"> & { acceptances: Acc[]; reportCount: number };
  viewer: { id: string; name: string; role: string; bloodGroup: string | null; language: "en" | "hi" | "kn"; trust: number; blocked: boolean; ok: boolean; daysLeft: number; compatible: boolean } | null;
  isOwner: boolean;
  myAcceptance: { status: string } | null;
  reported: boolean;
  pins: { id: string; lat: number; lng: number; label: string; group: string; eligible: boolean; distanceKm: number; trust: number; language: "en" | "hi" | "kn"; daysLeft: number }[];
}

const STATUS: Record<string, [string, string]> = {
  active: ["bg-pulse", "Live · needed now"],
  fulfilled: ["bg-ink", "Fulfilled · stop forwarding"],
  expired: ["bg-muted", "Expired · old forward"],
  flagged: ["bg-rakt", "Hidden · reported or suspicious"],
};

export default function RequestView({ r, viewer, isOwner, myAcceptance, reported, pins }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<"en" | "hi" | "kn">(viewer?.language ?? "kn");

  async function call(path: string, body?: object | FormData) {
    setBusy(path);
    setMsg(null);
    try {
      const res = await fetch(`/api/r/${r.id}/${path}`, {
        method: "POST",
        ...(body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function playAlert(donorId: string | undefined, l: "en" | "hi" | "kn") {
    setBusy("alert:" + (donorId ?? "me"));
    try {
      const res = await fetch("/api/alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: r.id, donorId, lang: l }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg({ ok: true, text: "🔊 " + j.text });
      speak(j.text, j.lang);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't play alert" });
    } finally {
      setBusy(null);
    }
  }

  const [dot, label] = STATUS[r.status] ?? STATUS.active;
  const pct = Math.round((r.unitsArranged / Math.max(1, r.units)) * 100);
  const going = r.acceptances.filter((a) => a.status === "on_the_way");
  const arrived = r.acceptances.filter((a) => a.status === "arrived");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip bg-white border border-line"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
        {r.verified && <span className="chip bg-[#eafaf4] text-[#0b7a5c]">✓ Verified with blood bank slip</span>}
        <span className="chip bg-white border border-line text-muted">via {r.source === "voice" ? "voice note 🎙️" : "screenshot 📸"}</span>
        <span className="chip bg-white border border-line text-muted">checked {r.timesChecked}×</span>
        {r.scamFlags.length > 0 && <span className="chip bg-[#fff7e6] text-[#8a6200]">⚠ {r.scamFlags.length} warning{r.scamFlags.length > 1 ? "s" : ""}</span>}
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.1fr_.9fr] gap-6">
        {/* Left: the request */}
        <section className="card p-7">
          <div className="flex items-start gap-6">
            <div className={`shrink-0 h-28 w-28 rounded-3xl ${r.status === "active" ? "bg-rakt" : "bg-ink"} text-white flex flex-col items-center justify-center`}>
              <span className="text-4xl font-bold">{r.bloodGroup ?? "?"}</span>
              <span className="text-[10px] uppercase tracking-widest opacity-80">{r.component}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.2em] text-muted">Blood needed for</p>
              <h1 className="font-display text-4xl md:text-5xl leading-tight truncate">{r.patient ?? "Patient"}</h1>
              <p className="text-muted mt-1">{r.hospital ?? "Hospital not given"}{r.area ? ` · ${r.area}` : ""} · {r.city}</p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex justify-between text-sm font-medium"><span>{r.unitsArranged} of {r.units} unit{r.units > 1 ? "s" : ""} arranged</span><span>{pct}%</span></div>
            <div className="mt-2 h-3 rounded-full bg-mist overflow-hidden"><div className="h-full bg-rakt rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <p className="text-sm text-muted mt-2">{going.length} donor{going.length !== 1 ? "s" : ""} on the way · {arrived.length} arrived</p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Info k="Contact" v={isOwner || r.status === "active" ? r.contact ?? "—" : "Hidden — request closed"} />
            <Info k="Posted on" v={r.postedOn ?? "Unknown"} />
            <Info k="Live since" v={new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
            <Info k="Reports" v={`${r.reportCount}`} />
          </dl>

          {r.scamFlags.length > 0 && (
            <div className="mt-5 rounded-2xl bg-[#fff7e6] border border-[#f5d48a] p-4 text-sm">
              <p className="font-semibold">Before you act</p>
              <ul className="mt-1 space-y-0.5">{r.scamFlags.map((s) => <li key={s}>• {s}</li>)}</ul>
              <p className="mt-2 text-xs">Real blood requests never ask donors for money.</p>
            </div>
          )}

          {r.status === "fulfilled" && (
            <div className="mt-5 rounded-2xl bg-ink text-white p-5">
              <p className="font-display text-3xl">Fulfilled. Please stop forwarding.</p>
              <p className="text-white/70 text-sm mt-1">{r.closureNote}</p>
            </div>
          )}

          {/* Share */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn btn-ghost text-sm" onClick={() => { navigator.clipboard.writeText(shareUrl); setMsg({ ok: true, text: "Live link copied. Share this instead of the forward — it always shows the current status." }); }}>🔗 Copy live link</button>
            <a className="btn btn-ghost text-sm" href={`/r/${r.id}/poster`} target="_blank">🖼️ Verified poster + QR</a>
            <a className="btn btn-ghost text-sm" href={`https://wa.me/?text=${encodeURIComponent(`${r.bloodGroup} blood needed at ${r.hospital}. Live status (stops when fulfilled): ${shareUrl}`)}`} target="_blank">💬 Share on WhatsApp</a>
          </div>
        </section>

        {/* Right: actions */}
        <section className="flex flex-col gap-4">
          {msg && <div className={`rise rounded-2xl p-4 text-sm ${msg.ok ? "bg-[#eafaf4] border border-[#9fe3cb]" : "bg-[#fdecef] border border-[#f3b3be]"}`}>{msg.text}</div>}

          {isOwner ? (
            <div className="card p-6">
              <p className="text-xs uppercase tracking-[.2em] text-muted">Family control room</p>
              <h2 className="font-display text-3xl mt-1">Donors on the way</h2>
              <p className="text-sm text-muted mt-1">Give each donor their arrival code only when they reach the blood bank. That&apos;s how we know who really came.</p>
              <div className="mt-4 space-y-2">
                {r.acceptances.length === 0 && <p className="text-sm text-muted">No donor has accepted yet. Matching is live.</p>}
                {r.acceptances.map((a) => (
                  <div key={a.donorId + a.acceptedAt} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
                    <div>
                      <p className="font-semibold">{a.donorName} <span className="text-muted font-normal">· {a.group}</span></p>
                      <p className="text-xs text-muted">⭐ {a.trust} · {a.trustLabel} · {a.status.replace("_", " ")}</p>
                    </div>
                    {a.status === "on_the_way" ? (
                      <div className="text-right">
                        <p className="font-mono text-2xl tracking-[.3em] font-bold text-rakt">{a.code}</p>
                        <button className="text-xs text-muted underline" disabled={!!busy} onClick={async () => { if (await call("noshow", { donorId: a.donorId })) { setMsg({ ok: true, text: "Marked as no-show. Their trust score dropped and the slot reopened." }); router.refresh(); } }}>Didn&apos;t come</button>
                      </div>
                    ) : (
                      <span className="chip bg-mist">{a.status === "arrived" ? "✓ arrived" : a.status.replace("_", " ")}</span>
                    )}
                  </div>
                ))}
              </div>
              {r.status === "active" && <CloseBox busy={!!busy} onClose={async (fd) => { const j = await call("close", fd); if (j) { setMsg({ ok: true, text: j.closed ? (j.verified ? "Closed with verified proof. Every copy of the forward now says FULFILLED." : "Marked as done.") : `Slip read: ${j.unitsArranged}/${r.units} units. ${j.note}` }); router.refresh(); } }} />}
            </div>
          ) : (
            <div className="card p-6">
              <p className="text-xs uppercase tracking-[.2em] text-muted">Can you help?</p>
              {!viewer && (
                <>
                  <h2 className="font-display text-3xl mt-1">Sign in to donate</h2>
                  <p className="text-sm text-muted mt-1">We verify every donor with a one-time code so families only see real people.</p>
                  <Link href={`/login?next=/r/${r.id}`} className="btn btn-primary mt-4 w-full">Verify with OTP</Link>
                </>
              )}
              {viewer && !myAcceptance?.status && r.status === "active" && (
                <>
                  <h2 className="font-display text-3xl mt-1">{viewer.compatible ? "You're a match." : viewer.bloodGroup ? `${viewer.bloodGroup} can't give to ${r.bloodGroup}` : "Add your blood group"}</h2>
                  <p className="text-sm text-muted mt-1">
                    {viewer.compatible ? (viewer.ok ? "Accept only if you can reach the hospital within 2 hours. No-shows lower your trust score." : `You donated recently — eligible again in ${viewer.daysLeft} days.`) : "Thanks for checking. Share the live link with someone who can help."}
                  </p>
                  <button className="btn btn-primary mt-4 w-full" disabled={!!busy || !viewer.compatible || !viewer.ok || viewer.blocked} onClick={async () => { const j = await call("accept"); if (j) { setMsg({ ok: true, text: `Thank you! You're ${j.distanceKm.toFixed(1)} km away. At the blood bank, ask the family for your 4-digit arrival code.` }); router.refresh(); } }}>
                    I&apos;m going — accept
                  </button>
                  <p className="text-xs text-muted mt-2">Your trust score: ⭐ {viewer.trust}</p>
                </>
              )}
              {viewer && myAcceptance?.status === "on_the_way" && (
                <>
                  <h2 className="font-display text-3xl mt-1">You&apos;re on the way</h2>
                  <p className="text-sm text-muted mt-1">At the blood bank, the family will tell you a 4-digit code. Enter it here to confirm you arrived.</p>
                  <div className="mt-4 flex gap-2">
                    <input className="input font-mono text-2xl tracking-[.4em] text-center" maxLength={4} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                    <button className="btn btn-primary" disabled={code.length !== 4 || !!busy} onClick={async () => { const j = await call("arrive", { code }); if (j) { setMsg({ ok: true, text: "Arrival confirmed. Thank you — your trust score went up. 🩸" }); router.refresh(); } }}>Confirm</button>
                  </div>
                  <button className="text-xs text-muted underline mt-3" onClick={async () => { if (await call("noshow")) { setMsg({ ok: true, text: "Cancelled. The slot is open for another donor." }); router.refresh(); } }}>I can&apos;t make it — release my slot</button>
                </>
              )}
              {viewer && myAcceptance && myAcceptance.status !== "on_the_way" && <h2 className="font-display text-3xl mt-1">Your status: {myAcceptance.status.replace("_", " ")}</h2>}
              {r.status !== "active" && !myAcceptance && <h2 className="font-display text-3xl mt-1">This request is closed.</h2>}
              {viewer && r.status === "active" && (
                <button className="text-xs text-muted underline mt-4 block" disabled={reported || !!busy} onClick={async () => { const j = await call("report"); if (j) { setMsg({ ok: true, text: j.hidden ? "Thanks. Enough people reported this, so it's now hidden." : `Reported (${j.reports}/3). We hide requests after 3 reports.` }); router.refresh(); } }}>
                  {reported ? "You reported this request" : "🚩 Report as fake"}
                </button>
              )}
            </div>
          )}

          <div className="card p-4">
            <div className="flex items-center justify-between px-2 pb-3">
              <p className="font-semibold">Compatible donors within 15 km</p>
              <span className="text-sm text-muted">{pins.filter((p) => p.eligible).length} can give today</span>
            </div>
            <DonorMap center={[r.lat, r.lng]} hospital={r.hospital ?? "Hospital"} pins={pins} />
          </div>
        </section>
      </div>

      {/* Alerts */}
      {r.status === "active" && (
        <section className="mt-6 card p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-muted">Spoken alerts</p>
              <h2 className="font-display text-3xl mt-1">Only the right donors hear about it — in their own language.</h2>
            </div>
            <div className="flex gap-1 rounded-full bg-mist p-1 text-sm">
              {(["kn", "hi", "en"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 rounded-full ${lang === l ? "bg-white shadow font-semibold" : "text-muted"}`}>{l === "kn" ? "ಕನ್ನಡ" : l === "hi" ? "हिंदी" : "English"}</button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pins.slice(0, 9).map((p) => (
              <div key={p.id} className="rounded-2xl border border-line p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.label} <span className="text-muted font-normal">· {p.group}</span></p>
                  <p className="text-xs text-muted">{p.distanceKm.toFixed(1)} km · ⭐ {p.trust} · {p.eligible ? "eligible" : `wait ${p.daysLeft}d`}</p>
                </div>
                <button disabled={!p.eligible || !!busy} onClick={() => playAlert(p.id, lang)} className="btn btn-ghost !px-3 !py-2 text-sm">{busy === "alert:" + p.id ? "…" : "🔊"}</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
      <dd className="font-semibold truncate">{v}</dd>
    </div>
  );
}

function CloseBox({ busy, onClose }: { busy: boolean; onClose: (fd: FormData) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="mt-6 rounded-2xl bg-mist p-4">
      <p className="font-semibold">Got the blood? Close it with proof.</p>
      <p className="text-sm text-muted">Screenshot the blood bank issue slip. RaktSetu reads it and marks this request verified-fulfilled everywhere.</p>
      <input type="file" accept="image/*" className="mt-3 text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-primary text-sm" disabled={!file || busy} onClick={() => { const fd = new FormData(); fd.append("image", file!); onClose(fd); }}>{busy ? "Reading slip…" : "Close with slip"}</button>
        <button className="btn btn-ghost text-sm" disabled={busy} onClick={() => onClose(new FormData())}>Mark done without proof</button>
      </div>
    </div>
  );
}
