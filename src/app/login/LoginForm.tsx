"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BLOOD_GROUPS } from "@/lib/types";
import OtpInput from "@/components/OtpInput";

export default function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/me";
  const [step, setStep] = useState<"contact" | "code" | "profile">("contact");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState<string | null>(null);
  const [channel, setChannel] = useState("email");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpState, setOtpState] = useState<"idle" | "error" | "success">("idle");
  const [p, setP] = useState({ name: "", role: "donor", bloodGroup: "", area: "", language: "en" });

  async function post(url: string, body: object, method = "POST") {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      return j;
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); return null; } finally { setBusy(false); }
  }

  return (
    <div className="card p-8">
      <p className="text-xs uppercase tracking-[.2em] text-muted">Verified accounts only</p>
      <h1 className="font-display text-4xl mt-2">{step === "profile" ? "Tell us about you" : "Sign in to RaktSetu"}</h1>

      {step === "contact" && (
        <form className="mt-6 space-y-3" onSubmit={async (e) => { e.preventDefault(); const j = await post("/api/auth/send", { contact }); if (j) { setDemo(j.demoCode ?? null); setChannel(j.channel); setStep("code"); } }}>
          <label className="text-sm font-medium">Mobile number or email</label>
          <input className="input" autoFocus value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98xxxxxxxx or you@email.com" />
          <button className="btn btn-primary w-full" disabled={busy || contact.length < 5}>{busy ? "Sending…" : "Send one-time code"}</button>
          <p className="text-xs text-muted">We verify every donor and family so nobody can fake a request or a promise.</p>
        </form>
      )}

      {step === "code" && (() => {
        const verify = async (c: string) => {
          if (c.length !== 6 || busy) return;
          const j = await post("/api/auth/verify", { contact, code: c });
          if (!j) { setOtpState("error"); setTimeout(() => { setOtpState("idle"); setCode(""); }, 700); return; }
          setOtpState("success");
          setTimeout(() => { if (j.needsProfile) setStep("profile"); else { router.push(next); router.refresh(); } }, 650);
        };
        return (
          <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); verify(code); }}>
            <div>
              <p className="font-display text-2xl">Verification Code</p>
              <p className="text-sm text-muted mt-1">Enter the 6-digit code sent to <b className="text-ink">{contact}</b></p>
            </div>
            {demo && (
              <div className="rounded-2xl bg-[#fff7e6] border border-[#f5d48a] p-3 text-sm">
                <b>Prototype mode:</b> {channel === "phone" ? "SMS needs a DLT-registered sender in India, so" : "email isn't configured, so"} your code is: <button type="button" className="font-mono font-bold text-lg tracking-widest underline decoration-dotted" onClick={() => { setCode(demo); verify(demo); }}>{demo}</button> <span className="text-muted">(tap to fill)</span>
              </div>
            )}
            <OtpInput value={code} onChange={(v) => { setCode(v); setErr(null); }} onComplete={verify} state={otpState} />
            <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{otpState === "success" ? "✓ Verified" : busy ? "Checking…" : "Verify"}</button>
            <button type="button" className="text-sm text-muted underline" onClick={() => { setStep("contact"); setCode(""); setOtpState("idle"); }}>Use a different number</button>
          </form>
        );
      })()}

      {step === "profile" && (
        <form className="mt-6 space-y-3" onSubmit={async (e) => { e.preventDefault(); const j = await post("/api/me", p, "PATCH"); if (j) { router.push(next); router.refresh(); } }}>
          <input className="input" placeholder="Full name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            {[["donor", "🩸 I want to donate"], ["family", "🏥 I need blood"]].map(([v, l]) => (
              <button type="button" key={v} onClick={() => setP({ ...p, role: v })} className={`rounded-2xl border p-3 text-sm font-medium ${p.role === v ? "border-rakt bg-rakt/5" : "border-line bg-white"}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((g) => (
              <button type="button" key={g} onClick={() => setP({ ...p, bloodGroup: g })} className={`rounded-xl border py-2 font-bold ${p.bloodGroup === g ? "border-rakt bg-rakt text-white" : "border-line bg-white"}`}>{g}</button>
            ))}
          </div>
          <input className="input" placeholder="Your area (e.g. Koramangala)" value={p.area} onChange={(e) => setP({ ...p, area: e.target.value })} />
          <select className="input" value={p.language} onChange={(e) => setP({ ...p, language: e.target.value })}>
            <option value="en">Alerts in English</option>
            <option value="hi">अलर्ट हिंदी में</option>
            <option value="kn">ಕನ್ನಡದಲ್ಲಿ ಎಚ್ಚರಿಕೆಗಳು</option>
          </select>
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Continue"}</button>
        </form>
      )}
      {err && <p className="text-sm text-rakt mt-3">{err}</p>}
    </div>
  );
}
