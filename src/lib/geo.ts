// Find coordinates for a hospital using OpenStreetMap (Nominatim). Falls back to central Bengaluru.
const BLR: [number, number] = [12.9716, 77.5946];

const KNOWN: Record<string, [number, number]> = {
  manipal: [12.9592, 77.6489],
  "st. john": [12.9298, 77.6203],
  "st john": [12.9298, 77.6203],
  narayana: [12.8104, 77.6956],
  victoria: [12.9638, 77.5737],
  nimhans: [12.9431, 77.5963],
  fortis: [12.8935, 77.5978],
  apollo: [12.8963, 77.5985],
  kidwai: [12.9378, 77.5967],
  bowring: [12.9839, 77.6047],
  sakra: [12.9325, 77.6849],
  aster: [13.0503, 77.5925],
  columbia: [13.0105, 77.5537],
  "ms ramaiah": [13.0306, 77.5651],
  ramaiah: [13.0306, 77.5651],
  vani: [12.9616, 77.5754],
  indira: [12.9389, 77.5985],
};

export async function locate(hospital: string | null, area: string | null, city: string | null): Promise<[number, number]> {
  const key = (hospital ?? "").toLowerCase();
  for (const k of Object.keys(KNOWN)) if (key.includes(k)) return KNOWN[k];
  const q = [hospital, area, city ?? "Bengaluru"].filter(Boolean).join(", ");
  if (!q) return BLR;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "RaktSetu-prototype/0.1" },
      signal: AbortSignal.timeout(4000),
    });
    const j = (await res.json()) as { lat: string; lon: string }[];
    if (j[0]) return [Number(j[0].lat), Number(j[0].lon)];
  } catch {
    /* fall through */
  }
  return BLR;
}
