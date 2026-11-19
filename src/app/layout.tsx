import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "800"] });

export const metadata: Metadata = {
  title: "RaktSetu — blood requests from a screenshot",
  description: "Screenshot the patient details. RaktSetu posts a verified blood request and alerts only matching donors nearby.",
};

export const viewport: Viewport = { themeColor: "#060606" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} min-h-screen`}>
        <Nav />
        {children}
        <footer className="mt-24 border-t hair overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col md:flex-row gap-3 justify-between">
            <p><span className="label">A bridge for blood</span> <span className="ml-2">Built at Rewired, Bengaluru</span></p>
            <p>Not a blood bank. Always confirm with the hospital before donating.</p>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-6">
            <p className="wordmark text-rakt text-[15.5vw] md:text-[166px] select-none">RaktSetu</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
