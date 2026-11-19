export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export type RequestStatus = "active" | "fulfilled" | "expired" | "flagged";

export interface Acceptance {
  donorId: string;
  donorName: string;
  code: string; // 4-digit arrival code the family reads out at the hospital
  acceptedAt: string;
  status: "on_the_way" | "arrived" | "released" | "no_show";
  arrivedAt?: string;
}

export interface BloodRequest {
  id: string;
  bloodGroup: BloodGroup | null;
  component: string; // whole blood, platelets, plasma...
  units: number;
  unitsArranged: number;
  patient: string | null;
  hospital: string | null;
  area: string | null;
  city: string;
  contact: string | null;
  postedOn: string | null; // date visible on the forward (ISO date)
  lat: number;
  lng: number;
  status: RequestStatus;
  source: "screenshot" | "voice";
  fingerprints: string[]; // image hashes of every screenshot seen for this request
  timesChecked: number;
  createdAt: string;
  createdBy: string | null;
  verified: boolean; // closed with a blood-bank issue slip
  closedAt?: string;
  closureNote?: string;
  scamFlags: string[];
  reports: string[]; // user ids who reported
  acceptances: Acceptance[];
  language?: string;
  rawText?: string;
}

export interface User {
  id: string;
  contact: string; // email or phone
  name: string;
  role: "donor" | "family";
  bloodGroup: BloodGroup | null;
  area: string;
  lat: number;
  lng: number;
  language: "en" | "hi" | "kn";
  trust: number; // 0-100
  donations: number;
  noShows: number;
  lastDonation: string | null;
  passportVerified: boolean;
  blocked: boolean;
  createdAt: string;
  demo?: boolean;
}

export interface OtpEntry {
  contact: string;
  codeHash: string;
  expires: number;
  attempts: number;
}

export interface DB {
  requests: BloodRequest[];
  users: User[];
  otps: OtpEntry[];
  stats: { forwardsChecked: number; staleStopped: number; duplicatesMerged: number; scamsFlagged: number };
}

export interface Extracted {
  isBloodRequest: boolean;
  bloodGroup: BloodGroup | null;
  component: string;
  units: number;
  patient: string | null;
  hospital: string | null;
  area: string | null;
  city: string | null;
  contact: string | null;
  postedOn: string | null;
  neededBy: string | null;
  asksForMoney: boolean;
  suspiciousSignals: string[];
  language: string;
  summary: string;
}
