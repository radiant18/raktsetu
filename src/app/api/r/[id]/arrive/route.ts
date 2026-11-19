import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";

// The donor types the 4-digit code the family gives them at the hospital. Proves they actually came.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const out = await mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    const u = db.users.find((x) => x.id === uidv);
    const a = r?.acceptances.find((x) => x.donorId === uidv && x.status === "on_the_way");
    if (!r || !u || !a) return { error: "No active promise found for you on this request." };
    if ((code ?? "").trim() !== a.code) return { error: "That code doesn't match. Ask the family for the code shown on their screen." };
    a.status = "arrived";
    a.arrivedAt = new Date().toISOString();
    r.unitsArranged = Math.min(r.units, r.unitsArranged + 1);
    u.trust = Math.min(100, u.trust + 10);
    u.donations += 1;
    u.lastDonation = new Date().toISOString();
    return { ok: true, unitsArranged: r.unitsArranged };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
