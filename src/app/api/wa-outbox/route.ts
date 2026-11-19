import { NextResponse } from "next/server";
import { markSent, pending } from "@/lib/waqueue";

// Used by scripts/raktsetu_wa_sender.py: GET pending WhatsApp messages, POST {ids} to mark them sent.
const ok = (req: Request) => {
  const key = process.env.WA_WORKER_KEY;
  return Boolean(key) && req.headers.get("x-worker-key") === key;
};

export async function GET(req: Request) {
  if (!ok(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ messages: await pending() });
}

export async function POST(req: Request) {
  if (!ok(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };
  return NextResponse.json({ marked: await markSent(Array.isArray(ids) ? ids.slice(0, 50).map(String) : []) });
}
