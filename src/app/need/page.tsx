import Link from "next/link";
import Checker from "@/components/Checker";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Need() {
  const user = await currentUser();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-5xl md:text-6xl">🏥 I need blood</h1>
      <p className="text-muted mt-2 text-lg">Three steps. Takes about a minute.</p>

      <ol className="mt-8 grid md:grid-cols-3 gap-4">
        <Step n="1" done={Boolean(user)} title="Sign in with your phone" text={user ? `Signed in as ${user.name || user.contact}` : "So donors know you are a real family."}>
          {!user && <Link href="/login?next=/need" className="btn btn-primary mt-4 w-full">Sign in</Link>}
        </Step>
        <Step n="2" title="Post the request" text="Upload the screenshot you would forward on WhatsApp, or just say it out loud." />
        <Step n="3" title="Donors come to you" text="You see who is coming. When they reach the hospital, you tell them a 4-digit code." />
      </ol>

      {user ? (
        <>
          <section className="mt-10">
            <h2 className="font-display text-3xl">Option A: Upload the screenshot 📸</h2>
            <p className="text-muted mt-1 mb-4">The poster or WhatsApp message with the blood group, hospital and phone number.</p>
            <Checker />
          </section>
          <section className="mt-10 card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">Option B: Say it 🎙️</h2>
              <p className="text-muted mt-1">No screenshot? Speak in Kannada, Hindi or English. We make the request and a shareable poster for you.</p>
            </div>
            <Link href="/voice" className="btn btn-dark shrink-0">Speak your request →</Link>
          </section>
        </>
      ) : (
        <p className="mt-8 text-muted">Sign in first (step 1). Then you can upload a screenshot or speak your request.</p>
      )}
    </main>
  );
}

function Step({ n, title, text, done, children }: { n: string; title: string; text: string; done?: boolean; children?: React.ReactNode }) {
  return (
    <li className="card p-6 list-none">
      <span className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${done ? "bg-pulse" : "bg-rakt"}`}>{done ? "✓" : n}</span>
      <h3 className="font-semibold text-lg mt-3">{title}</h3>
      <p className="text-sm text-muted mt-1">{text}</p>
      {children}
    </li>
  );
}
