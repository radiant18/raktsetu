import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { readDonationProof } from "@/lib/ai";
import { mutate } from "@/lib/db";
import { eligibility, normaliseGroup } from "@/lib/blood";

export const maxDuration = 60;

// Donor passport: screenshot of a donation certificate / blood bank SMS sets the last donation date.
export async function POST(req: Request) {
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if ((req.headers.get("content-type") || "").includes("application/json")) {
    const b = (await req.json().catch(() => ({}))) as { firstTime?: boolean };
    const u = await mutate((db) => {
      const x = db.users.find((y) => y.id === uidv);
      if (x) { x.firstTimer = Boolean(b.firstTime); if (x.firstTimer) x.lastDonation = null; }
      return x;
    });
    if (!u) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ ok: true, firstTimer: u.firstTimer });
  }
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a screenshot." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const p = await readDonationProof(buf.toString("base64"), file.type || "image/jpeg");
  if (!p.isDonationProof) return NextResponse.json({ error: "That doesn't look like a donation certificate or blood bank SMS. " + p.note }, { status: 400 });
  const out = await mutate((db) => {
    const u = db.users.find((x) => x.id === uidv);
    if (!u) return { error: "Account not found." };
    const g = normaliseGroup(p.bloodGroup);
    if (g && u.bloodGroup && g !== u.bloodGroup) return { error: `Certificate says ${g}, your profile says ${u.bloodGroup}. Please fix your profile.` };
    if (g && !u.bloodGroup) u.bloodGroup = g;
    if (p.donationDate && !isNaN(new Date(p.donationDate).getTime()) && new Date(p.donationDate).getTime() <= Date.now()) {
      if (!u.lastDonation || new Date(p.donationDate) > new Date(u.lastDonation)) u.lastDonation = new Date(p.donationDate).toISOString();
    }
    u.passportVerified = true;
    u.trust = Math.min(100, u.trust + 10);
    const e = eligibility(u);
    return { ok: true, lastDonation: u.lastDonation, bloodGroup: u.bloodGroup, eligible: e.ok, daysLeft: e.daysLeft, note: p.note };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
