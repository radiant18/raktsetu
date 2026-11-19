import crypto from "crypto";
import type { BloodRequest, DB, User } from "./types";
import { eligibility, hasActiveAcceptance, km, matchDonors } from "./blood";
import { alertText } from "./ai";
import { mutate } from "./db";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://raktsetu-red.vercel.app";
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Twilio sandbox number
export const waConfigured = () => Boolean(SID && TOKEN);

// Local test mode (no Twilio keys): messages are kept here instead of being sent.
const g = globalThis as unknown as { __waOutbox?: { to: string; body: string; at: string }[] };
export const outbox = () => (g.__waOutbox ??= []);

/** "whatsapp:+919845012345" -> "+919845012345" */
export const fromWa = (s: string) => s.replace(/^whatsapp:/, "").trim();

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const dest = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  if (!waConfigured()) { outbox().push({ to: dest, body, at: new Date().toISOString() }); return true; }
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: FROM, To: dest, Body: body.slice(0, 1500) }),
  }).catch(() => null);
  if (!r?.ok) console.error("whatsapp send failed", r?.status, await r?.text().catch(() => ""));
  return Boolean(r?.ok);
}

/** Twilio signs each webhook: base64(HMAC-SHA1(token, url + sorted key+value pairs)). */
export function validTwilioSignature(url: string, params: Record<string, string>, sig: string | null): boolean {
  if (!TOKEN) return true; // local test mode
  if (!sig) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const want = crypto.createHmac("sha1", TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

/** Twilio media URLs need basic auth. */
export async function fetchMedia(url: string): Promise<{ base64: string; type: string } | null> {
  const r = await fetch(url, { headers: SID && TOKEN ? { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64") } : {} }).catch(() => null);
  if (!r?.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) return null;
  return { base64: buf.toString("base64"), type: (r.headers.get("content-type") || "image/jpeg").split(";")[0] };
}

export const realPhone = (u: User) => !u.demo && /^\+91\d{10}$/.test(u.contact);

/** Message the nearest matching, eligible donors who have a real phone number. Reply YES accepts. */
export async function notifyDonors(requestId: string, max = 5): Promise<number> {
  const picked = await mutate((db: DB) => {
    const r = db.requests.find((x) => x.id === requestId);
    if (!r || r.status !== "active") return [] as { u: User; r: BloodRequest; d: number }[];
    const out = matchDonors(r, db.users, 40)
      .map((m) => db.users.find((u) => u.id === m.user.id)!)
      .filter((u) => u && realPhone(u) && u.id !== r.createdBy && eligibility(u).ok && !hasActiveAcceptance(db, u.id))
      .slice(0, max);
    out.forEach((u) => (u.lastAlert = r.id));
    return out.map((u) => ({ u: { ...u }, r: { ...r }, d: km(r.lat, r.lng, u.lat, u.lng) }));
  });
  await Promise.all(picked.map(async ({ u, r, d }) => {
    const line = await alertText(u.language, { bloodGroup: r.bloodGroup, units: r.units - r.unitsArranged, hospital: r.hospital, area: r.area, distanceKm: d }).catch(() => null);
    await sendWhatsApp(u.contact, `🩸 *RaktSetu alert*\n${line ?? `${r.bloodGroup} needed at ${r.hospital}`}\n\nReply *YES* to go · details: ${SITE}/r/${r.id}`);
  }));
  return picked.length;
}
