import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { penaliseNoShow } from "@/lib/blood";

// The family (request owner) can release a donor who never came, or a donor can cancel their own promise.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { donorId } = (await req.json().catch(() => ({}))) as { donorId?: string };
  const out = await mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r) return { error: "Not found." };
    const target = donorId ?? uidv;
    const a = r.acceptances.find((x) => x.donorId === target && x.status === "on_the_way");
    if (!a) return { error: "No active promise to release." };
    if (target === uidv) {
      a.status = "released"; // cancelled honestly by the donor: small trust cost only
      const u = db.users.find((x) => x.id === uidv);
      if (u) u.trust = Math.max(0, u.trust - 5);
      return { ok: true, kind: "cancelled" };
    }
    if (r.createdBy !== uidv) return { error: "Only the family who posted this request can mark a no-show." };
    a.status = "no_show";
    penaliseNoShow(db.users, target);
    return { ok: true, kind: "no_show" };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
