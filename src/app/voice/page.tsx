import { currentUser } from "@/lib/auth";
import VoiceRequest from "./VoiceRequest";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const u = await currentUser();
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs uppercase tracking-[.25em] text-muted">For families in an emergency</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3 max-w-3xl">No forms in the ICU. <span className="text-rakt">Just speak.</span></h1>
      <p className="text-muted mt-4 max-w-2xl">Record one voice note in Kannada, Hindi or English. RaktSetu turns it into a live request and a verified poster with a QR code — the only forward that knows when to stop.</p>
      <div className="mt-10"><VoiceRequest signedIn={Boolean(u?.name)} /></div>
    </main>
  );
}
