import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { readDB } from "@/lib/db";

// A verified, shareable poster (PNG) whose QR always opens the live status page.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const r = db.requests.find((x) => x.id === id);
  if (!r) return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const url = `${origin}/r/${r.id}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 420, color: { dark: "#140a0c", light: "#ffffff" } });
  const done = r.status === "fulfilled";
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: "flex", flexDirection: "column", background: done ? "#140a0c" : "#c8102e", color: "white", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>RaktSetu</div>
          <div style={{ display: "flex", fontSize: 28, background: "rgba(255,255,255,.18)", padding: "12px 24px", borderRadius: 999 }}>{done ? "FULFILLED · STOP FORWARDING" : "VERIFIED REQUEST"}</div>
        </div>
        <div style={{ display: "flex", fontSize: 46, marginTop: 80, opacity: 0.9 }}>{done ? "This request is complete" : "URGENT · blood needed"}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginTop: 10 }}>
          <div style={{ display: "flex", fontSize: 260, fontWeight: 800, lineHeight: 1 }}>{r.bloodGroup ?? "?"}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 54, marginBottom: 28 }}>
            <div style={{ display: "flex" }}>{r.units} unit{r.units > 1 ? "s" : ""}</div>
            <div style={{ display: "flex", fontSize: 34, opacity: 0.8 }}>{r.component}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 44, gap: 12 }}>
          <div style={{ display: "flex" }}>{r.hospital ?? "Hospital"}{r.area ? `, ${r.area}` : ""}</div>
          {r.patient ? <div style={{ display: "flex" }}>Patient: {r.patient}</div> : null}
        </div>
        <div style={{ display: "flex", marginTop: "auto", background: "white", color: "#140a0c", borderRadius: 40, padding: 40, alignItems: "center", gap: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={260} height={260} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>Scan before you go</div>
            <div style={{ display: "flex", fontSize: 30, color: "#6f5f5c", maxWidth: 560 }}>Live status, units still needed and the family verified contact. Never pay anyone for blood.</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
