import { after, NextResponse } from "next/server";
import { readDB, mutate } from "@/lib/db";
import { extractFromImage, extractFromPatientDetails, extractFromSpeech } from "@/lib/ai";
import { checkForward, hashImage } from "@/lib/check";
import { acceptRequest } from "@/lib/accept";
import { CAN_RECEIVE_FROM, eligibility, km } from "@/lib/blood";
import { fetchMedia, fromWa, notifyDonors, outbox, sendWhatsApp, SITE, validTwilioSignature, waConfigured } from "@/lib/whatsapp";
import type { User } from "@/lib/types";

export const maxDuration = 60;

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const twiml = (msg?: string) =>
  new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${msg ? `<Message>${xml(msg)}</Message>` : ""}</Response>`, { headers: { "Content-Type": "text/xml; charset=utf-8" } });

const HELP = `🩸 *RaktSetu bot*
• Send a *screenshot* of a blood request or patient details → we post it live and alert matching donors
• Or type it: _"B- 2 units Manipal Hospital Old Airport Road, call 98450 77321"_
• *DONATE* → requests you can give to right now
• *YES* → accept the last alert
• *CODE 1234* → confirm you reached the hospital
• *STATUS* → your requests and promises`;

const BLOODY = /\b(blood|units?|donor|platelets?|plasma|(a|b|ab|o)\s*(\+|-|−|pos|neg|positive|negative|ve))|रक्त|खून|ರಕ್ತ/i;

export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { if (typeof v === "string") params[k] = v; });
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const url = `${req.headers.get("x-forwarded-proto") || "https"}://${host}${new URL(req.url).pathname}`;
  if (!validTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) return new NextResponse("bad signature", { status: 403 });

  const phone = fromWa(params.From || "");
  // Reply through the REST API (Twilio's tryout sender rejects inline TwiML replies).
  const reply = (m: string) => { after(() => sendWhatsApp(phone, m).then(() => undefined)); return twiml(); };
  const body = (params.Body || "").trim();
  const cmd = body.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
  const db = await readDB();
  const me = db.users.find((u) => u.contact === phone);

  // Account first: the bot only works for people verified on the website.
  if (!me || !me.name) {
    return reply(`👋 Welcome to RaktSetu!\nTo keep every request real, first create your free account with *this same number*:\n${SITE}/login\n\nThen come back and send *HI*.`);
  }

  if (!body && !Number(params.NumMedia)) return reply(HELP);
  if (["HI", "HELLO", "HELP", "START", "MENU"].includes(cmd)) return reply(`Hi ${me.name.split(" ")[0]}! ${HELP}`);

  if (["DONATE", "CAN I DONATE", "ELIGIBLE"].includes(cmd)) return reply(await donateList(me));

  if (["YES", "Y", "HAAN", "HA", "HAUDU"].includes(cmd)) {
    if (!me.lastAlert) return reply("No alert to accept yet. Send *DONATE* to see requests near you.");
    const out = await mutate((d) => {
      const res = acceptRequest(d, d.requests.find((r) => r.id === me.lastAlert), d.users.find((u) => u.id === me.id));
      return "error" in res ? res : { ok: true, hospital: res.request.hospital, area: res.request.area, contact: res.request.contact, id: res.request.id, km: res.distanceKm };
    });
    if ("error" in out) return reply(`⚠️ ${out.error}`);
    return reply(`✅ Thank you, you're on the way!\n🏥 ${out.hospital}${out.area ? ", " + out.area : ""} (${out.km.toFixed(1)} km)\n📞 Family: ${out.contact ?? "see link"}\n\nAt the hospital, ask the family for their 4-digit code and send *CODE 1234*.\n${SITE}/r/${out.id}`);
  }

  const code = cmd.match(/^CODE\s*(\d{4})$/);
  if (code) {
    const out = await mutate((d) => {
      const u = d.users.find((x) => x.id === me.id)!;
      const r = d.requests.find((x) => x.acceptances.some((a) => a.donorId === me.id && a.status === "on_the_way"));
      const a = r?.acceptances.find((x) => x.donorId === me.id && x.status === "on_the_way");
      if (!r || !a) return { error: "You have no active promise right now." };
      if (a.code !== code[1]) return { error: "That code doesn't match. Ask the family for the code on their screen." };
      a.status = "arrived"; a.arrivedAt = new Date().toISOString();
      r.unitsArranged = Math.min(r.units, r.unitsArranged + 1);
      u.trust = Math.min(100, u.trust + 10); u.donations += 1; u.lastDonation = new Date().toISOString();
      return { ok: true, trust: u.trust };
    });
    return reply("error" in out ? `⚠️ ${out.error}` : `🎉 Arrival confirmed. You're a hero! Trust score now ${out.trust}. We'll pause your alerts for 90 days so you can recover.`);
  }

  if (cmd === "STATUS") return reply(status(db.requests, me));

  // A screenshot or a typed request: process in the background (AI takes a few seconds), reply when done.
  const media = Number(params.NumMedia) > 0 && params.MediaUrl0 && (params.MediaContentType0 || "").startsWith("image/");
  if (media || (body.length > 15 && BLOODY.test(body))) {
    after(() => processRequest(me, phone, media ? params.MediaUrl0 : null, body).catch((e) => { console.error(e); return sendWhatsApp(phone, "❌ Sorry, something went wrong reading that. Try a clearer screenshot, or post it at " + SITE + "/need"); }));
    return reply(media ? "📸 Got it, reading the screenshot…" : "✍️ Got it, reading your message…");
  }
  return reply(`I didn't get that. ${HELP}`);
}

async function processRequest(me: User, phone: string, mediaUrl: string | null, text: string) {
  let e, fingerprint: string | null = null;
  if (mediaUrl) {
    const img = await fetchMedia(mediaUrl);
    if (!img) return sendWhatsApp(phone, "❌ Couldn't download that image. Please send it again.");
    fingerprint = hashImage(Buffer.from(img.base64, "base64"));
    e = await extractFromImage(img.base64, img.type);
    if (!e.isBloodRequest || !e.bloodGroup) e = await extractFromPatientDetails(img.base64, img.type);
  } else {
    e = await extractFromSpeech(text, me.language);
  }
  if (!e.isBloodRequest || !e.bloodGroup || !e.hospital) {
    return sendWhatsApp(phone, `🤔 I couldn't find a full blood request there.\nI need: *blood group*, *hospital*${e.bloodGroup ? "" : " (missing blood group)"}${e.hospital ? "" : " (missing hospital)"}.\nTry again or use ${SITE}/need`);
  }
  const res = await mutate((d) => checkForward(d, e, fingerprint, { create: true, userId: me.id, source: "whatsapp" }));
  const r = res.request;
  const link = r ? `${SITE}/r/${r.id}` : SITE;
  const head: Record<string, string> = {
    created: "🟢 *Posted live on RaktSetu*", unverified: "🟡 *Posted, but double-check it*", duplicate: "🔁 *Already live* (merged, no duplicate made)",
    stale: "⌛ *This looks old*: not posted", fulfilled: "🛑 *Already done*: please stop forwarding", flagged: "🚨 *Possible scam*: not posted", active: "🟢 *Still needed*",
  };
  let msg = `${head[res.verdict] ?? res.verdict}\n🩸 ${e.bloodGroup} · ${e.units ?? 1} unit(s)\n🏥 ${e.hospital}${e.area ? ", " + e.area : ""}${e.patient ? "\n👤 " + e.patient : ""}`;
  if (res.reasons?.length) msg += "\n" + res.reasons.slice(0, 2).map((x) => "• " + x).join("\n");
  if (r && (res.verdict === "created" || res.verdict === "unverified")) {
    const n = await notifyDonors(r.id);
    msg += `\n\n📣 Alerted ${n} matching donor${n === 1 ? "" : "s"} nearby on WhatsApp.\nShare this link instead of the screenshot:\n${link}`;
  } else if (r) msg += `\n${link}`;
  return sendWhatsApp(phone, msg);
}

async function donateList(me: User): Promise<string> {
  if (me.role !== "donor" || !me.bloodGroup) return `Your account is set up to *find* blood. To donate, set your blood group at ${SITE}/me`;
  const el = eligibility(me);
  if (!el.ok) return `💤 You donated recently. You can donate again in *${el.daysLeft} days*. Thank you!`;
  const list = await mutate((d) => {
    const near = d.requests
      .filter((r) => r.status === "active" && r.createdBy !== me.id && r.bloodGroup && CAN_RECEIVE_FROM[r.bloodGroup].includes(me.bloodGroup!))
      .map((r) => ({ r, d: km(r.lat, r.lng, me.lat, me.lng) }))
      .filter((x) => x.d <= 50).sort((a, b) => a.d - b.d).slice(0, 3);
    const u = d.users.find((x) => x.id === me.id);
    if (u && near[0]) u.lastAlert = near[0].r.id;
    return near;
  });
  if (!list.length) return `✅ You *can* donate (${me.bloodGroup}). No one near you needs your group right now. We'll message you the moment someone does.`;
  return `✅ You can donate! ${me.bloodGroup} is needed here:\n\n` +
    list.map((x, i) => `${i + 1}. 🩸 ${x.r.bloodGroup} · ${x.r.units - x.r.unitsArranged} unit(s) · ${x.r.hospital} (${x.d.toFixed(1)} km)\n   ${SITE}/r/${x.r.id}`).join("\n") +
    `\n\nReply *YES* to go to #1.`;
}

function status(requests: { id: string; createdBy: string | null; status: string; bloodGroup: string | null; hospital: string | null; units: number; unitsArranged: number; acceptances: { donorId: string; status: string }[] }[], me: User): string {
  const mine = requests.filter((r) => r.createdBy === me.id && r.status === "active");
  const going = requests.find((r) => r.acceptances.some((a) => a.donorId === me.id && a.status === "on_the_way"));
  const lines = [`👤 ${me.name} · ${me.bloodGroup ?? "group not set"} · trust ${me.trust}`];
  if (going) lines.push(`🚗 You promised to go: ${going.hospital}\n   ${SITE}/r/${going.id}`);
  mine.forEach((r) => lines.push(`🩸 Your request: ${r.bloodGroup} at ${r.hospital}: ${r.unitsArranged}/${r.units} arranged\n   ${SITE}/r/${r.id}`));
  if (lines.length === 1) lines.push("No active requests or promises.");
  return lines.join("\n");
}

// Local test mode only: see what the bot would have sent.
export async function GET() {
  if (waConfigured() || process.env.VERCEL) return NextResponse.json({ ok: true, configured: waConfigured() });
  return NextResponse.json({ outbox: outbox() });
}
