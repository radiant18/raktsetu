import crypto from "crypto";
import type { BloodRequest, DB, User } from "./types";
import { CAN_RECEIVE_FROM, eligibility, hasActiveAcceptance, km, matchDonors } from "./blood";
import { alertText } from "./ai";
import { mutate, uid } from "./db";
import { enqueue } from "./waqueue";

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

/** Keep the message in the shared outbox; the pywhatkit worker (scripts/raktsetu_wa_sender.py) delivers it. */
export async function queueWhatsApp(to: string, body: string): Promise<void> {
  const msg = { id: uid("wa"), to: fromWa(to), body: body.slice(0, 1500), at: new Date().toISOString(), sentAt: null };
  outbox().push({ to: msg.to, body: msg.body, at: msg.at });
  await enqueue(msg).catch((e) => console.error("wa queue failed", e));
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const dest = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  if (!waConfigured() || process.env.WA_VIA === "worker") { await queueWhatsApp(dest, body); return true; }
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: FROM, To: dest, Body: body.slice(0, 1500) }),
  }).catch(() => null);
  if (!r?.ok) {
    console.error("whatsapp send failed, queued for worker", r?.status, await r?.text().catch(() => ""));
    await queueWhatsApp(dest, body);
  }
  return true;
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

const short = (n: string) => n.trim().split(/\s+/)[0] || "Donor";
const kmTxt = (d: number) => (d < 1 ? "<1 km" : `${d.toFixed(1)} km`);

/** Right after sign-up: donors get nearby patients who need their group; families get nearby donors. */
export async function welcomeMatches(userId: string): Promise<void> {
  const plan = await mutate((db: DB) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u || !realPhone(u)) return null;
    if (u.role === "donor" && u.bloodGroup) {
      const g = u.bloodGroup;
      const reqs = db.requests
        .filter((r) => r.status === "active" && r.bloodGroup && CAN_RECEIVE_FROM[r.bloodGroup].includes(g) && r.createdBy !== u.id)
        .map((r) => ({ r, d: km(r.lat, r.lng, u.lat, u.lng) }))
        .filter((x) => x.d <= 50)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      if (reqs[0]) u.lastAlert = reqs[0].r.id;
      return { u: { ...u }, reqs: reqs.map((x) => ({ r: { ...x.r }, d: x.d })), donors: [] as { name: string; group: string; d: number; ok: boolean }[] };
    }
    const donors = db.users
      .filter((x) => x.role === "donor" && x.bloodGroup && x.id !== u.id && !x.blocked)
      .map((x) => ({ name: short(x.name), group: x.bloodGroup as string, d: km(u.lat, u.lng, x.lat, x.lng), ok: eligibility(x).ok }))
      .filter((x) => x.d <= 50)
      .sort((a, b) => Number(b.ok) - Number(a.ok) || a.d - b.d);
    return { u: { ...u }, reqs: [] as { r: BloodRequest; d: number }[], donors };
  });
  if (!plan) return;
  const { u } = plan;
  let msg: string;
  if (u.role === "donor") {
    msg = `🩸 *Welcome to RaktSetu, ${short(u.name)}!*\nYou're registered as a *${u.bloodGroup}* donor near ${u.area}.\n\n`;
    if (plan.reqs.length) {
      msg += `*${plan.reqs.length} patient${plan.reqs.length > 1 ? "s" : ""} near you can take your blood right now:*\n`;
      plan.reqs.forEach(({ r, d }, i) => {
        msg += `\n${i + 1}. *${r.bloodGroup}* · ${Math.max(1, r.units - r.unitsArranged)} unit(s) · ${r.hospital}${r.area ? `, ${r.area}` : ""} (${kmTxt(d)})\n   ${SITE}/r/${r.id}`;
      });
      msg += `\n\nReply *YES* to go for #1, or open a link to choose.`;
    } else {
      msg += `Nobody near you needs ${u.bloodGroup} right now. We'll message you here the moment someone does. 🙏`;
    }
  } else {
    const n = plan.donors.length, ready = plan.donors.filter((x) => x.ok).length;
    msg = `🩸 *Welcome to RaktSetu, ${short(u.name)}!*\n\n`;
    if (n) {
      const groups: Record<string, number> = {};
      plan.donors.forEach((x) => (groups[x.group] = (groups[x.group] || 0) + 1));
      msg += `*${n} donor${n > 1 ? "s" : ""} within 50 km of ${u.area}* (${ready} ready to give today):\n`;
      plan.donors.slice(0, 5).forEach((x) => (msg += `\n• ${x.name} · *${x.group}* · ${kmTxt(x.d)}${x.ok ? "" : " (resting)"}`));
      msg += `\n\nBy group: ${Object.entries(groups).map(([g, c]) => `${g} ${c}`).join(" · ")}`;
    } else {
      msg += `We're still growing near ${u.area}.`;
    }
    msg += `\n\nNeed blood? Send a screenshot of the patient details here, or post at ${SITE}/need — we alert only matching donors and they confirm with a code at the hospital. Numbers stay private.`;
  }
  await sendWhatsApp(u.contact, msg);
}

/** After a request is posted: tell the family which matching donors nearby were alerted. */
export async function tellRequester(requestId: string, alerted: number): Promise<void> {
  const info = await mutate((db: DB) => {
    const r = db.requests.find((x) => x.id === requestId);
    const u = r && db.users.find((x) => x.id === r.createdBy);
    if (!r || !u || !realPhone(u)) return null;
    return { u: { ...u }, r: { ...r }, list: matchDonors(r, db.users, 5).map((m) => ({ name: short(m.user.name), group: m.user.bloodGroup, d: m.distanceKm, ok: m.eligible })) };
  });
  if (!info) return;
  const { r, list } = info;
  let msg = `🩸 *Your request is live:* ${r.bloodGroup} · ${r.units} unit(s) · ${r.hospital}\n`;
  msg += list.length
    ? `\n*Matching donors nearby:*\n${list.map((x) => `• ${x.name} · *${x.group}* · ${kmTxt(x.d)}${x.ok ? "" : " (resting)"}`).join("\n")}\n\n${alerted ? `We've alerted ${alerted} of them on WhatsApp.` : "We're alerting them now."}`
    : `\nNo matching donors within 50 km yet. We'll keep looking and message you.`;
  msg += `\nWhen someone says they're coming, you'll get their name and a 4-digit code to confirm at the hospital.\nTrack it: ${SITE}/r/${r.id}`;
  await sendWhatsApp(info.u.contact, msg);
}
