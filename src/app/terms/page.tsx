import Link from "next/link";

export const metadata = { title: "Terms and Conditions · RaktSetu" };

const SECTIONS: [string, string[]][] = [
  ["What RaktSetu is", [
    "RaktSetu is a free platform that connects people who need blood with voluntary donors nearby. We are not a blood bank, hospital or medical service.",
    "We do not collect, test, store or supply blood. Every donation happens at a licensed hospital or blood bank, under their own rules and medical checks.",
  ]],
  ["Who can use it", [
    "You must be at least 18 years old and verify your mobile number or email with a one-time code.",
    "Donors must meet the hospital's eligibility rules (usually age 18 to 65, weight over 50 kg, good health). The hospital has the final say, not RaktSetu.",
    "One account per person. Your WhatsApp bot access works only with the same number as your account.",
  ]],
  ["Blood is never for sale", [
    "Buying or selling blood is illegal in India. Never pay, or ask for, money for blood or for a donor.",
    "Requests asking for payment, bank transfers or UPI are flagged as possible scams and may be removed.",
    "Hospitals may charge standard processing fees. RaktSetu itself is free and never asks for money.",
  ]],
  ["Posting a request", [
    "Only post real, current requests. You confirm the patient, hospital, blood group and contact details are true.",
    "Screenshots and messages are read by AI. Always check the details before posting; you are responsible for what you post.",
    "Close your request as soon as blood is arranged, ideally with the blood bank issue slip, so donors stop being alerted.",
    "Fake, old or duplicate requests may be removed. Accounts that post fake requests will be blocked.",
  ]],
  ["Donating through RaktSetu", [
    "Only accept a request if you really intend to go. Accepting tells the family you are on the way.",
    "Confirm your arrival with the family's 4-digit code. Arrivals raise your trust score; no-shows lower it.",
    "After 3 no-shows your account is restricted from accepting requests.",
    "After a donation you will not get alerts for 90 days, to protect your health.",
  ]],
  ["Alerts and WhatsApp", [
    "By creating an account you agree to receive blood request alerts by SMS, WhatsApp or on the website, in the language you choose.",
    "You can stop alerts at any time by changing your profile or replying STOP on WhatsApp.",
    "Standard WhatsApp and carrier charges from your provider may apply.",
  ]],
  ["Your data and privacy", [
    "We store your name, contact, blood group, area, language and donation history to match you with requests. We never sell your data.",
    "Your exact location is never shown to others. Families see your name and distance only after you accept.",
    "Request details you post (patient name, hospital, contact) are visible to logged-in users so donors can help.",
    "We handle personal data in line with India's Digital Personal Data Protection Act, 2023. You can ask us to delete your account and data at any time.",
  ]],
  ["Medical disclaimer", [
    "Nothing on RaktSetu is medical advice. Blood group compatibility shown is general guidance; the hospital always cross-matches before transfusion.",
    "In an emergency, contact the hospital or call 108 first.",
  ]],
  ["Limits of our responsibility", [
    "We try to keep requests real and current, but we cannot guarantee that every request is genuine or that a donor will arrive.",
    "RaktSetu is not responsible for medical outcomes, hospital decisions, or anything that happens between users outside the platform.",
    "We may suspend accounts that break these terms or misuse the platform.",
  ]],
  ["Changes and contact", [
    "We may update these terms. If the changes are important, we will tell you on the website before they apply.",
    "These terms follow the laws of India, with courts in Bengaluru, Karnataka.",
  ]],
];

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="label">Legal</p>
      <h1 className="font-display text-4xl md:text-5xl mt-3">Terms and Conditions</h1>
      <p className="text-muted mt-3">Last updated 19 November 2026. Plain English, no tricks. By using RaktSetu you agree to these terms.</p>
      <nav className="card p-5 mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {SECTIONS.map(([t], i) => <a key={t} href={`#s${i + 1}`} className="text-muted hover:text-ink">{i + 1}. {t}</a>)}
      </nav>
      <div className="mt-10 space-y-10">
        {SECTIONS.map(([t, items], i) => (
          <section key={t} id={`s${i + 1}`} className="scroll-mt-24">
            <h2 className="font-display text-2xl"><span className="text-rakt">{String(i + 1).padStart(2, "0")}</span> {t}</h2>
            <ul className="mt-4 space-y-2.5 text-muted list-disc pl-5 marker:text-rakt">
              {items.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <div className="card p-6 mt-12 flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">Questions about these terms or your data? Message the team at the help desk.</p>
        <Link href="/" className="btn btn-primary">Back to RaktSetu</Link>
      </div>
    </main>
  );
}
