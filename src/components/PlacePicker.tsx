"use client";
import { PLACES, STATES } from "@/lib/places";
import { useT } from "./Lang";

export type Place = { state: string; city: string; locality: string };
export const DEFAULT_PLACE: Place = { state: "Karnataka", city: "Bengaluru", locality: "" };

// State → City dropdowns, plus an optional area/locality so nearby donors are matched more precisely.
export default function PlacePicker({ value, onChange, localityLabel = "Area / locality", highlight }: { value: Place; onChange: (p: Place) => void; localityLabel?: string; highlight?: boolean }) {
  const t = useT();
  const cities = value.state ? PLACES[value.state] ?? [] : [];
  const hl = highlight ? "!border-[#2fd39f]/40 !bg-[#2fd39f]/5" : "";
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-sm font-medium">{t("State")}</span>
        <select className={`input mt-1 ${hl}`} value={value.state} onChange={(e) => { const s = e.target.value; onChange({ ...value, state: s, city: PLACES[s]?.[0] ?? "" }); }}>
          <option value="">{t("Choose state")}</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("City")}</span>
        <select className={`input mt-1 ${hl}`} value={value.city} disabled={!value.state} onChange={(e) => onChange({ ...value, city: e.target.value })}>
          <option value="">{t("Choose city")}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="block col-span-2">
        <span className="text-sm font-medium">{t(localityLabel)} <span className="text-muted font-normal">{t("(optional)")}</span></span>
        <input className={`input mt-1 ${hl}`} placeholder={t("e.g. Koramangala, Old Airport Road")} value={value.locality} onChange={(e) => onChange({ ...value, locality: e.target.value })} />
      </label>
    </div>
  );
}
