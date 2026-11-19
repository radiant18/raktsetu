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
        <h2 className="font-display text-3xl">Verify your donor passport</h2>
        <p className="text-sm text-muted mt-1">Upload a screenshot of your last donation certificate or the blood bank&apos;s SMS. We read the date so you&apos;re only alerted when it&apos;s safe for you to donate.</p>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-[#0b7a5c]" : "text-rakt"}`}>{msg.t}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <input type="file" accept="image/*" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn btn-primary" disabled={!file || busy} onClick={async () => {
          setBusy(true); setMsg(null);
          const fd = new FormData(); fd.append("image", file!);
          const r = await fetch("/api/passport", { method: "POST", body: fd }); const j = await r.json(); setBusy(false);
          if (!r.ok) return setMsg({ ok: false, t: j.error });
          setMsg({ ok: true, t: `${j.note} ${j.eligible ? "You can donate today." : `Eligible again in ${j.daysLeft} days.`}` });
          router.refresh();
        }}>{busy ? "Reading…" : "Verify passport"}</button>
      </div>
    </section>
  );
}
