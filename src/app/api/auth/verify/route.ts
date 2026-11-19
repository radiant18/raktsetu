import { NextResponse } from "next/server";
import { hashCode, normaliseContact, startSession } from "@/lib/auth";
import { mutate, uid } from "@/lib/db";

export async function POST(req: Request) {
  const { contact: raw, code } = (await req.json().catch(() => ({}))) as { contact?: string; code?: string };
  const n = normaliseContact(raw ?? "");
  if (!n || !code) return NextResponse.json({ error: "Missing code." }, { status: 400 });
  const out = await mutate((db) => {
    const o = db.otps.find((x) => x.contact === n.contact && x.expires > Date.now());
    if (!o) return { error: "Code expired. Ask for a new one." };
    if (o.attempts >= 5) return { error: "Too many wrong attempts. Ask for a new code." };
    if (o.codeHash !== hashCode(n.contact, code.trim())) {
      o.attempts += 1;
      return { error: `Wrong code. ${5 - o.attempts} tries left.` };
    }
    db.otps = db.otps.filter((x) => x !== o);
    let user = db.users.find((u) => u.contact === n.contact);
    const isNew = !user;
    if (!user) {
      user = {
        id: uid("u_"), contact: n.contact, name: "", role: "donor", bloodGroup: null, area: "", lat: 12.9716, lng: 77.5946,
        language: "en", trust: 50, donations: 0, noShows: 0, lastDonation: null, passportVerified: false, blocked: false, createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    }
    return { userId: user.id, needsProfile: isNew || !user.name };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  await startSession(out.userId);
  return NextResponse.json({ ok: true, needsProfile: out.needsProfile });
}
