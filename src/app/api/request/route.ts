import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { checkForward } from "@/lib/check";
import { mutate } from "@/lib/db";
import { normaliseGroup } from "@/lib/blood";
import type { Extracted } from "@/lib/types";

export const maxDuration = 60;

// The family confirmed the details read from their screenshot -> live request (duplicates still merge).
export async function POST(req: Request) {
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string | number | null | undefined>;
  const str = (k: string) => (typeof b[k] === "string" && (b[k] as string).trim() ? (b[k] as string).trim().slice(0, 120) : null);
  const bloodGroup = normaliseGroup(str("bloodGroup"));
  if (!bloodGroup) return NextResponse.json({ error: "Choose the blood group." }, { status: 400 });
  if (!str("hospital")) return NextResponse.json({ error: "Add the hospital name." }, { status: 400 });
  if (!str("patient")) return NextResponse.json({ error: "Add the patient's name." }, { status: 400 });
  const units = Math.min(20, Math.max(1, Math.round(Number(b.units) || 1)));
  const e: Extracted = {
    isBloodRequest: true,
    bloodGroup,
    component: str("component") ?? "Whole blood",
    units,
    patient: str("patient"),
    hospital: str("hospital"),
    area: str("area"),
    city: str("city") ?? "Bengaluru",
    contact: str("contact"),
    postedOn: new Date().toISOString().slice(0, 10),
    neededBy: null,
    asksForMoney: false,
    suspiciousSignals: [],
    language: "English",
    summary: `${units} unit(s) of ${bloodGroup} for ${str("patient")} at ${str("hospital")}`,
  };
  const fingerprint = str("fingerprint");
  try {
    const result = await mutate((db) => checkForward(db, e, fingerprint, { create: true, userId: uidv, source: "screenshot" }));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
