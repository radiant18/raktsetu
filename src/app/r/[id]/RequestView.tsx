"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BloodRequest } from "@/lib/types";
import { speak } from "@/lib/speak";

const DonorMap = dynamic(() => import("@/components/DonorMap"), { ssr: false, loading: () => <div className="h-[380px] rounded-md bg-mist animate-pulse" /> });

type Acc = BloodRequest["acceptances"][number] & { trust: number; trustLabel: string; group: string };
interface Props {
  r: Omit<BloodRequest, "acceptances"> & { acceptances: Acc[]; reportCount: number };
  viewer: { id: string; name: string; role: string; bloodGroup: string | null; language: "en" | "hi" | "kn"; trust: number; blocked: boolean; ok: boolean; daysLeft: number; compatible: boolean } | null;
  isOwner: boolean;
  myAcceptance: { status: string } | null;
  reported: boolean;
  pins: { id: string; lat: number; lng: number; label: string; group: string; eligible: boolean; distanceKm: number; trust: number; language: "en" | "hi" | "kn"; daysLeft: number }[];
}

const STATUS: Record<string, string> = {
  active: "🟢 Still needed",
  fulfilled: "✅ Done: blood arranged. Stop forwarding.",
  expired: "⌛ Old request, probably not needed",
  flagged: "🚩 Hidden: reported as fake",
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

  async function playAlert() {
    setBusy("alert");
    try {
      const donor = pins.find((p) => p.eligible);
      const res = await fetch("/api/alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: r.id, donorId: donor?.id, lang }) });
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

  const label = STATUS[r.status] ?? STATUS.active;
  const pct = Math.round((r.unitsArranged / Math.max(1, r.units)) * 100);
  const going = r.acceptances.filter((a) => a.status === "on_the_way");
  const arrived = r.acceptances.filter((a) => a.status === "arrived");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const canGive = pins.filter((p) => p.eligible).length;

  const share = (
    <div className="flex flex-wrap gap-2">
      <a className="btn btn-primary text-sm" href={`https://wa.me/?text=${encodeURIComponent(`${r.bloodGroup} blood needed at ${r.hospital}. Live status (says DONE when fulfilled): ${shareUrl}`)}`} target="_blank">💬 Share on WhatsApp</a>
      <button className="btn btn-ghost text-sm" onClick={() => { navigator.clipboard.writeText(shareUrl); setMsg({ ok: true, text: "Link copied. Share this link instead of the old message. It always shows the latest status." }); }}>🔗 Copy link</button>
      <a className="btn btn-ghost text-sm" href={`/r/${r.id}/poster`} target="_blank">🖼️ Poster with QR code</a>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* 1. What is this request? */}
      <section className="card p-6 md:p-8">
        <p className="font-semibold">{label}{r.verified && " · 🧾 confirmed by blood bank slip"}</p>
        <div className="mt-4 flex items-center gap-5">
          <div className={`shrink-0 h-24 w-24 md:h-28 md:w-28 rounded-md ${r.status === "active" ? "bg-rakt" : "bg-ink"} text-white flex flex-col items-center justify-center`}>
            <span className="text-4xl font-bold">{r.bloodGroup ?? "?"}</span>
            <span className="text-[10px] uppercase tracking-widest opacity-80">blood</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-5xl leading-tight">{r.units} unit{r.units > 1 ? "s" : ""} of {r.bloodGroup ?? "blood"} needed</h1>
            <p className="text-muted mt-1 text-lg">for <b className="text-ink">{r.patient ?? "a patient"}</b> at <b className="text-ink">{r.hospital ?? "hospital not given"}</b>{r.area ? `, ${r.area}` : ""}</p>
            {r.contact && (isOwner || r.status === "active") && <p className="mt-1">📞 <a className="underline" href={`tel:${r.contact.replace(/[^\d+]/g, "")}`}>{r.contact}</a></p>}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex flex-wrap justify-between gap-2 text-sm font-medium"><span>{r.unitsArranged} of {r.units} units arranged</span><span>{going.length} donor{going.length !== 1 ? "s" : ""} on the way · {arrived.length} arrived</span></div>
          <div className="mt-2 h-3 rounded-full bg-mist overflow-hidden"><div className="h-full bg-rakt rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
        {r.scamFlags.length > 0 && r.status === "active" && (
          <div className="mt-5 rounded-md bg-[#fff7e6] border border-[#f5d48a] p-4 text-sm">
            <p className="font-semibold">⚠️ Please double-check before you go</p>
            <ul className="mt-1 space-y-0.5">{r.scamFlags.map((s) => <li key={s}>• {s}</li>)}</ul>
          </div>
        )}
        {r.status === "fulfilled" && (
          <div className="mt-5 rounded-md bg-ink text-white p-5">
            <p className="font-display text-3xl">The patient got the blood. Please stop forwarding.</p>
            {r.closureNote && <p className="text-white/70 text-sm mt-1">{r.closureNote}</p>}
          </div>
        )}
      </section>

      {msg && <div className={`rise mt-4 rounded-md p-4 ${msg.ok ? "bg-[#eafaf4] border border-[#9fe3cb]" : "bg-[#fdecef] border border-[#f3b3be]"}`}>{msg.text}</div>}

      {/* 2. What should YOU do? */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
        {isOwner ? (
          <section className="card p-6">
            <p className="text-xs uppercase tracking-[.2em] text-muted">This is your request</p>
            <h2 className="font-display text-3xl mt-1">What to do now</h2>
            <ol className="mt-5 space-y-6">
              <Step n="1" title="Share this page">
                <p className="text-sm text-muted mb-3">Send this link instead of a forward. It always shows the latest status.</p>
                {share}
              </Step>
              <Step n="2" title="When a donor reaches the hospital, tell them their code">
                {r.acceptances.length === 0 ? (
                  <p className="text-sm text-muted">No one has said yes yet. {canGive} matching donor{canGive !== 1 ? "s" : ""} nearby got an alert.</p>
                ) : (
                  <div className="space-y-2">
                    {r.acceptances.map((a) => (
                      <div key={a.donorId + a.acceptedAt} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
                        <div>
                          <p className="font-semibold">{a.donorName} <span className="text-muted font-normal">· {a.group}</span></p>
                          <p className="text-xs text-muted">⭐ trust {a.trust} ({a.trustLabel})</p>
                        </div>
                        {a.status === "on_the_way" ? (
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-muted">their code</p>
                            <p className="font-mono text-2xl tracking-[.3em] font-bold text-rakt">{a.code}</p>
                            <button className="text-xs text-muted underline" disabled={!!busy} onClick={async () => { if (await call("noshow", { donorId: a.donorId })) { setMsg({ ok: true, text: "Marked as not coming. Their trust score dropped and the place is open for someone else." }); router.refresh(); } }}>They didn&apos;t come</button>
                          </div>
                        ) : (
                          <span className="chip bg-mist">{a.status === "arrived" ? "✅ arrived" : a.status === "no_show" ? "❌ didn't come" : "left"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Step>
              {r.status === "active" && (
                <Step n="3" title="Got the blood? Upload the blood bank slip">
                  <CloseBox busy={!!busy} onClose={async (fd) => { const j = await call("close", fd); if (j) { setMsg({ ok: true, text: j.closed ? (j.verified ? "Done! The slip is confirmed. Everyone who checks the old message will now see DONE." : "Marked as done.") : `Slip read: ${j.unitsArranged} of ${r.units} units. Still waiting for the rest.` }); router.refresh(); } }} />
                </Step>
              )}
            </ol>
          </section>
        ) : (
          <section className="card p-6">
            <p className="text-xs uppercase tracking-[.2em] text-muted">Can you help?</p>
            {r.status !== "active" && !myAcceptance && <h2 className="font-display text-3xl mt-1">This request is closed. Thank you for checking.</h2>}

            {r.status === "active" && !viewer && (
              <>
                <h2 className="font-display text-3xl mt-1">Sign in to donate</h2>
                <p className="text-muted mt-1">We check every donor with a phone code, so families only see real people.</p>
                <Link href={`/login?next=/r/${r.id}`} className="btn btn-primary mt-4 w-full">Sign in with phone</Link>
              </>
            )}

            {r.status === "active" && viewer && !myAcceptance?.status && (
              <>
                <h2 className="font-display text-3xl mt-1">
                  {!viewer.bloodGroup ? "Add your blood group first" : !viewer.compatible ? `Sorry, ${viewer.bloodGroup} can't be given to ${r.bloodGroup}` : !viewer.ok ? "You donated recently" : "✅ You can donate!"}
                </h2>
                <p className="text-muted mt-1">
                  {!viewer.bloodGroup ? <Link className="underline" href="/me">Add it on your account page.</Link>
                    : !viewer.compatible ? "Your blood group doesn't match. Please share this page with someone who can help."
                    : !viewer.ok ? `For your safety, wait ${viewer.daysLeft} more days before donating again.`
                    : "Say yes only if you can reach the hospital in the next 2 hours."}
                </p>
                {viewer.compatible && viewer.ok && (
                  <button className="btn btn-primary mt-4 w-full !py-4 text-lg" disabled={!!busy || viewer.blocked} onClick={async () => { const j = await call("accept"); if (j) { setMsg({ ok: true, text: `Thank you! You are ${j.distanceKm.toFixed(1)} km away. At the hospital, ask the family for your 4-digit code.` }); router.refresh(); } }}>
                    🩸 Yes, I&apos;ll go
                  </button>
                )}
              </>
            )}

            {viewer && myAcceptance?.status === "on_the_way" && (
              <>
                <h2 className="font-display text-3xl mt-1">You said yes. Thank you!</h2>
                <ol className="mt-4 space-y-5">
                  <Step n="1" title={`Go to ${r.hospital ?? "the hospital"}`}><p className="text-sm text-muted">Please reach within 2 hours.</p></Step>
                  <Step n="2" title="Ask the family for your 4-digit code and type it here">
                    <div className="flex gap-2">
                      <input className="input font-mono text-2xl tracking-[.4em] text-center" maxLength={4} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                      <button className="btn btn-primary" disabled={code.length !== 4 || !!busy} onClick={async () => { const j = await call("arrive", { code }); if (j) { setMsg({ ok: true, text: "You're confirmed at the hospital. Thank you, your trust score went up. 🩸" }); router.refresh(); } }}>Confirm</button>
                    </div>
                  </Step>
                </ol>
                <button className="text-sm text-muted underline mt-5" onClick={async () => { if (await call("noshow")) { setMsg({ ok: true, text: "Okay, we let the family know. Your place is open for another donor." }); router.refresh(); } }}>I can&apos;t go any more</button>
              </>
            )}
            {viewer && myAcceptance && myAcceptance.status !== "on_the_way" && (
              <h2 className="font-display text-3xl mt-1">{myAcceptance.status === "arrived" ? "✅ You donated. Thank you!" : myAcceptance.status === "no_show" ? "You didn't make it this time." : "You cancelled this one."}</h2>
            )}

            {r.status === "active" && <div className="mt-6 pt-5 border-t border-line"><p className="text-sm font-medium mb-2">Know someone who can help? Share it:</p>{share}</div>}
            {viewer && r.status === "active" && (
              <button className="text-xs text-muted underline mt-4 block" disabled={reported || !!busy} onClick={async () => { const j = await call("report"); if (j) { setMsg({ ok: true, text: j.hidden ? "Thanks. Enough people reported this, so it's now hidden." : `Reported (${j.reports} of 3). We hide a request after 3 reports.` }); router.refresh(); } }}>
                {reported ? "You reported this as fake" : "🚩 This looks fake"}
              </button>
            )}
          </section>
        )}

        {/* 3. Map + spoken alert */}
        <section className="flex flex-col gap-4">
          <div className="card p-4">
            <p className="font-semibold px-2">Donors near the hospital</p>
            <p className="text-sm text-muted px-2 pb-3">🔴 hospital · 🟢 can donate today · ⚪ donated recently. {canGive} can give today.</p>
            <DonorMap center={[r.lat, r.lng]} hospital={r.hospital ?? "Hospital"} pins={pins} />
          </div>
          {r.status === "active" && (
            <div className="card p-5">
              <p className="font-semibold">🔊 Hear the alert donors get</p>
              <p className="text-sm text-muted">Each donor hears it in their own language.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["kn", "hi", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`chip !px-4 !py-2 border ${lang === l ? "bg-ink text-white border-ink" : "bg-white border-line"}`}>{l === "kn" ? "ಕನ್ನಡ" : l === "hi" ? "हिंदी" : "English"}</button>
                ))}
                <button className="btn btn-dark !py-2 text-sm ml-auto" disabled={!!busy} onClick={playAlert}>{busy === "alert" ? "Loading…" : "▶ Play"}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4 list-none">
      <span className="shrink-0 h-9 w-9 rounded-full bg-rakt text-white flex items-center justify-center font-bold">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold mb-2">{title}</p>
        {children}
      </div>
    </li>
  );
}

function CloseBox({ busy, onClose }: { busy: boolean; onClose: (fd: FormData) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="rounded-md bg-mist p-4">
      <p className="text-sm text-muted">Take a photo of the slip the blood bank gave you. We read it and mark this request as done everywhere.</p>
      <label className="btn btn-ghost text-sm mt-3 cursor-pointer">
        📎 {file ? file.name : "Choose slip photo"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary text-sm" disabled={!file || busy} onClick={() => { const fd = new FormData(); fd.append("image", file!); onClose(fd); }}>{busy ? "Reading slip…" : "Upload slip and close"}</button>
        <button className="text-sm text-muted underline" disabled={busy} onClick={() => onClose(new FormData())}>No slip? Mark as done</button>
      </div>
    </div>
  );
}
