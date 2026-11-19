import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { REPORTS_TO_HIDE } from "@/lib/blood";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in to report." }, { status: 401 });
  const out = await mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r) return { error: "Not found." };
    if (r.createdBy === uidv) return { error: "You can't report your own request." };
    if (!r.reports.includes(uidv)) r.reports.push(uidv);
    if (r.reports.length >= REPORTS_TO_HIDE && r.status === "active") r.status = "flagged";
    return { ok: true, reports: r.reports.length, hidden: r.status === "flagged" };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
