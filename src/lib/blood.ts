import type { BloodGroup, BloodRequest, User } from "./types";

// Which donor groups can give red cells to a recipient group.
export const CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};

export const DONATION_GAP_DAYS = 90;
export const ARRIVAL_WINDOW_MIN = 120;
export const STALE_DAYS = 5;
export const MIN_TRUST_TO_ACCEPT = 30;
export const NO_SHOW_BLOCK = 3;
export const REPORTS_TO_HIDE = 3;

export function normaliseGroup(s: string | null | undefined): BloodGroup | null {
  if (!s) return null;
  const t = s.toUpperCase().replace(/\s/g, "").replace("POSITIVE", "+").replace("NEGATIVE", "-").replace("VE", "").replace("POS", "+").replace("NEG", "-");
  const m = t.match(/^(AB|A|B|O)([+-])/);
  return m ? ((m[1] + m[2]) as BloodGroup) : null;
}

export function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export function eligibility(u: User): { ok: boolean; daysLeft: number } {
  const d = daysSince(u.lastDonation);
  if (d === null) return { ok: true, daysLeft: 0 };
  return { ok: d >= DONATION_GAP_DAYS, daysLeft: Math.max(0, DONATION_GAP_DAYS - d) };
}

export function hasActiveAcceptance(db: { requests: BloodRequest[] }, donorId: string): BloodRequest | null {
  return db.requests.find((r) => r.status === "active" && r.acceptances.some((a) => a.donorId === donorId && a.status === "on_the_way")) ?? null;
}

export interface Match {
  user: User;
  distanceKm: number;
  eligible: boolean;
  daysLeft: number;
}

export function matchDonors(req: BloodRequest, users: User[], limit = 12): Match[] {
  if (!req.bloodGroup) return [];
  const ok = CAN_RECEIVE_FROM[req.bloodGroup];
  return users
    .filter((u) => u.role === "donor" && u.bloodGroup && ok.includes(u.bloodGroup) && !u.blocked)
    .map((u) => {
      const e = eligibility(u);
      return { user: u, distanceKm: km(req.lat, req.lng, u.lat, u.lng), eligible: e.ok, daysLeft: e.daysLeft };
    })
    .filter((m) => m.distanceKm <= 50)
    // eligible first, then a blend of closeness and trust
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || (a.distanceKm - a.user.trust / 25) - (b.distanceKm - b.user.trust / 25))
    .slice(0, limit);
}

// Expire overdue acceptances: a donor who accepted but never arrived loses trust.
export function sweep(req: BloodRequest, users: User[]): boolean {
  let changed = false;
  for (const a of req.acceptances) {
    if (a.status !== "on_the_way") continue;
    const mins = (Date.now() - new Date(a.acceptedAt).getTime()) / 60000;
    if (mins > ARRIVAL_WINDOW_MIN || req.status !== "active") {
      a.status = req.status === "active" ? "no_show" : "released";
      if (a.status === "no_show") penaliseNoShow(users, a.donorId);
      changed = true;
    }
  }
  return changed;
}

export function penaliseNoShow(users: User[], donorId: string) {
  const u = users.find((x) => x.id === donorId);
  if (!u) return;
  u.noShows += 1;
  u.trust = Math.max(0, u.trust - 20);
  if (u.noShows >= NO_SHOW_BLOCK || u.trust < 10) u.blocked = true;
}

export function trustLabel(t: number): string {
  if (t >= 80) return "Highly trusted";
  if (t >= 55) return "Trusted";
  if (t >= MIN_TRUST_TO_ACCEPT) return "New";
  return "Restricted";
}
