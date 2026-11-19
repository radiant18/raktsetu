import type { Metadata, Viewport } from "next";
import { Inter, Unbounded, Noto_Sans_Devanagari, Noto_Sans_Kannada } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { LangProvider } from "@/components/Lang";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "800"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600", "800"] });
const knda = Noto_Sans_Kannada({ variable: "--font-knda", subsets: ["kannada"], weight: ["400", "600", "800"] });

export const metadata: Metadata = {
  title: "RaktSetu — blood requests from a screenshot",
  description: "Screenshot the patient details. RaktSetu posts a verified blood request and alerts only matching donors nearby.",
};

export const viewport: Viewport = { themeColor: "#060606" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  const t = (s: string) => tr(lang, s);
  return (
    <html lang={lang}>
      <body className={`${inter.variable} ${display.variable} ${deva.variable} ${knda.variable} min-h-screen`}>
        <LangProvider lang={lang}>
        <Nav />
        {children}
        <footer className="mt-24 border-t hair overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col md:flex-row gap-3 justify-between">
            <p><span className="label">{t("A bridge for blood")}</span> <span className="ml-2">{t("Built at Rewired, Bengaluru")}</span></p>
            <p>{t("Not a blood bank. Always confirm with the hospital before donating.")} · <a href="/terms" className="underline hover:text-ink">{t("Terms & Privacy")}</a></p>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-6">
            <p className="wordmark text-rakt text-[15.5vw] md:text-[166px] select-none">RaktSetu</p>
          </div>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
