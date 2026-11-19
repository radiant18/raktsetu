"use client";
import { Download, Mic, Square } from "lucide-react";
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

  // Push-to-talk: recording runs only while the button is held down.
  const held = useRef(false);
  const finalText = useRef("");

  function start() {
    if (held.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return setSupported(false);
    held.current = true;
    finalText.current = text ? text.trim() + " " : "";
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: Rec) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText.current += t + " "; else interim += t;
      }
      setText((finalText.current + interim).trim());
    };
    r.onerror = (e: Rec) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // silence while holding is fine
      held.current = false;
      setListening(false);
      setErr(e.error === "not-allowed" ? "Microphone permission was blocked. Allow it in the address bar and try again." : "Couldn't hear clearly. Try again or type it.");
    };
    // Browsers end recognition after a pause; keep going while the button is still held.
    r.onend = () => {
      if (held.current) { try { r.start(); } catch { /* already restarting */ } }
      else setListening(false);
    };
    rec.current = r;
    setErr(null);
    setListening(true);
    try { r.start(); } catch { /* ignore double start */ }
  }

  function stop() {
    if (!held.current) return;
    held.current = false;
    try { rec.current?.stop(); } catch { /* not started yet */ }
    setListening(false);
  }

  // Spacebar = push-to-talk anywhere on the page (except while typing in a text box).
  useEffect(() => {
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault(); // no page scroll / button click
      if (!e.repeat) start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault();
      stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  });

  useEffect(() => {
    const off = () => stop();
    window.addEventListener("blur", off);
    document.addEventListener("visibilitychange", off);
    return () => { window.removeEventListener("blur", off); document.removeEventListener("visibilitychange", off); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <p className="chip bg-[#2fd39f]/10 text-[#4fe3b2]">● Live now</p>
          <h2 className="font-display text-5xl mt-3">Your request is live.</h2>
          <p className="text-muted mt-2">{made.units} unit{made.units > 1 ? "s" : ""} of <b className="text-ink">{made.bloodGroup}</b> at {made.hospital}. Compatible donors nearby are being alerted in their language.</p>
          <p className="text-sm mt-4">Share the <b>verified poster</b> instead of typing a forward. Its QR code always shows the live status — and it switches to <b>FULFILLED</b> the moment you close it, so it can never go stale.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/r/${made.id}`} className="btn btn-primary">Open control room →</Link>
            <a href={`/r/${made.id}/poster`} download={`raktsetu-${made.bloodGroup}.png`} className="btn btn-ghost"><Download className="ic" /> Download poster</a>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/r/${made.id}/poster`} alt="Verified poster" className="w-full rounded-2xl shadow-2xl border border-line" />
      </div>
    );
  }

  return (
    <div className="card p-7 md:p-10">
      <div className="flex flex-wrap gap-2">
        {LANGS.map(([code, label]) => (
          <button key={code} onClick={() => setLang(code)} className={`chip !px-4 !py-2 text-sm border ${lang === code ? "bg-white text-black border-white" : "bg-[#141414] border-line"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center text-center">
        <button
          type="button"
          disabled={!supported}
          onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start(); }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.repeat) { e.preventDefault(); start(); } }}
          onKeyUp={(e) => { if (e.key === "Enter") { e.preventDefault(); stop(); } }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
          className={`relative h-36 w-36 rounded-full flex items-center justify-center text-white transition select-none ${listening ? "bg-rakt scale-110 shadow-[0_0_0_10px_rgba(232,19,47,.18)]" : "bg-[#1c1c1c] hover:bg-[#2a0a0e] active:scale-95"}`}
          aria-pressed={listening}
          aria-label="Hold to talk">
          {listening && <span className="ripple absolute inset-0 rounded-full" />}
          <span className="relative">{listening ? <Square className="h-10 w-10 fill-current" /> : <Mic className="h-12 w-12" />}</span>
        </button>
        <p className="mt-5 font-semibold flex items-center gap-2 justify-center">
          {listening ? <>Listening… release <kbd className="kbd">Space</kbd> to stop</> : <>Hold <kbd className="kbd">Space</kbd> to talk</>}
        </p>
        <p className="text-xs text-muted mt-1">On a phone: press and hold the mic button.</p>
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
