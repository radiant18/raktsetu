import { NextResponse, after } from "next/server";
import { welcomeMatches } from "@/lib/whatsapp";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { normaliseGroup } from "@/lib/blood";
import { locate } from "@/lib/geo";

export async function PATCH(req: Request) {
  const id = await currentUserId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; role?: string; bloodGroup?: string; area?: string; city?: string; state?: string; language?: string };
  const name = (b.name ?? "").trim().slice(0, 60);
  if (name.length < 2) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  const role = b.role === "family" ? "family" : "donor";
  const group = normaliseGroup(b.bloodGroup);
  if (role === "donor" && !group) return NextResponse.json({ error: "Donors must choose a blood group." }, { status: 400 });
  const locality = (b.area ?? "").trim().slice(0, 80);
  const city = (b.city ?? "").trim().slice(0, 60);
  const state = (b.state ?? "").trim().slice(0, 60);
  const area = [locality, city].filter(Boolean).join(", ") || "Bengaluru";
  const [lat, lng] = await locate(null, locality || null, [city || "Bengaluru", state].filter(Boolean).join(", "));
  let first = false;
  const user = await mutate((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    first = !u.name;
    u.name = name; u.role = role; u.bloodGroup = group; u.area = area; u.lat = lat; u.lng = lng;
    u.language = b.language === "hi" || b.language === "kn" ? b.language : "en";
    return u;
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (first) after(() => welcomeMatches(id).catch(console.error));
  return NextResponse.json({ ok: true, user });
}
