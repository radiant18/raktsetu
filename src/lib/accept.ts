import type { BloodRequest, DB, User } from "./types";
import { CAN_RECEIVE_FROM, eligibility, hasActiveAcceptance, km, MIN_TRUST_TO_ACCEPT, sweep } from "./blood";

// One set of rules for accepting, used by the website button and the WhatsApp "YES" reply.
export function acceptRequest(db: DB, r: BloodRequest | undefined, u: User | undefined): { error: string } | { ok: true; distanceKm: number; request: BloodRequest } {
  if (!r || !u) return { error: "Not found." };
  db.requests.forEach((x) => sweep(x, db.users));
  if (u.role !== "donor" || !u.bloodGroup) return { error: "Only verified donors can accept. Set your blood group in your profile." };
  if (u.blocked) return { error: "Your account is restricted after repeated no-shows." };
  if (u.trust < MIN_TRUST_TO_ACCEPT) return { error: "Your trust score is too low to accept right now." };
  if (r.status !== "active") return { error: "This request is no longer active." };
  if (r.createdBy === u.id) return { error: "You created this request." };
  if (!r.bloodGroup || !CAN_RECEIVE_FROM[r.bloodGroup].includes(u.bloodGroup)) return { error: `${u.bloodGroup} can't donate to ${r.bloodGroup ?? "this patient"}.` };
  const e = eligibility(u);
  if (!e.ok) return { error: `You donated recently. You can donate again in ${e.daysLeft} days.` };
  const busy = hasActiveAcceptance(db, u.id);
  if (busy) return { error: busy.id === r.id ? "You already accepted this request." : "You already have one active promise. Finish or cancel it first." };
  const going = r.acceptances.filter((a) => a.status === "on_the_way" || a.status === "arrived").length;
  if (going >= r.units - r.unitsArranged + 1) return { error: "Enough donors are already on the way. Thank you!" };
  const code = String(Math.floor(1000 + Math.random() * 9000));
  r.acceptances.push({ donorId: u.id, donorName: u.name, code, acceptedAt: new Date().toISOString(), status: "on_the_way" });
  return { ok: true, distanceKm: km(r.lat, r.lng, u.lat, u.lng), request: r };
}
