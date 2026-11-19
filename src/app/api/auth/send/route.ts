import { NextResponse } from "next/server";
import { deliverOtp, hashCode, newOtp, normaliseContact } from "@/lib/auth";
import { mutate } from "@/lib/db";

export async function POST(req: Request) {
  const { contact: raw } = (await req.json().catch(() => ({}))) as { contact?: string };
  const n = normaliseContact(raw ?? "");
  if (!n) return NextResponse.json({ error: "Enter a valid email or 10-digit Indian mobile number." }, { status: 400 });
  const code = newOtp();
  const limited = await mutate((db) => {
    db.otps = db.otps.filter((o) => o.expires > Date.now());
    const prev = db.otps.find((o) => o.contact === n.contact);
    if (prev && prev.expires - Date.now() > 9 * 60 * 1000) return true; // one code per minute
    db.otps = db.otps.filter((o) => o.contact !== n.contact);
    db.otps.push({ contact: n.contact, codeHash: hashCode(n.contact, code), expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
    return false;
  });
  if (limited) return NextResponse.json({ error: "A code was just sent. Wait a minute before asking again." }, { status: 429 });
  const d = await deliverOtp(n.contact, n.kind, code);
  return NextResponse.json({ ok: true, contact: n.contact, delivered: d.delivered, demoCode: d.demoCode, channel: n.kind });
}
