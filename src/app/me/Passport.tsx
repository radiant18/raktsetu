"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Passport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <section className="mt-6 card p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
      <div>
        <h2 className="font-display text-3xl">🧾 Upload your last donation certificate</h2>
        <p className="text-sm text-muted mt-1">A photo of the certificate or the blood bank SMS. We read the date, so we only ask you when it is safe for you to donate again (90 days). It also raises your trust score.</p>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-[#0b7a5c]" : "text-rakt"}`}>{msg.t}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <label className="btn btn-ghost text-sm cursor-pointer">📎 {file ? file.name : "Choose photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <button className="btn btn-primary" disabled={!file || busy} onClick={async () => {
          setBusy(true); setMsg(null);
          const fd = new FormData(); fd.append("image", file!);
          const r = await fetch("/api/passport", { method: "POST", body: fd }); const j = await r.json(); setBusy(false);
          if (!r.ok) return setMsg({ ok: false, t: j.error });
          setMsg({ ok: true, t: `${j.note} ${j.eligible ? "You can donate today." : `Eligible again in ${j.daysLeft} days.`}` });
          router.refresh();
        }}>{busy ? "Reading…" : "Upload and check"}</button>
      </div>
    </section>
  );
}
