import { NextResponse } from "next/server";
import { extractFromPatientDetails } from "@/lib/ai";
import { hashImage } from "@/lib/check";
import { currentUserId } from "@/lib/auth";

export const maxDuration = 60;

// Screenshot of patient details -> fields for the family to confirm. Nothing is saved yet.
export async function POST(req: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return NextResponse.json({ error: "Add a screenshot." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 400 });
    const type = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) ? file.type : "image/jpeg";
    const buf = Buffer.from(await file.arrayBuffer());
    const e = await extractFromPatientDetails(buf.toString("base64"), type);
    return NextResponse.json({ extracted: e, fingerprint: hashImage(buf) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't read the screenshot" }, { status: 500 });
  }
}
