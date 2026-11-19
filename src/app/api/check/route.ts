import { NextResponse } from "next/server";
import { extractFromImage, extractFromSpeech } from "@/lib/ai";
import { checkForward, hashImage } from "@/lib/check";
import { mutate } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    const create = form.get("mode") === "create";
    const text = form.get("text");
    // A typed / forwarded text message (e.g. from the WhatsApp script) instead of a screenshot.
    if (!(file instanceof File) && typeof text === "string" && text.trim().length >= 10) {
      const user = await currentUser();
      const extracted = await extractFromSpeech(text.slice(0, 2000), "en");
      const result = await mutate((db) => checkForward(db, extracted, null, { create, userId: user?.id ?? null, source: "whatsapp" }));
      return NextResponse.json(result);
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Upload a screenshot." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 400 });
    const type = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) ? file.type : "image/jpeg";
    const buf = Buffer.from(await file.arrayBuffer());
    const fingerprint = hashImage(buf);
    const user = await currentUser();
    const extracted = await extractFromImage(buf.toString("base64"), type);
    const result = await mutate((db) => checkForward(db, extracted, fingerprint, { create, userId: user?.id ?? null, source: "screenshot" }));
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
  }
}
