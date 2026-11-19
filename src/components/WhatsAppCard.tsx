import { Camera, Droplet, Lock, MessageCircle } from "lucide-react";
// "Use RaktSetu on WhatsApp": works only after the person has an account with the same number.
import { getT } from "@/lib/lang-server";
const NUMBER = (process.env.NEXT_PUBLIC_WA_NUMBER || "+14155238886").replace(/\D/g, "");
const JOIN = process.env.NEXT_PUBLIC_WA_JOIN || ""; // Twilio sandbox code, e.g. "join happy-tiger"

export default async function WhatsAppCard({ phone }: { phone?: string | null }) {
  const t = await getT();
  const first = JOIN || "HI";
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(first)}`;
  return (
    <div className="card p-6 md:p-8 grid md:grid-cols-[1.3fr_1fr] gap-6 items-center">
      <div>
        <p className="label">{t("WhatsApp bot")}</p>
        <h2 className="font-display text-2xl md:text-3xl mt-3">{t("Use RaktSetu right inside WhatsApp")}</h2>
        <ul className="mt-4 space-y-2 text-muted">
          <li className="flex gap-2.5"><Camera className="ic mt-1 text-rakt shrink-0" /><span><b className="text-ink">{t("Hospitals and families:")}</b> {t("send a screenshot or type the need. It goes live here and matching donors get a message.")}</span></li>
          <li className="flex gap-2.5"><Droplet className="ic mt-1 text-rakt shrink-0" /><span><b className="text-ink">{t("Donors:")}</b> {t("get alerts, reply YES to go, or send DONATE to check if you can give today.")}</span></li>
          <li className="flex gap-2.5"><Lock className="ic mt-1 text-rakt shrink-0" /><span>{t("Works only for numbers with a RaktSetu account, so every request stays real.")}{phone ? <> (<b className="text-ink">{phone}</b>)</> : null}</span></li>
        </ul>
      </div>
      <div className="rounded-3xl bg-[#0b2a1c] border border-[#25d366]/30 p-5">
        <p className="text-sm text-[#9be7b8]">{t("Step 1 · open WhatsApp and send")}</p>
        <p className="font-mono text-lg mt-1 text-white">{first}</p>
        <p className="text-sm text-[#9be7b8] mt-3">{t("to")} <b>+{NUMBER}</b></p>
        <a href={href} target="_blank" rel="noopener" className="btn w-full mt-4 !bg-[#25d366] !text-black font-semibold"><MessageCircle className="ic" /> {t("Open WhatsApp")}</a>
        {JOIN && <p className="text-xs text-[#9be7b8]/80 mt-3">Then send <b>HI</b> to see the menu.</p>}
      </div>
    </div>
  );
}
