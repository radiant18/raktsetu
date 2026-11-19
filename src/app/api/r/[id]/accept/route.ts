import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { acceptRequest } from "@/lib/accept";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uidv = await currentUserId();
  if (!uidv) return NextResponse.json({ error: "Sign in with OTP to accept a request." }, { status: 401 });
  const out = await mutate((db) => {
    const res = acceptRequest(db, db.requests.find((x) => x.id === id), db.users.find((x) => x.id === uidv));
    return "error" in res ? res : { ok: true, distanceKm: res.distanceKm };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
