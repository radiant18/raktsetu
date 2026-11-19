"use client";
import { useState } from "react";
import { useT } from "./Lang";

const GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
type G = (typeof GROUPS)[number];
const RECEIVE: Record<G, G[]> = {
  "O-": ["O-"], "O+": ["O-", "O+"], "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"], "AB-": ["O-", "A-", "B-", "AB-"], "AB+": [...GROUPS],
};
const GIVE = (g: G) => GROUPS.filter((x) => RECEIVE[x].includes(g));

// Interactive: tap your blood group, see who you can give to / get from. Matches flip in 3D.
export default function BloodMatch() {
  const t = useT();
  const [me, setMe] = useState<G>("O-");
  const [mode, setMode] = useState<"give" | "get">("give");
  const set = mode === "give" ? GIVE(me) : RECEIVE[me];
  const fact = me === "O-" && mode === "give" ? t("O− is the universal donor: your blood can go to anyone.") : me === "AB+" && mode === "get" ? t("AB+ is the universal receiver: you can take blood from anyone.") : `${me} ${t(mode === "give" ? "can give to" : "can get blood from")} ${set.length} ${t("of 8 groups.")}`;

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">{t("Try it")}</p>
          <h2 className="font-display text-3xl md:text-4xl mt-3">{t("Who can you save?")}</h2>
        </div>
        <div className="flex rounded-full bg-mist p-1 text-sm">
          {(["give", "get"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-full font-semibold transition ${mode === m ? "bg-white text-black" : "text-muted"}`}>{t(m === "give" ? "I can give to" : "I can get from")}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-4 md:grid-cols-8 gap-3" style={{ perspective: 800 }}>
        {GROUPS.map((g) => {
          const on = set.includes(g), mine = g === me;
          return (
            <button key={`${g}-${me}-${mode}`} onClick={() => setMe(g)} aria-pressed={mine}
              className={`flip aspect-square rounded-2xl font-display text-xl md:text-3xl border ${mine ? "bg-white text-black border-white" : on ? "bg-rakt text-white border-rakt" : "bg-[#141414] text-muted border-line opacity-50"}`}
              style={{ animationDelay: `${GROUPS.indexOf(g) * 45}ms` }}>
              {g}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-muted"><b className="text-ink">{t("Tap your group.")}</b> {fact} {t("RaktSetu only alerts donors whose blood actually matches.")}</p>
    </div>
  );
}
