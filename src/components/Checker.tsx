"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BloodRequest, Extracted } from "@/lib/types";

type Verdict = "created" | "active" | "duplicate" | "stale" | "fulfilled" | "flagged" | "not_a_request" | "unverified";
interface Result { verdict: Verdict; request: BloodRequest | null; extracted: Extracted; reasons: string[] }

const LOOK: Record<Verdict, { tone: string; dot: string; title: string; sub: string }> = {
  created: { tone: "bg-[#eafaf4] border-[#9fe3cb]", dot: "bg-pulse", title: "✅ Real request, now live", sub: "We are alerting donors with a matching blood group nearby. Open it to see who is coming." },
  active: { tone: "bg-[#eafaf4] border-[#9fe3cb]", dot: "bg-pulse", title: "✅ Still needed", sub: "This request is active. If you can donate, open it and say yes." },
  unverified: { tone: "bg-[#fff7e6] border-[#f5d48a]", dot: "bg-[#e0a100]", title: "⚠️ Live, but please double-check", sub: "Something looks off (see below). Call the number before you go." },
  duplicate: { tone: "bg-[#eef3ff] border-[#b9cbf5]", dot: "bg-[#3b6fe0]", title: "🔁 Already posted", sub: "Someone already shared this same request. We joined them into one, so donors don't get it twice." },
  stale: { tone: "bg-[#f4f1ef] border-line", dot: "bg-muted", title: "⌛ Old message", sub: "This is more than 5 days old. It is probably not needed any more. Please don't forward it." },
  fulfilled: { tone: "bg-[#fdecef] border-[#f3b3be]", dot: "bg-rakt", title: "🛑 Already done. Stop forwarding.", sub: "This patient already got the blood. Forwarding it now only wastes donors' time." },
  flagged: { tone: "bg-[#fdecef] border-[#f3b3be]", dot: "bg-rakt", title: "🚨 Possible scam", sub: "Real blood requests never ask for money. Do not pay anyone." },
  not_a_request: { tone: "bg-[#f4f1ef] border-line", dot: "bg-muted", title: "🤔 Not a blood request", sub: "We couldn't find a blood request in this picture. Try a clearer screenshot." },
};

export default function Checker() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File | null | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  }, []);

  // Paste a screenshot straight from the clipboard (Cmd/Ctrl+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => pick(Array.from(e.clipboardData?.files ?? [])[0]);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pick]);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/check", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setResult(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const look = result ? LOOK[result.verdict] : null;
  const r = result?.request;
  const x = result?.extracted;

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        onClick={() => input.current?.click()}
        className={`card relative overflow-hidden cursor-pointer min-h-[340px] flex items-center justify-center transition ${drag ? "ring-4 ring-rakt/20 border-rakt" : ""}`}
      >
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        {preview ? (
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Uploaded forward" className="max-h-[420px] rounded-xl object-contain shadow-lg" />
            {busy && <div className="scanline" />}
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-mist flex items-center justify-center text-2xl">📸</div>
            <p className="text-xs uppercase tracking-[.2em] text-muted mb-1">Step 1</p><p className="font-semibold">Tap here to add the screenshot</p>
            <p className="text-sm text-muted mt-1">or drag it here · or paste with Ctrl/⌘ + V</p>
            <p className="text-xs text-muted mt-4">Posters, WhatsApp chats, Instagram stories — any language</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {!result && (
          <div className="card p-6 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-muted">Step 2</p>
              <h3 className="font-display text-3xl mt-2">Press the button to check</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">We read the blood group, hospital and date from the picture and tell you: is it real and still needed, already posted, already done, too old, or a scam?</p>
            </div>
            <button onClick={run} disabled={!file || busy} className="btn btn-primary mt-6 w-full">
              {busy ? "Reading screenshot…" : file ? "Check this message" : "Step 1: add a screenshot (left)"}
            </button>
            {error && <p className="text-sm text-rakt mt-3">{error}</p>}
          </div>
        )}

        {result && look && (
          <div className={`rise rounded-[20px] border p-6 ${look.tone}`}>
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${look.dot}`} />
              <p className="text-xs uppercase tracking-[.2em] font-semibold">Result</p>
            </div>
            <h3 className="font-display text-4xl mt-2 leading-tight">{look.title}</h3>
            <p className="mt-1 text-sm">{look.sub}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {result.reasons.map((s) => <li key={s}>• {s}</li>)}
            </ul>
            {x && x.isBloodRequest && (
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Fact k="Blood" v={x.bloodGroup ?? "?"} big />
                <Fact k="Units" v={String(x.units)} big />
                <Fact k="Date" v={x.postedOn ?? "unknown"} />
                <Fact k="Hospital" v={x.hospital ?? "—"} wide />
                <Fact k="Patient" v={x.patient ?? "—"} />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {r && <Link href={`/r/${r.id}`} className="btn btn-dark">Open this request →</Link>}
              <button onClick={() => { setResult(null); setFile(null); setPreview(null); }} className="btn btn-ghost">Check another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ k, v, big, wide }: { k: string; v: string; big?: boolean; wide?: boolean }) {
  return (
    <div className={`bg-white/70 rounded-xl p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted">{k}</p>
      <p className={`${big ? "text-2xl font-bold" : "text-sm font-semibold"} truncate`}>{v}</p>
    </div>
  );
}
