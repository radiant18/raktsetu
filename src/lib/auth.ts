import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { readDB } from "./db";
import type { User } from "./types";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "raktsetu-dev-secret-change-me");
const COOKIE = "rs_session";

export function hashCode(contact: string, code: string) {
  return crypto.createHash("sha256").update(contact.toLowerCase() + ":" + code + ":" + (process.env.SESSION_SECRET || "dev")).digest("hex");
}

export function newOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function normaliseContact(raw: string): { contact: string; kind: "email" | "phone" } | null {
  const s = raw.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { contact: s, kind: "email" };
  const d = s.replace(/\D/g, "");
  if (d.length === 10 && /^[6-9]/.test(d)) return { contact: "+91" + d, kind: "phone" };
  if (d.length === 12 && d.startsWith("91")) return { contact: "+" + d, kind: "phone" };
  return null;
}

export async function startSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(SECRET);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<User | null> {
  const id = await currentUserId();
  if (!id) return null;
  const db = await readDB();
  return db.users.find((u) => u.id === id) ?? null;
}

// Email OTP delivery via Resend when configured; otherwise demo mode shows the code on screen.
export async function deliverOtp(contact: string, kind: "email" | "phone", code: string): Promise<{ delivered: boolean; demoCode?: string }> {
  if (kind === "email" && process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.OTP_FROM || "RaktSetu <onboarding@resend.dev>",
          to: [contact],
          subject: `Your RaktSetu code: ${code}`,
          text: `Your RaktSetu verification code is ${code}. It expires in 10 minutes. Never share it with anyone.`,
        }),
      });
      if (r.ok) return { delivered: true };
    } catch {
      /* fall back to demo */
    }
  }
  return { delivered: false, demoCode: code };
}
