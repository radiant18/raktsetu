"use client";
import { Droplet, Hospital, Paperclip, Sparkles, Receipt } from "lucide-react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BLOOD_GROUPS } from "@/lib/types";
import OtpInput from "@/components/OtpInput";
import { useT } from "@/components/Lang";
import PlacePicker, { DEFAULT_PLACE } from "@/components/PlacePicker";

const STEPS = ["Phone", "Code", "About you"] as const;

export default function LoginForm() {
  const router = useRouter();
  const t = useT();
  const next = useSearchParams().get("next") || "/me";
  const [step, setStep] = useState<"contact" | "code" | "profile">("contact");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState<string | null>(null);
  const [channel, setChannel] = useState("phone");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpState, setOtpState] = useState<"idle" | "error" | "success">("idle");
  const [p, setP] = useState({ name: "", role: "", bloodGroup: "", place: DEFAULT_PLACE, language: "en" });
  const [history, setHistory] = useState<"" | "first" | "before">("");
  const [cert, setCert] = useState<File | null>(null);
  const idx = step === "contact" ? 0 : step === "code" ? 1 : 2;
  const isEmail = contact.includes("@");

  async function post(url: string, body: object, method = "POST") {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      return j;
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); return null; } finally { setBusy(false); }
  }

  async function verify(c: string) {
    if (c.length !== 6 || busy) return;
    const j = await post("/api/auth/verify", { contact, code: c });
    if (!j) { setOtpState("error"); setTimeout(() => { setOtpState("idle"); setCode(""); }, 700); return; }
    setOtpState("success");
    setTimeout(() => { if (j.needsProfile) setStep("profile"); else { router.push(next); router.refresh(); } }, 650);
  }

  const missing = ([!p.name && "your name", !p.role && "donate or need blood", p.role === "donor" && !p.bloodGroup && "blood group", p.role === "donor" && !history && "donation history", !p.place.city && "city"].filter(Boolean) as string[]).map(t);

  return (
    <div className="card p-7 md:p-9 rise">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition ${i < idx ? "bg-pulse text-black" : i === idx ? "bg-rakt text-white" : "bg-mist text-muted"}`}>{i < idx ? "✓" : i + 1}</span>
            <span className={`text-xs font-medium ${i === idx ? "text-ink" : "text-muted"}`}>{t(s)}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < idx ? "bg-pulse" : "bg-line"}`} />}
          </div>
        ))}
      </div>

      {step === "contact" && (
        <form className="mt-8 space-y-5" onSubmit={async (e) => { e.preventDefault(); const j = await post("/api/auth/send", { contact }); if (j) { setDemo(j.demoCode ?? null); setChannel(j.channel); setStep("code"); } }}>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{t("Welcome to RaktSetu")}</h1>
            <p className="text-muted mt-2">{t("Sign in or create an account. Same steps for both.")}</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t("Mobile number")}</span>
            <div className="mt-1 flex items-stretch rounded-[14px] border border-line bg-[var(--surface)] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(232,19,47,.2)] transition">
              {!isEmail && <span className="pl-4 pr-3 flex items-center gap-1.5 whitespace-nowrap shrink-0 text-muted border-r border-line">+91</span>}
              <input className="flex-1 min-w-0 bg-transparent px-4 py-3.5 outline-none text-lg tracking-wide" autoFocus inputMode={isEmail ? "email" : "tel"} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98450 12345" />
            </div>
            <span className="text-xs text-muted mt-1.5 block">{t("or type your email instead")}</span>
          </label>
          <button className="btn btn-primary w-full !py-4 text-base" disabled={busy || contact.replace(/\D/g, "").length < (isEmail ? 0 : 10) || contact.length < 5}>{busy ? t("Sending code…") : t("Send code →")}</button>
          <p className="text-xs text-muted text-center">{t("We check every donor and family with a one-time code, so nobody can fake a request or a promise.")}</p>
          <p className="text-xs text-muted text-center">{t("By continuing you agree to our")} <a href="/terms" target="_blank" className="underline text-ink">{t("Terms and Conditions")}</a>.</p>
        </form>
      )}

      {step === "code" && (
        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); verify(code); }}>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{t("Verification Code")}</h1>
            <p className="text-muted mt-2">{t("Enter the 6-digit code sent to")} <b className="text-ink">{isEmail ? contact : `+91 ${contact.replace(/\D/g, "").slice(-10)}`}</b></p>
          </div>
          {demo && (
            <div className="rounded-2xl bg-[#f5c451]/10 border border-[#f5c451]/35 p-3 text-sm">
              <b className="text-[#f5c451]">{t("Demo mode:")}</b> {channel === "phone" ? "real SMS needs DLT registration in India, so" : "email isn't set up, so"} {t("your code is")}{" "}
              <button type="button" className="font-mono font-bold text-lg tracking-widest underline decoration-dotted" onClick={() => { setCode(demo); verify(demo); }}>{demo}</button> <span className="text-muted">{t("(tap to fill)")}</span>
            </div>
          )}
          <OtpInput value={code} onChange={(v) => { setCode(v); setErr(null); }} onComplete={verify} state={otpState} />
          <button className="btn btn-primary w-full !py-4 text-base" disabled={busy || code.length !== 6}>{otpState === "success" ? t("✓ Verified") : busy ? t("Checking…") : t("Verify")}</button>
          <div className="flex justify-between text-sm text-muted">
            <button type="button" className="underline" onClick={() => { setStep("contact"); setCode(""); setOtpState("idle"); }}>{t("← Change number")}</button>
            <button type="button" className="underline" disabled={busy} onClick={async () => { const j = await post("/api/auth/send", { contact }); if (j) { setDemo(j.demoCode ?? null); setCode(""); } }}>{t("Resend code")}</button>
          </div>
        </form>
      )}

      {step === "profile" && (
        <form className="mt-8 space-y-5" onSubmit={async (e) => { e.preventDefault(); if (missing.length) return; const j = await post("/api/me", { name: p.name, role: p.role || "donor", bloodGroup: p.bloodGroup, language: p.language, state: p.place.state, city: p.place.city, area: p.place.locality }, "PATCH"); if (!j) return;
            if (p.role === "donor" && history === "first") await post("/api/passport", { firstTime: true });
            if (p.role === "donor" && history === "before" && cert) {
              setBusy(true); setErr(null);
              const fd = new FormData(); fd.append("image", cert);
              const r = await fetch("/api/passport", { method: "POST", body: fd }).catch(() => null); const c = await r?.json().catch(() => null); setBusy(false);
              if (!r?.ok) { setErr(`${c?.error ?? "Couldn't read the certificate."} ${t("Try another photo, or skip it for now.")}`); setCert(null); return; }
            }
            router.push(next); router.refresh(); }}>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{t("Almost done")}</h1>
            <p className="text-muted mt-2">{t("Tell us a little about you.")}</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t("Full name")}</span>
            <input className="input mt-1" placeholder="e.g. Ramesh Rai" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          </label>
          <div>
            <span className="text-sm font-medium">{t("I am here to…")}</span>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {([["donor", Droplet, "Donate blood", "Get alerts when someone near you needs your group"], ["family", Hospital, "Find blood", "Post a request for a patient"]] as const).map(([v, Ic, ti, d]) => (
                <button type="button" key={v} onClick={() => setP({ ...p, role: v })}
                  className={`text-left rounded-2xl border p-4 transition ${p.role === v ? "border-rakt bg-rakt/10 shadow-[0_0_0_3px_rgba(232,19,47,.2)]" : "border-line bg-[var(--surface)] hover:border-ink/50"}`}>
                  <span className="h-10 w-10 rounded-xl bg-rakt/12 text-rakt flex items-center justify-center"><Ic className="h-5 w-5" /></span>
                  <p className="font-semibold mt-2">{t(ti)}</p>
                  <p className="text-xs text-muted mt-1 leading-snug">{t(d)}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">{t("Blood group")} {p.role === "family" && <span className="text-muted font-normal">{t("(optional)")}</span>}</span>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((g) => (
                <button type="button" key={g} onClick={() => setP({ ...p, bloodGroup: p.bloodGroup === g ? "" : g })}
                  className={`rounded-xl border py-2.5 font-display text-lg transition ${p.bloodGroup === g ? "border-rakt bg-rakt text-white scale-105" : "border-line bg-[var(--surface)] hover:border-ink/50"}`}>{g}</button>
              ))}
            </div>
          </div>
          {p.role === "donor" && (
            <div>
              <span className="text-sm font-medium">{t("Have you donated blood before?")}</span>
              <div className="mt-1 grid grid-cols-2 gap-3">
                {([["first", Sparkles, "First time", "No certificate needed"], ["before", Receipt, "Donated before", "Upload your last certificate"]] as const).map(([v, Ic, ti, d]) => (
                  <button type="button" key={v} onClick={() => setHistory(v)}
                    className={`text-left rounded-2xl border p-4 transition ${history === v ? "border-rakt bg-rakt/10 shadow-[0_0_0_3px_rgba(232,19,47,.2)]" : "border-line bg-[var(--surface)] hover:border-ink/50"}`}>
                    <Ic className="h-5 w-5 text-rakt" />
                    <p className="font-semibold mt-2">{t(ti)}</p>
                    <p className="text-xs text-muted mt-1 leading-snug">{t(d)}</p>
                  </button>
                ))}
              </div>
              {history === "before" && (
                <div className="mt-3 rounded-2xl border border-line p-4">
                  <p className="text-sm text-muted">{t("A photo of the certificate or the blood bank SMS. We read the date so we only alert you when it's safe to donate again (90 days).")}</p>
                  <label className="btn btn-ghost text-sm cursor-pointer mt-3 w-full"><Paperclip className="ic" /> {cert ? cert.name : t("Choose photo")}<input type="file" accept="image/*" className="hidden" onChange={(e) => setCert(e.target.files?.[0] ?? null)} /></label>
                  <p className="text-xs text-muted mt-2">{t("Don't have it handy? You can add it later from your profile.")}</p>
                </div>
              )}
            </div>
          )}
          <PlacePicker value={p.place} onChange={(place) => setP({ ...p, place })} />
          <div>
            <label className="block">
              <span className="text-sm font-medium">{t("Alert language")}</span>
              <select className="input mt-1" value={p.language} onChange={(e) => setP({ ...p, language: e.target.value })}>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="kn">ಕನ್ನಡ</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary w-full !py-4 text-base" disabled={busy || missing.length > 0}>{busy ? t("Saving…") : missing.length ? `${t("Add")} ${missing[0]}` : t("Finish →")}</button>
        </form>
      )}
      {err && <p className="text-sm text-rakt mt-4">{err}</p>}
    </div>
  );
}
