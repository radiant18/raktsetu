import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "RaktSetu — every blood forward, verified",
  description: "Turn forwarded blood-request screenshots into live, verified donor matches. Kill stale forwards. Reach the right donor in minutes.",
};

export const viewport: Viewport = { themeColor: "#c8102e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} min-h-screen`}>
        <Nav />
        {children}
        <footer className="mt-24 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-muted flex flex-col md:flex-row gap-3 justify-between">
            <p><span className="font-semibold text-ink">RaktSetu</span> · a bridge for blood · built at Rewired, Bengaluru</p>
            <p>Not a blood bank. Always confirm with the hospital before donating.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
