import type { BloodGroup, User } from "./types";

// Demo donor network across Bengaluru so matching has someone to find.
const AREAS: [string, number, number][] = [
  ["Koramangala", 12.9352, 77.6245],
  ["Indiranagar", 12.9719, 77.6412],
  ["Jayanagar", 12.925, 77.5938],
  ["Whitefield", 12.9698, 77.75],
  ["HSR Layout", 12.9116, 77.6474],
  ["Malleshwaram", 13.0035, 77.5709],
  ["BTM Layout", 12.9166, 77.6101],
  ["Rajajinagar", 12.9915, 77.5546],
  ["Hebbal", 13.0358, 77.597],
  ["Electronic City", 12.8452, 77.6602],
  ["Marathahalli", 12.9591, 77.6974],
  ["Basavanagudi", 12.9406, 77.5738],
  ["Yelahanka", 13.1007, 77.5963],
  ["JP Nagar", 12.9063, 77.5857],
  ["Old Airport Road", 12.9606, 77.6462],
  ["Frazer Town", 12.9982, 77.6146],
];
const NAMES = [
  "Ananya R", "Rahul K", "Priya S", "Mohammed I", "Deepa N", "Arjun M", "Kavya P", "Sameer A",
  "Lakshmi V", "Vikram G", "Fatima Z", "Nikhil B", "Sneha D", "Rohan T", "Meera J", "Karthik H",
  "Ayesha K", "Suresh P", "Divya L", "Imran S", "Pooja M", "Aditya C", "Nandini R", "Farhan Q",
];
const GROUPS: BloodGroup[] = ["O+", "B+", "A+", "O+", "AB+", "B+", "O-", "A+", "B-", "O+", "A-", "AB-"];

export function seedDonors(): User[] {
  return NAMES.map((name, i) => {
    const [area, lat, lng] = AREAS[i % AREAS.length];
    const last = i % 5 === 0 ? new Date(Date.now() - 40 * 86400000).toISOString() : i % 3 === 0 ? new Date(Date.now() - 150 * 86400000).toISOString() : null;
    return {
      id: "demo_" + i,
      contact: `donor${i}@demo.raktsetu`,
      name,
      role: "donor",
      bloodGroup: GROUPS[i % GROUPS.length],
      area,
      lat: lat + ((i * 37) % 10) / 1000,
      lng: lng + ((i * 53) % 10) / 1000,
      language: (["kn", "hi", "en"] as const)[i % 3],
      trust: 50 + ((i * 17) % 50),
      donations: (i * 3) % 9,
      noShows: i % 7 === 0 ? 1 : 0,
      lastDonation: last,
      passportVerified: i % 2 === 0,
      blocked: false,
      createdAt: new Date().toISOString(),
      demo: true,
    } satisfies User;
  });
}
