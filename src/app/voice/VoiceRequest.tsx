"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Lang = "kn-IN" | "hi-IN" | "en-IN";
const LANGS: [Lang, string, string][] = [
  ["kn-IN", "ಕನ್ನಡ", "ಬಿ ಪಾಸಿಟಿವ್ ರಕ್ತ ಬೇಕು, ಎರಡು ಯುನಿಟ್, ಮಣಿಪಾಲ್ ಆಸ್ಪತ್ರೆ…"],
  ["hi-IN", "हिंदी", "बी पॉज़िटिव खून चाहिए, दो यूनिट, मणिपाल हॉस्पिटल…"],
  ["en-IN", "English", "Need B positive blood, two units, Manipal Hospital…"],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;

export default function VoiceRequest({ signedIn }: { signedIn: boolean }) {
  const [lang, setLang] = useState<Lang>("hi-IN");
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<{ id: string; bloodGroup: string; hospital: string; units: number } | null>(null);
  const rec = useRef<Rec>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) setSupported(false);
  }, []);

  function toggle() {
    if (listening) { rec.current?.stop(); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return setSupported(false);
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    let finalText = text ? text + " " : "";
    r.onresult = (e: Rec) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " "; else interim += t;
      }
      setText((finalText + interim).trim());
    };
    r.onerror = (e: Rec) => { setErr(e.error === "not-allowed" ? "Microphone permission was blocked." : "Couldn't hear clearly. Try again or type it."); setListening(false); };
    r.onend = () => setListening(false);
    rec.current = r;
    setErr(null);
    setListening(true);
    r.start();
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: text, lang }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const r = j.request;
      setMade({ id: r.id, bloodGroup: r.bloodGroup, hospital: r.hospital, units: r.units });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  if (made) {
    return (
      <div className="grid md:grid-cols-2 gap-6 items-start rise">
        <div className="card p-7">
          <p className="chip bg-[#eafaf4] text-[#0b7a5c]">● Live now</p>
          <h2 className="font-display text-5xl mt-3">Your request is live.</h2>
          <p className="text-muted mt-2">{made.units} unit{made.units > 1 ? "s" : ""} of <b className="text-ink">{made.bloodGroup}</b> at {made.hospital}. Compatible donors nearby are being alerted in their language.</p>
          <p className="text-sm mt-4">Share the <b>verified poster</b> instead of typing a forward. Its QR code always shows the live status — and it switches to <b>FULFILLED</b> the moment you close it, so it can never go stale.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/r/${made.id}`} className="btn btn-primary">Open control room →</Link>
            <a href={`/r/${made.id}/poster`} download={`raktsetu-${made.bloodGroup}.png`} className="btn btn-ghost">⬇ Download poster</a>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/r/${made.id}/poster`} alt="Verified poster" className="w-full rounded-md shadow-2xl border border-line" />
      </div>
    );
  }

  return (
    <div className="card p-7 md:p-10">
      <div className="flex flex-wrap gap-2">
        {LANGS.map(([code, label]) => (
          <button key={code} onClick={() => setLang(code)} className={`chip !px-4 !py-2 text-sm border ${lang === code ? "bg-ink text-white border-ink" : "bg-white border-line"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center text-center">
        <button onClick={toggle} disabled={!supported} className={`relative h-36 w-36 rounded-full flex items-center justify-center text-5xl text-white transition ${listening ? "bg-rakt scale-105" : "bg-ink hover:bg-rakt"}`} aria-label={listening ? "Stop recording" : "Start recording"}>
          {listening && <span className="ripple absolute inset-0 rounded-full" />}
          <span className="relative">{listening ? "■" : "🎙️"}</span>
        </button>
        <p className="mt-5 font-semibold">{listening ? "Listening… tap to stop" : "Tap and speak"}</p>
        <p className="text-sm text-muted mt-1 max-w-md">Say the blood group, how many units, the hospital and the patient&apos;s name. For example: <i>&ldquo;{LANGS.find((l) => l[0] === lang)?.[2]}&rdquo;</i></p>
        {!supported && <p className="text-sm text-rakt mt-3">Voice input needs Chrome or Edge. You can type below instead.</p>}
      </div>

      <textarea className="input mt-8 min-h-28" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your words appear here — you can also type or correct them." />
      {err && <p className="text-sm text-rakt mt-2">{err}</p>}
      {signedIn ? (
        <button className="btn btn-primary w-full mt-4" disabled={busy || text.trim().length < 8} onClick={submit}>{busy ? "Creating your request…" : "Create live request + verified poster"}</button>
      ) : (
        <Link href="/login?next=/voice" className="btn btn-primary w-full mt-4">Verify with OTP to post a request</Link>
      )}
      <p className="text-xs text-muted mt-3 text-center">Only OTP-verified families can post. Fake requests can be reported and are hidden after 3 reports.</p>
    </div>
  );
}
