"use client";
import { CheckCircle2, Download, Droplet, ImagePlus, MessageCircle, Sparkles, Keyboard } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/Lang";
import PlacePicker, { DEFAULT_PLACE, type Place } from "@/components/PlacePicker";
import { findPlace } from "@/lib/places";
import type { BloodRequest, Extracted } from "@/lib/types";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
type Fields = { patient: string; bloodGroup: string; units: string; hospital: string; area: string; contact: string; component: string };
const EMPTY: Fields = { patient: "", bloodGroup: "", units: "1", hospital: "", area: "", contact: "", component: "Whole blood" };

export default function NeedForm() {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [f, setF] = useState<Fields | null>(null);
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ verdict: string; request: BloodRequest; reasons: string[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const read = useCallback(async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setReading(true); setErr(null); setF(null);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const e: Extracted = j.extracted;
      const next: Fields = {
        patient: e.patient ?? "", bloodGroup: e.bloodGroup ?? "", units: String(e.units || 1), hospital: e.hospital ?? "",
        area: [e.area, e.city].filter(Boolean).join(", "), contact: e.contact ?? "", component: e.component || "Whole blood",
      };
      setFound(new Set(Object.entries(next).filter(([k, v]) => v && !(k === "units" && !e.units) && k !== "component").map(([k]) => k)));
      const pl = findPlace([e.area, e.city, e.hospital].filter(Boolean).join(" "));
      setPlace({ state: pl?.state ?? DEFAULT_PLACE.state, city: pl?.city ?? DEFAULT_PLACE.city, locality: e.area ?? "" });
      setF(next); setFingerprint(j.fingerprint);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't read it. You can type the details instead.");
      setF(EMPTY);
    } finally { setReading(false); }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => read(Array.from(e.clipboardData?.files ?? [])[0]);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [read]);

  async function post() {
    if (!f) return;
    setPosting(true); setErr(null);
    try {
      const area = place.locality.trim();
      const city = place.city;
      const res = await fetch("/api/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, area: area || null, city: city || null, fingerprint }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setDone(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setPosting(false); }
  }

  if (done) {
    const r = done.request;
    const dup = done.verdict === "duplicate" || done.verdict === "active";
    const url = typeof window !== "undefined" ? `${window.location.origin}/r/${r.id}` : `/r/${r.id}`;
    return (
      <div className="grid md:grid-cols-2 gap-6 items-start rise">
        <div className="card p-7">
          <p className="font-semibold">{dup ? "This request was already posted" : "Your request is live"}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-2">{r.units} unit{r.units > 1 ? "s" : ""} of {r.bloodGroup} for {r.patient}</h2>
          <p className="text-muted mt-1">{r.hospital}{r.area ? `, ${r.area}` : ""}</p>
          <ul className="mt-5 space-y-2 text-sm">
            {dup ? <li className="flex gap-2"><CheckCircle2 className="ic text-pulse mt-0.5 shrink-0" />{t("Someone already posted this. We joined them, so donors don't get it twice.")}</li> : <>
              <li className="flex gap-2"><CheckCircle2 className="ic text-pulse mt-0.5 shrink-0" />{t("Matching donors within 15 km got an alert in their language")}</li>
              <li className="flex gap-2"><CheckCircle2 className="ic text-pulse mt-0.5 shrink-0" />{t("A poster with a QR code is ready (right)")}</li>
              <li className="flex gap-2"><CheckCircle2 className="ic text-pulse mt-0.5 shrink-0" />{t("When you get the blood, upload the bank slip and every copy says DONE")}</li>
            </>}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/r/${r.id}`} className="btn btn-primary">{t("Open my request →")}</Link>
            <a className="btn btn-dark" target="_blank" href={`https://wa.me/?text=${encodeURIComponent(`${r.bloodGroup} blood needed for ${r.patient} at ${r.hospital}. Live status: ${url}`)}`}><MessageCircle className="ic" /> {t("Share on WhatsApp")}</a>
            <a href={`/r/${r.id}/poster`} download={`raktsetu-${r.bloodGroup}.png`} className="btn btn-ghost"><Download className="ic" /> {t("Poster")}</a>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/r/${r.id}/poster`} alt="Poster with QR code" className="w-full rounded-2xl shadow-2xl border border-line" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      {/* Left: the screenshot */}
      <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); read(e.dataTransfer.files[0]); }}
        className="card relative overflow-hidden cursor-pointer min-h-[360px] flex items-center justify-center">
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
        {preview ? (
          <div className="relative w-full p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Patient details" className="max-h-[440px] rounded-xl object-contain shadow-lg" />
            {reading && <div className="scanline" />}
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-rakt/10 flex items-center justify-center text-3xl"><ImagePlus className="h-8 w-8 text-rakt" /></div>
            <p className="font-semibold text-lg">{t("Add a screenshot of the patient details")}</p>
            <p className="text-sm text-muted mt-1">{t("Hospital form, doctor's note, patient file or a WhatsApp message")}</p>
            <p className="text-xs text-muted mt-3">{t("Tap to choose · drag it here · or paste (Ctrl/⌘ + V)")}</p>
          </div>
        )}
      </div>

      {/* Right: what the AI found, editable */}
      <div className="card p-6">
        {!f && !reading && (
          <>
            <p className="text-xs uppercase tracking-[.2em] text-muted">{t("How it works")}</p>
            <h3 className="font-display text-3xl mt-2">{t("AI fills the form for you")}</h3>
            <ol className="mt-4 space-y-2 text-sm">
              <li className="flex gap-3 items-start"><span className="h-6 w-6 shrink-0 rounded-full bg-rakt text-white text-xs font-bold flex items-center justify-center">1</span>{t("Add the screenshot (left)")}</li>
              <li className="flex gap-3 items-start"><span className="h-6 w-6 shrink-0 rounded-full bg-rakt text-white text-xs font-bold flex items-center justify-center">2</span>{t("AI reads the patient name, hospital and blood group")}</li>
              <li className="flex gap-3 items-start"><span className="h-6 w-6 shrink-0 rounded-full bg-rakt text-white text-xs font-bold flex items-center justify-center">3</span>{t("Check the details and press")} <b>{t("Post")}</b></li>
            </ol>
            <button className="btn w-full mt-6 !py-4 text-base border-2 border-rakt bg-rakt/10 text-ink hover:bg-rakt hover:text-white font-semibold" onClick={() => { setF(EMPTY); setPlace(DEFAULT_PLACE); setFound(new Set()); }}><Keyboard className="ic" /> {t("No screenshot? Type the details instead")}</button>
          </>
        )}
        {reading && (
          <div className="py-16 text-center">
            <p className="font-display text-3xl">{t("Reading the screenshot…")}</p>
            <p className="text-sm text-muted mt-2">{t("Finding the patient name, hospital and blood group")}</p>
          </div>
        )}
        {f && !reading && (
          <>
            <h3 className="font-display text-3xl">{found.size ? <><Sparkles className="ic text-[#4fe3b2]" /> {`${t("AI found")} ${found.size} ${t("details")}`}</> : t("Enter the details")}</h3>
            <p className="text-sm text-muted mt-1">{found.size ? t("Check them. Fix anything that's wrong, then press Post.") : t("Fill in what you know.")}</p>
            {err && <p className="text-sm text-rakt mt-2">{err}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="Patient name" k="patient" f={f} setF={setF} found={found} wide />
              <label className="block">
                <span className="text-sm font-medium">Blood group {found.has("bloodGroup") && <Badge />}</span>
                <select className="input mt-1" value={f.bloodGroup} onChange={(e) => setF({ ...f, bloodGroup: e.target.value })}>
                  <option value="">{t("Choose")}</option>
                  {GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <Field label="Units needed" k="units" f={f} setF={setF} found={found} type="number" />
              <Field label="Hospital" k="hospital" f={f} setF={setF} found={found} wide />
              <Field label="Contact number" k="contact" f={f} setF={setF} found={found} />
              <div className="col-span-2"><PlacePicker value={place} onChange={setPlace} localityLabel="Hospital area" highlight={found.has("area")} /></div>
            </div>
            <button className="btn btn-primary w-full mt-6 !py-4 text-lg" disabled={posting || !f.patient || !f.bloodGroup || !f.hospital} onClick={post}>
              {posting ? t("Posting…") : <><Droplet className="ic" /> {t("Post request and alert donors")}</>}
            </button>
            {(!f.patient || !f.bloodGroup || !f.hospital) && <p className="text-xs text-muted mt-2 text-center">{t("Patient name, blood group and hospital are needed.")}</p>}
          </>
        )}
        {err && !f && <p className="text-sm text-rakt mt-3">{err}</p>}
      </div>
    </div>
  );
}

function Badge() {
  return <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-[#4fe3b2] bg-[#2fd39f]/10 rounded-full px-2 py-0.5"><Sparkles className="ic" /> AI</span>;
}

function Field({ label, k, f, setF, found, wide, type }: { label: string; k: keyof Fields; f: Fields; setF: (f: Fields) => void; found: Set<string>; wide?: boolean; type?: string }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="text-sm font-medium">{useT()(label)} {found.has(k) && <Badge />}</span>
      <input className={`input mt-1 ${found.has(k) ? "!border-[#2fd39f]/40 !bg-[#2fd39f]/5" : ""}`} type={type ?? "text"} min={type === "number" ? 1 : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
}
