import Anthropic from "@anthropic-ai/sdk";
import type { Extracted } from "./types";
import { normaliseGroup } from "./blood";

const MODEL = "claude-opus-5-5";
let client: Anthropic | null = null;
function ai() {
  if (!client) client = new Anthropic();
  return client;
}

const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isBloodRequest", "bloodGroup", "component", "units", "patient", "hospital", "area", "city", "contact", "postedOn", "neededBy", "asksForMoney", "suspiciousSignals", "language", "summary"],
  properties: {
    isBloodRequest: { type: "boolean" },
    bloodGroup: { type: ["string", "null"], description: "One of A+,A-,B+,B-,AB+,AB-,O+,O- or null" },
    component: { type: "string", description: "Whole blood, platelets, plasma, PRBC, etc. Default 'Whole blood'" },
    units: { type: "integer" },
    patient: { type: ["string", "null"] },
    hospital: { type: ["string", "null"], description: "Hospital name only" },
    area: { type: ["string", "null"], description: "Locality / road of the hospital, e.g. 'Old Airport Road'" },
    city: { type: ["string", "null"] },
    contact: { type: ["string", "null"], description: "Phone number(s) as written" },
    postedOn: { type: ["string", "null"], description: "Date the message was sent/posted as YYYY-MM-DD if visible (WhatsApp timestamps, dates in text). null if unknown" },
    neededBy: { type: ["string", "null"], description: "Date/time blood is needed by, YYYY-MM-DD if visible" },
    asksForMoney: { type: "boolean", description: "True if it asks for money, UPI, fees, deposits or payment" },
    suspiciousSignals: { type: "array", items: { type: "string" }, description: "Short plain-English scam/fake signals, e.g. 'Asks for UPI payment', 'No hospital named'. Empty if none" },
    language: { type: "string", description: "Main language of the text" },
    summary: { type: "string", description: "One short English sentence describing the request" },
  },
} as const;

const SYSTEM = `You read Indian WhatsApp emergency blood-request forwards (screenshots, posters, chats, voice-note transcripts) in any Indian language.
Extract the facts exactly as written. Never invent a phone number, name or hospital - use null when it is not there.
Today's date is ${new Date().toISOString().slice(0, 10)}; resolve relative dates ("today", "kal") against it only if the screenshot shows when it was sent.
Flag scam signals: requests for money/UPI/processing fees, no hospital, mismatched details, pressure to pay.`;

async function run(content: Anthropic.ContentBlockParam[]): Promise<Extracted> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: EXTRACT_SCHEMA } },
    messages: [{ role: "user", content }],
  };
  const res = await ai().beta.messages.create(params);
  if (res.stop_reason === "refusal") throw new Error("The AI declined to read this image.");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const out = JSON.parse(text) as Extracted;
  out.bloodGroup = normaliseGroup(out.bloodGroup);
  out.units = Math.max(1, Math.min(20, Number(out.units) || 1));
  return out;
}

export async function extractFromImage(base64: string, mediaType: string): Promise<Extracted> {
  return run([
    { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
    { type: "text", text: "Read this screenshot and extract the blood request." },
  ]);
}

export async function extractFromSpeech(transcript: string, lang: string): Promise<Extracted> {
  return run([{ type: "text", text: `Voice note transcript (spoken language: ${lang}). A family member is asking for blood right now, so postedOn is today:\n\n"${transcript}"` }]);
}

// Reads a blood-bank issue slip / cross-match receipt to close a request.
export async function readIssueSlip(base64: string, mediaType: string): Promise<{ isIssueSlip: boolean; bloodGroup: string | null; units: number; hospital: string | null; patient: string | null; date: string | null; note: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["isIssueSlip", "bloodGroup", "units", "hospital", "patient", "date", "note"],
          properties: {
            isIssueSlip: { type: "boolean", description: "True if this is a blood bank issue slip, cross-match form, transfusion receipt or similar proof blood was issued" },
            bloodGroup: { type: ["string", "null"] },
            units: { type: "integer" },
            hospital: { type: ["string", "null"] },
            patient: { type: ["string", "null"] },
            date: { type: ["string", "null"] },
            note: { type: "string", description: "One short sentence on what the document shows" },
          },
        },
      },
    },
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Is this proof that blood was issued? Extract the details." }] }],
  };
  const res = await ai().beta.messages.create(params);
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text);
}

// Reads a donation certificate / blood bank SMS for the donor passport.
export async function readDonationProof(base64: string, mediaType: string): Promise<{ isDonationProof: boolean; bloodGroup: string | null; donationDate: string | null; note: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["isDonationProof", "bloodGroup", "donationDate", "note"],
          properties: {
            isDonationProof: { type: "boolean" },
            bloodGroup: { type: ["string", "null"] },
            donationDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
            note: { type: "string" },
          },
        },
      },
    },
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Is this a blood donation certificate, donor card or blood bank donation SMS? Extract the blood group and the donation date." }] }],
  };
  const res = await ai().beta.messages.create(params);
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text);
}

// Short spoken alert in the donor's language.
export async function alertText(lang: "en" | "hi" | "kn", r: { bloodGroup: string | null; units: number; hospital: string | null; area: string | null; distanceKm: number }): Promise<string> {
  const base = `Urgent: ${r.units} unit${r.units > 1 ? "s" : ""} of ${r.bloodGroup ?? "blood"} needed at ${r.hospital ?? "a hospital"}${r.area ? ", " + r.area : ""}${r.distanceKm > 0.05 ? ", " + r.distanceKm.toFixed(1) + " kilometres from you" : ""}. Open RaktSetu to accept.`;
  if (lang === "en") return base;
  const res = await ai().messages.create({
    model: MODEL,
    max_tokens: 1000,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: `Translate this alert into natural spoken ${lang === "hi" ? "Hindi (Devanagari script)" : "Kannada (Kannada script)"} for a voice announcement. Keep blood group, hospital names and numbers as they are. Reply with only the translation.\n\n${base}` }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || base;
}
