import { del, get, list, put } from "@vercel/blob";
import { mutate, readDB } from "./db";
import type { WaMessage } from "./types";

// One blob per message, so parallel requests can never overwrite each other's messages.
const BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const DIR = "raktsetu/wa/";

export async function enqueue(m: WaMessage): Promise<void> {
  if (BLOB) {
    await put(`${DIR}${m.at.replace(/[:.]/g, "-")}_${m.id}.json`, JSON.stringify(m), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
    return;
  }
  await mutate((db) => { (db.waOutbox ??= []).push(m); db.waOutbox = db.waOutbox.slice(-300); });
}

export async function pending(limit = 20): Promise<WaMessage[]> {
  if (BLOB) {
    const { blobs } = await list({ prefix: DIR, limit: 100 });
    const files = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname)).slice(0, limit);
    const out = await Promise.all(files.map(async (b) => {
      const r = await get(b.pathname, { access: "private", useCache: false }).catch(() => null);
      return r && r.statusCode === 200 ? (JSON.parse(await new Response(r.stream).text()) as WaMessage) : null;
    }));
    return out.filter((x): x is WaMessage => Boolean(x));
  }
  return ((await readDB()).waOutbox ?? []).filter((m) => !m.sentAt).slice(0, limit);
}

export async function markSent(ids: string[]): Promise<number> {
  const set = new Set(ids);
  if (BLOB) {
    const { blobs } = await list({ prefix: DIR, limit: 1000 });
    const hit = blobs.filter((b) => set.has(b.pathname.split("_").pop()!.replace(/\.json$/, "")));
    if (hit.length) await del(hit.map((b) => b.url));
    return hit.length;
  }
  return mutate((db) => {
    let c = 0;
    for (const m of db.waOutbox ?? []) if (set.has(m.id) && !m.sentAt) { m.sentAt = new Date().toISOString(); c++; }
    return c;
  });
}
