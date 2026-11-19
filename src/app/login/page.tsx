import { Droplet, KeyRound, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { DropScene } from "@/components/Motion";
import { getT } from "@/lib/lang-server";

export default async function LoginPage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="grid lg:grid-cols-[1fr_1.05fr] gap-6 items-stretch">
        {/* Left: brand + 3D */}
        <div className="relative hidden lg:flex flex-col justify-between rounded-[28px] overflow-hidden border border-line bg-[radial-gradient(circle_at_50%_55%,#4a0610_0%,#1a0205_55%,#0b0102_100%)] p-8 min-h-[620px]">
          <DropScene />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,.75),transparent_35%,transparent_60%,rgba(0,0,0,.7))]" />
          <div className="relative pointer-events-none">
            <p className="label !text-white/70">{t("Verified accounts only")}</p>
            <h2 className="font-display text-4xl mt-4 text-white">{t("Every donor is real.")}<br /><span className="text-rakt">{t("Every family is real.")}</span></h2>
          </div>
          <ul className="relative pointer-events-none space-y-3 text-sm text-white/85">
            {([[ShieldCheck, "One phone code. No passwords."], [Droplet, "Only matching donors see your request"], [KeyRound, "Arrival codes stop fake promises"]] as const).map(([Ic, x]) => (
              <li key={x} className="rounded-2xl bg-black/40 backdrop-blur border border-white/10 px-4 py-3 flex items-center gap-3"><Ic className="h-4 w-4 text-rakt shrink-0" />{t(x)}</li>
            ))}
          </ul>
        </div>
        {/* Right: form */}
        <div className="flex items-center">
          <div className="w-full max-w-md mx-auto"><Suspense><LoginForm /></Suspense></div>
        </div>
      </div>
    </main>
  );
}
