import { after, NextResponse } from "next/server";
import { notifyDonors } from "@/lib/whatsapp";
import { currentUserId } from "@/lib/auth";
import { extractFromSpeech } from "@/lib/ai";
import { checkForward } from "@/lib/check";
import { mutate } from "@/lib/db";

export const maxDuration = 60;

// Voice note (transcribed in the browser) -> live request. Requires an OTP-verified account.
export async function POST(req: Request) {
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in with OTP first, so we know the request is real." }, { status: 401 });
  const { transcript, lang } = (await req.json().catch(() => ({}))) as { transcript?: string; lang?: string };
  if (!transcript || transcript.trim().length < 8) return NextResponse.json({ error: "We couldn't hear enough. Say the blood group, units and hospital." }, { status: 400 });
  try {
    const e = await extractFromSpeech(transcript.trim().slice(0, 2000), lang ?? "en");
    e.postedOn = new Date().toISOString().slice(0, 10);
    if (!e.bloodGroup || !e.hospital) return NextResponse.json({ error: "Please mention the blood group and the hospital name.", extracted: e }, { status: 400 });
    const result = await mutate((db) => checkForward(db, e, null, { create: true, userId: uidv, source: "voice" }));
    if (result.request && (result.verdict === "created" || result.verdict === "unverified")) { const id = result.request.id; after(() => notifyDonors(id).catch(console.error)); }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
