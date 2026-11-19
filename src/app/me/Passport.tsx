"use client";
import { Paperclip, Receipt, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Passport({ firstTimer = false }: { firstTimer?: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const setFirst = async (v: boolean) => {
    setBusy(true);
    await fetch("/api/passport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstTime: v }) });
    setBusy(false); router.refresh();
  };
  if (firstTimer) return (
    <section className="mt-6 card p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl"><Sparkles className="inline h-6 w-6 text-rakt -mt-1" /> First-time donor</h2>
        <p className="text-sm text-muted mt-1">No certificate needed. You can donate today. After your first donation, upload the certificate here.</p>
      </div>
      <button className="text-sm underline text-muted" disabled={busy} onClick={() => setFirst(false)}>I have donated before</button>
    </section>
  );
  return (
    <section className="mt-6 card p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
      <div>
        <h2 className="font-display text-3xl"><Receipt className="inline h-7 w-7 text-rakt -mt-1" /> Upload your last donation certificate</h2>
        <p className="text-sm text-muted mt-1">A photo of the certificate or the blood bank SMS. We read the date, so we only ask you when it is safe for you to donate again (90 days). It also raises your trust score.</p>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-[#4fe3b2]" : "text-rakt"}`}>{msg.t}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <label className="btn btn-ghost text-sm cursor-pointer"><Paperclip className="ic" /> {file ? file.name : "Choose photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <button className="btn btn-primary" disabled={!file || busy} onClick={async () => {
          setBusy(true); setMsg(null);
          const fd = new FormData(); fd.append("image", file!);
          const r = await fetch("/api/passport", { method: "POST", body: fd }); const j = await r.json(); setBusy(false);
          if (!r.ok) return setMsg({ ok: false, t: j.error });
          setMsg({ ok: true, t: `${j.note} ${j.eligible ? "You can donate today." : `Eligible again in ${j.daysLeft} days.`}` });
          router.refresh();
        }}>{busy ? "Reading…" : "Upload and check"}</button>
      </div>
      <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border-2 border-rakt/50 bg-rakt/10 px-4 py-3 cursor-pointer hover:border-rakt transition">
        <input type="checkbox" className="h-5 w-5 accent-[#e8132f]" disabled={busy} onChange={(e) => e.target.checked && setFirst(true)} />
        <span><b>This is my first time donating</b> <span className="text-muted text-sm">· I don&apos;t have a certificate yet, skip this</span></span>
      </label>
    </section>
  );
}
