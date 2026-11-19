import { Mic } from "lucide-react";
import Link from "next/link";
import NeedForm from "./NeedForm";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

export default async function Need() {
  const [user, t] = await Promise.all([currentUser(), getT()]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="label">{t("01 · I need blood")}</p>
      <h1 className="font-display text-4xl md:text-6xl mt-4">{t("Screenshot in.")}<br /><span className="text-rakt">{t("Donors out.")}</span></h1>
      <p className="text-muted mt-4 text-lg max-w-2xl">{t("Add a screenshot of the patient details. AI fills in the patient name, hospital and blood group. You check it and press Post.")}</p>

      {!user ? (
        <div className="mt-8 card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-lg">{t("First, sign in with your phone")}</p>
            <p className="text-sm text-muted">{t("So donors know you are a real family. Takes 20 seconds.")}</p>
          </div>
          <Link href="/login?next=/need" className="btn btn-primary shrink-0">{t("Sign in")}</Link>
        </div>
      ) : (
        <>
          <div className="mt-8"><NeedForm /></div>
          <div className="mt-6 border-t hair pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-muted"><b className="text-ink">{t("No screenshot?")}</b> {t("Say it out loud in Kannada, Hindi or English.")}</p>
            <Link href="/voice" className="btn btn-ghost shrink-0"><Mic className="ic" /> {t("Speak your request")}</Link>
          </div>
        </>
      )}
    </main>
  );
}
