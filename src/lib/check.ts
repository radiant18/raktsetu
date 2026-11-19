import crypto from "crypto";
import type { BloodRequest, DB, Extracted } from "./types";
import { daysSince, STALE_DAYS, REPORTS_TO_HIDE } from "./blood";
import { locate } from "./geo";
import { uid } from "./db";

export type Verdict = "created" | "active" | "duplicate" | "stale" | "fulfilled" | "flagged" | "not_a_request" | "unverified";

export interface CheckResult {
  verdict: Verdict;
  request: BloodRequest | null;
  extracted: Extracted;
  reasons: string[];
}

export function hashImage(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 32);
}

const clean = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);

// Is this extracted forward the same need as an existing request?
export function sameRequest(r: BloodRequest, e: Extracted): boolean {
  if (r.bloodGroup && e.bloodGroup && r.bloodGroup !== e.bloodGroup) return false;
  const phone = digits(e.contact);
  if (phone.length === 10 && digits(r.contact) === phone) return true;
  const p1 = clean(r.patient), p2 = clean(e.patient);
  const h1 = clean(r.hospital), h2 = clean(e.hospital);
  const patientMatch = p1 && p2 && (p1.includes(p2) || p2.includes(p1));
  const hospitalMatch = h1 && h2 && (h1.slice(0, 8) === h2.slice(0, 8) || h1.includes(h2) || h2.includes(h1));
  return Boolean(patientMatch && hospitalMatch) || Boolean(patientMatch && phone && digits(r.contact) === phone);
}

export function scamReasons(e: Extracted): string[] {
  const out = [...e.suspiciousSignals];
  if (e.asksForMoney && !out.some((s) => /money|upi|pay|fee/i.test(s))) out.unshift("Asks for money or a payment");
  if (!e.hospital) out.push("No hospital named");
  if (!e.contact) out.push("No contact number");
  return Array.from(new Set(out));
}

export async function checkForward(db: DB, e: Extracted, fingerprint: string | null, opts: { create: boolean; userId: string | null; source: "screenshot" | "voice" }): Promise<CheckResult> {
  db.stats.forwardsChecked += 1;
  if (!e.isBloodRequest) return { verdict: "not_a_request", request: null, extracted: e, reasons: ["This doesn't look like a blood request."] };

  // 1. Seen before? (exact same image, or the same need in a different screenshot)
  const existing =
    (fingerprint && db.requests.find((r) => r.fingerprints.includes(fingerprint))) || db.requests.find((r) => sameRequest(r, e));
  if (existing) {
    existing.timesChecked += 1;
    if (fingerprint && !existing.fingerprints.includes(fingerprint)) existing.fingerprints.push(fingerprint);
    if (existing.status === "fulfilled") {
      db.stats.staleStopped += 1;
      return { verdict: "fulfilled", request: existing, extracted: e, reasons: [existing.verified ? "Closed with a blood bank issue slip." : "The family marked this as done.", "Please stop forwarding it."] };
    }
    if (existing.status === "flagged") return { verdict: "flagged", request: existing, extracted: e, reasons: ["Several people reported this request as fake."] };
    db.stats.duplicatesMerged += 1;
    return { verdict: "duplicate", request: existing, extracted: e, reasons: [`Already live on RaktSetu — checked ${existing.timesChecked} times.`, "No need to forward again; share the live link instead."] };
  }

  // 2. Scam signals
  const scam = scamReasons(e);
  const hardScam = e.asksForMoney;

  // 3. Too old?
  const age = daysSince(e.postedOn);
  const stale = age !== null && age > STALE_DAYS;

  if (!opts.create) {
    if (hardScam) {
      db.stats.scamsFlagged += 1;
      return { verdict: "flagged", request: null, extracted: e, reasons: scam };
    }
    if (stale) {
      db.stats.staleStopped += 1;
      return { verdict: "stale", request: null, extracted: e, reasons: [`This forward is ${age} days old.`, "Most emergency requests are met within 48 hours — call before you travel."] };
    }
  }

  // 4. New request — put it live
  const [lat, lng] = await locate(e.hospital, e.area, e.city);
  const req: BloodRequest = {
    id: uid("r_"),
    bloodGroup: e.bloodGroup,
    component: e.component || "Whole blood",
    units: e.units,
    unitsArranged: 0,
    patient: e.patient,
    hospital: e.hospital,
    area: e.area,
    city: e.city ?? "Bengaluru",
    contact: e.contact,
    postedOn: e.postedOn,
    lat,
    lng,
    status: hardScam ? "flagged" : stale ? "expired" : "active",
    source: opts.source,
    fingerprints: fingerprint ? [fingerprint] : [],
    timesChecked: 1,
    createdAt: new Date().toISOString(),
    createdBy: opts.userId,
    verified: false,
    scamFlags: scam,
    reports: [],
    acceptances: [],
    language: e.language,
    rawText: e.summary,
  };
  db.requests.unshift(req);
  if (hardScam) {
    db.stats.scamsFlagged += 1;
    return { verdict: "flagged", request: req, extracted: e, reasons: scam };
  }
  if (stale) {
    db.stats.staleStopped += 1;
    return { verdict: "stale", request: req, extracted: e, reasons: [`This forward is ${age} days old.`, "Most emergency requests are met within 48 hours — call before you travel."] };
  }
  return { verdict: scam.length ? "unverified" : "created", request: req, extracted: e, reasons: scam.length ? scam : ["Now live. Matching compatible donors nearby."] };
}

export function isHidden(r: BloodRequest) {
  return r.reports.length >= REPORTS_TO_HIDE;
}
