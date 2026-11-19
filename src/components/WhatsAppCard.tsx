// "Use RaktSetu on WhatsApp": works only after the person has an account with the same number.
const NUMBER = (process.env.NEXT_PUBLIC_WA_NUMBER || "+14155238886").replace(/\D/g, "");
const JOIN = process.env.NEXT_PUBLIC_WA_JOIN || ""; // Twilio sandbox code, e.g. "join happy-tiger"

export default function WhatsAppCard({ phone }: { phone?: string | null }) {
  const first = JOIN || "HI";
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(first)}`;
  return (
    <div className="card p-6 md:p-8 grid md:grid-cols-[1.3fr_1fr] gap-6 items-center">
      <div>
        <p className="label">WhatsApp bot</p>
        <h2 className="font-display text-2xl md:text-3xl mt-3">Use RaktSetu right inside WhatsApp</h2>
        <ul className="mt-4 space-y-2 text-muted">
          <li>📸 <b className="text-ink">Hospitals and families:</b> send a screenshot or type the need. It goes live here and matching donors get a message.</li>
          <li>🩸 <b className="text-ink">Donors:</b> get alerts, reply <b className="text-ink">YES</b> to go, or send <b className="text-ink">DONATE</b> to check if you can give today.</li>
          <li>🔒 Works only for numbers with a RaktSetu account{phone ? <> (yours: <b className="text-ink">{phone}</b>)</> : null}, so every request stays real.</li>
        </ul>
      </div>
      <div className="rounded-3xl bg-[#0b2a1c] border border-[#25d366]/30 p-5">
        <p className="text-sm text-[#9be7b8]">Step 1 · open WhatsApp and send</p>
        <p className="font-mono text-lg mt-1 text-white">{first}</p>
        <p className="text-sm text-[#9be7b8] mt-3">to <b>+{NUMBER}</b></p>
        <a href={href} target="_blank" rel="noopener" className="btn w-full mt-4 !bg-[#25d366] !text-black font-semibold">💬 Open WhatsApp</a>
        {JOIN && <p className="text-xs text-[#9be7b8]/80 mt-3">Then send <b>HI</b> to see the menu.</p>}
      </div>
    </div>
  );
}
