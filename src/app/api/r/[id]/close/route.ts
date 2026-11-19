import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { readIssueSlip } from "@/lib/ai";
import { normaliseGroup } from "@/lib/blood";

export const maxDuration = 60;

// Close a request with a screenshot of the blood bank issue slip (verified), or by the family without proof.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("image");
  let slip: Awaited<ReturnType<typeof readIssueSlip>> | null = null;
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    slip = await readIssueSlip(buf.toString("base64"), file.type || "image/jpeg");
    if (!slip.isIssueSlip) return NextResponse.json({ error: "That doesn't look like a blood bank issue slip. " + slip.note }, { status: 400 });
  }
  const out = await mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r) return { error: "Not found." };
    if (!slip && r.createdBy !== uidv) return { error: "Only the family can close without proof. Upload the blood bank slip instead." };
    if (slip) {
      const g = normaliseGroup(slip.bloodGroup);
      if (g && r.bloodGroup && g !== r.bloodGroup && !(r.bloodGroup.startsWith("AB") || g.startsWith("O"))) return { error: `Slip shows ${g}, request was for ${r.bloodGroup}.` };
      r.unitsArranged = Math.max(r.unitsArranged, Math.min(r.units, (r.unitsArranged || 0) + (slip.units || 0)));
    }
    if (slip && r.unitsArranged < r.units) {
      return { ok: true, closed: false, unitsArranged: r.unitsArranged, note: slip.note };
    }
    r.status = "fulfilled";
    r.verified = Boolean(slip);
    r.closedAt = new Date().toISOString();
    r.closureNote = slip?.note ?? "Marked done by the family.";
    for (const a of r.acceptances) if (a.status === "on_the_way") a.status = "released";
    return { ok: true, closed: true, verified: r.verified };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
