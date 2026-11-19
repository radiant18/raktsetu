import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { LangProvider } from "@/components/Lang";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "800"] });

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
      {lang !== "en" && (
        <head>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${lang === "hi" ? "Noto+Sans+Devanagari" : "Noto+Sans+Kannada"}:wght@400;600;800&display=swap`} />
        </head>
      )}
      <body className={`${inter.variable} ${display.variable} min-h-screen`}>
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
