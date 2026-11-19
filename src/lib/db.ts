import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { get, put } from "@vercel/blob";
import type { DB } from "./types";
import { seedDonors } from "./seed";

// Storage: one JSON document. Supabase (table `kv`) in production, a local file in dev.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;
const BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const BLOB_PATH = "raktsetu/db.json";
const FILE = path.join(process.cwd(), ".data", "db.json");

function empty(): DB {
  return {
    requests: [],
    users: seedDonors(),
    otps: [],
    stats: { forwardsChecked: 0, staleStopped: 0, duplicatesMerged: 0, scamsFlagged: 0 },
  };
}

export async function readDB(): Promise<DB> {
  if (BLOB && !supabase) {
    const res = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) {
      const fresh = empty();
      await writeDB(fresh);
      return fresh;
    }
    return JSON.parse(await new Response(res.stream).text()) as DB;
  }
  if (supabase) {
    const { data, error } = await supabase.from("kv").select("value").eq("key", "db").maybeSingle();
    if (error) throw new Error("DB read failed: " + error.message);
    if (!data) {
      const fresh = empty();
      await writeDB(fresh);
      return fresh;
    }
    return data.value as DB;
  }
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch {
    const fresh = empty();
    await writeDB(fresh);
    return fresh;
  }
}

export async function writeDB(db: DB): Promise<void> {
  if (BLOB && !supabase) {
    await put(BLOB_PATH, JSON.stringify(db), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json", cacheControlMaxAge: 60 });
    return;
  }
  if (supabase) {
    const { error } = await supabase.from("kv").upsert({ key: "db", value: db });
    if (error) throw new Error("DB write failed: " + error.message);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

// Serialise writes inside one server instance so concurrent requests don't clobber each other.
let chain: Promise<unknown> = Promise.resolve();
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await readDB();
    const out = await fn(db);
    await writeDB(db);
    return out;
  });
  chain = run.catch(() => undefined);
  return run;
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
