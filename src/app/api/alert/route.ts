import { NextResponse } from "next/server";
import { alertText } from "@/lib/ai";
import { readDB } from "@/lib/db";
import { km } from "@/lib/blood";
import { currentUser } from "@/lib/auth";

// Spoken alert text for a donor, in their language.
export async function POST(req: Request) {
  const { requestId, donorId, lang } = (await req.json().catch(() => ({}))) as { requestId?: string; donorId?: string; lang?: string };
  const db = await readDB();
  const r = db.requests.find((x) => x.id === requestId);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const me = await currentUser();
  const donor = db.users.find((u) => u.id === donorId) ?? me;
  const language = (lang === "hi" || lang === "kn" || lang === "en" ? lang : donor?.language) ?? "en";
  const distanceKm = donor ? km(r.lat, r.lng, donor.lat, donor.lng) : 0;
  try {
    const text = await alertText(language, { bloodGroup: r.bloodGroup, units: r.units - r.unitsArranged, hospital: r.hospital, area: r.area, distanceKm });
    return NextResponse.json({ text, lang: language });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
