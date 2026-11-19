#!/usr/bin/env python3
"""
RaktSetu WhatsApp automation (pywhatkit).

What it does
  1. Reads a WhatsApp chat you exported ("Export chat", with or without media).
  2. Keeps ONLY the blood-donation messages (English / Hindi / Kannada keywords).
  3. Sends each one (text or image) to RaktSetu, which checks it with AI:
     live / already posted / old / possible scam, and posts real new requests.
  4. Uses pywhatkit to send the result + the live RaktSetu link back on WhatsApp,
     to a number or a group you choose.
  5. Remembers what it already handled, so running it again only does new messages.
     With --watch it keeps checking the export file / folder and handles new ones.

Why an export and not "reading WhatsApp" directly
  pywhatkit can only SEND messages (it opens WhatsApp Web and types). It cannot read
  chats. Reading chats by scraping WhatsApp Web breaks WhatsApp's terms and can get the
  number banned, and it would pull in other people's private messages. An export is
  the official way to take messages out of WhatsApp, and you choose which chat.

Setup
  pip install pywhatkit
  Log in to https://web.whatsapp.com once in your default browser.
  In WhatsApp: open the group -> (three dots) -> More -> Export chat -> Include media.

Examples
  # see what it would send, without opening WhatsApp
  python3 raktsetu_whatsapp.py "WhatsApp Chat with Blood Donors BLR.zip" --to +919845012345 --dry-run

  # send results to one number
  python3 raktsetu_whatsapp.py "WhatsApp Chat with Blood Donors BLR.zip" --to +919845012345

  # send results to a group (the code at the end of the group's invite link)
  python3 raktsetu_whatsapp.py export_folder/ --group AbCdEfGhIjK123 --watch
"""
import argparse, json, os, re, sys, tempfile, time, uuid, zipfile, mimetypes
from datetime import datetime
from pathlib import Path
from urllib import request as urlreq, error as urlerr

SITE = os.environ.get("RAKTSETU_URL", "https://raktsetu-red.vercel.app")
STATE = Path("raktsetu_sent.json")
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Blood-donation words in English, Hindi and Kannada
KEYWORDS = [
    r"\bblood\b", r"\bdonors?\b", r"\bdonat", r"\bplatelets?\b", r"\bplasma\b", r"\bpcv\b", r"\bsdp\b",
    r"\b(a|b|ab|o)\s*(\+|-|−|\bpos(itive)?\b|\bneg(ative)?\b|\s?ve\b)",
    "खून", "रक्त", "रक्तदान", "डोनर", "ರಕ್ತ", "ರಕ್ತದಾನ", "ದಾನಿ",
]
KW = re.compile("|".join(KEYWORDS), re.IGNORECASE)

# Export line formats:  "19/11/2026, 9:42 am - Arjun: text"  or  "[19/11/26, 09:42:10] Arjun: text"
LINE = re.compile(r"^\[?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+([\d:]+\s*(?:[ap]\.?\s?m\.?)?)\]?\s*[-–]?\s*([^:]+):\s*(.*)$", re.IGNORECASE)
ATTACH = re.compile(r"<attached:\s*([^>]+)>|([\w\-.]+\.(?:jpe?g|png|webp|gif))\s*\(file attached\)", re.IGNORECASE)
SKIP = re.compile(r"<Media omitted>|This message was deleted|Messages and calls are end-to-end encrypted", re.IGNORECASE)

VERDICT = {
    "created": "🟢 NEW request, now live on RaktSetu",
    "active": "🟢 STILL NEEDED",
    "unverified": "🟡 Live, but please call and double-check",
    "duplicate": "🔁 Already on RaktSetu, please share the link instead",
    "stale": "⌛ OLD message, please don't forward",
    "fulfilled": "🛑 DONE, blood arranged. Please stop forwarding",
    "flagged": "🚨 Possible scam. Do not pay anyone",
}


# ---------- RaktSetu API ----------

def _post(fields: dict, file: Path | None = None, retries: int = 2) -> dict:
    boundary = "----raktsetu" + uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    if file:
        ctype = mimetypes.guess_type(file.name)[0] or "image/jpeg"
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{file.name}"\r\n'
                 f"Content-Type: {ctype}\r\n\r\n").encode() + file.read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urlreq.Request(f"{SITE}/api/check", data=body, method="POST",
                         headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "User-Agent": "raktsetu-whatsapp/1.0"})
    for attempt in range(retries + 1):
        try:
            with urlreq.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urlerr.HTTPError as e:
            try:
                return {"verdict": "error", "error": json.loads(e.read()).get("error", str(e))}
            except Exception:
                return {"verdict": "error", "error": str(e)}
        except Exception as e:
            if attempt == retries:
                return {"verdict": "error", "error": str(e)}
            time.sleep(2 * (attempt + 1))
    return {"verdict": "error", "error": "unknown"}


def check(msg: dict) -> dict:
    if msg.get("image"):
        if msg["image"].stat().st_size > 8 * 1024 * 1024:
            return {"verdict": "error", "error": "image larger than 8 MB"}
        return _post({}, msg["image"])
    return _post({"text": msg["text"][:2000]})


# ---------- reading the export ----------

def open_export(src: Path):
    """Return (chat .txt path, {file name: media path}, temp dir to clean up)."""
    tmp = None
    if src.suffix.lower() == ".zip":
        tmp = tempfile.TemporaryDirectory()
        with zipfile.ZipFile(src) as z:
            z.extractall(tmp.name)
        root = Path(tmp.name)
    elif src.is_dir():
        root = src
    elif src.suffix.lower() == ".txt":
        root = src.parent
    else:
        sys.exit("❌ Give the exported .zip, the folder it unzips to, or the chat .txt file")
    chats = [src] if src.suffix.lower() == ".txt" else sorted(root.rglob("*.txt"))
    if not chats:
        sys.exit("❌ No chat .txt found. In WhatsApp: open the chat → ⋮ → More → Export chat.")
    media = {p.name: p for p in root.rglob("*") if p.suffix.lower() in IMAGE_EXT and p.is_file()}
    return chats[0], media, tmp


def blood_messages(chat: Path, media: dict) -> list[dict]:
    msgs: list[dict] = []
    for raw in chat.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.replace("‎", "").replace(" ", " ").strip()
        m = LINE.match(line)
        if m:
            msgs.append({"date": m.group(1), "time": m.group(2).strip(), "who": m.group(3).strip(), "text": m.group(4)})
        elif msgs:
            msgs[-1]["text"] += "\n" + line  # multi-line message
    out = []
    for i, msg in enumerate(msgs):
        if SKIP.search(msg["text"]):
            continue
        a = ATTACH.search(msg["text"])
        image = media.get((a.group(1) or a.group(2)).strip()) if a else None
        text = ATTACH.sub("", msg["text"]).strip()
        # an image counts if it or the messages right around it talk about blood
        around = " ".join(msgs[j]["text"] for j in range(max(0, i - 1), min(len(msgs), i + 2)))
        if image and KW.search(around):
            out.append({**msg, "text": text or around, "image": image})
        elif not image and len(text) >= 15 and KW.search(text):
            out.append({**msg, "text": text, "image": None})
    return out


def key_of(msg: dict) -> str:
    return f'{msg["date"]}|{msg["time"]}|{msg["who"]}|{msg["text"][:80]}'


# ---------- sending on WhatsApp ----------

def reply_text(msg: dict, res: dict) -> str | None:
    v = res.get("verdict")
    if v in (None, "error", "not_a_request"):
        return None
    r = res.get("request") or {}
    x = res.get("extracted") or {}
    group = r.get("bloodGroup") or x.get("bloodGroup") or "?"
    hosp = r.get("hospital") or x.get("hospital") or "hospital not given"
    units = r.get("units") or x.get("units") or 1
    lines = [f"🩸 *RaktSetu check* (message from {msg['who']}, {msg['date']} {msg['time']})",
             VERDICT.get(v, v), f"{group} · {units} unit(s) · {hosp}"]
    for reason in (res.get("reasons") or [])[:2]:
        lines.append(f"• {reason}")
    if r.get("id"):
        lines.append(f"Live status: {SITE}/r/{r['id']}")
    return "\n".join(lines)


def send(text: str, to: str | None, group: str | None, dry: bool, wait: int) -> bool:
    if dry:
        print("   ── would send ──\n   " + text.replace("\n", "\n   "))
        return True
    try:
        import pywhatkit as kit  # imported late so --dry-run works without it
    except ImportError:
        sys.exit("❌ pywhatkit is not installed. Run:  pip install pywhatkit")
    try:
        if group:
            kit.sendwhatmsg_to_group_instantly(group, text, wait_time=wait, tab_close=True, close_time=4)
        else:
            kit.sendwhatmsg_instantly(to, text, wait_time=wait, tab_close=True, close_time=4)
        return True
    except Exception as e:  # browser not logged in, wrong number, etc.
        print(f"   ❌ WhatsApp send failed: {e}")
        return False


# ---------- main ----------

def load_state() -> dict:
    try:
        return json.loads(STATE.read_text())
    except Exception:
        return {}


def run_once(src: Path, args, state: dict) -> int:
    chat, media, tmp = open_export(src)
    try:
        todo = [m for m in blood_messages(chat, media) if key_of(m) not in state]
        print(f"💬 {chat.name}: {len(todo)} new blood-related message(s)")
        sent = 0
        for m in todo[: args.limit]:
            kind = f"📸 {m['image'].name}" if m["image"] else "✍️ text"
            print(f"\n{kind} · {m['who']} · {m['date']} {m['time']}\n   {m['text'][:110].replace(chr(10), ' ')}")
            res = check(m)
            v = res.get("verdict", "error")
            print(f"   → {VERDICT.get(v, v)}{'  ' + res.get('error', '') if v == 'error' else ''}")
            msg = reply_text(m, res)
            ok = True
            if msg and (v not in ("duplicate", "active") or args.all):
                ok = send(msg, args.to, args.group, args.dry_run, args.wait)
                sent += ok
                if ok and not args.dry_run:
                    time.sleep(args.gap)  # don't spam WhatsApp
            if ok and v != "error" and not args.dry_run:
                state[key_of(m)] = {"verdict": v, "at": datetime.now().isoformat(timespec="seconds"),
                                    "link": f"{SITE}/r/{(res.get('request') or {}).get('id')}" if (res.get("request") or {}).get("id") else None}
                STATE.write_text(json.dumps(state, indent=1, ensure_ascii=False))
        print(f"\n✅ Done: {sent} WhatsApp message(s) {'previewed' if args.dry_run else 'sent'}. Memory: {STATE.resolve()}")
        return sent
    finally:
        if tmp:
            tmp.cleanup()


def main():
    global SITE
    ap = argparse.ArgumentParser(description="Check blood-donation messages from a WhatsApp export on RaktSetu and send the results on WhatsApp (pywhatkit).")
    ap.add_argument("src", help="exported chat: .zip, unzipped folder, or the .txt file")
    who = ap.add_mutually_exclusive_group(required=True)
    who.add_argument("--to", help="send results to this number, with country code, e.g. +919845012345")
    who.add_argument("--group", help="send results to this group (the code at the end of its invite link)")
    ap.add_argument("--dry-run", action="store_true", help="check messages and print the replies, but don't open WhatsApp")
    ap.add_argument("--watch", action="store_true", help="keep running and handle new messages as the export is updated")
    ap.add_argument("--every", type=int, default=60, help="seconds between checks in --watch mode (default 60)")
    ap.add_argument("--limit", type=int, default=20, help="max messages per run (default 20)")
    ap.add_argument("--all", action="store_true", help="also send a reply for requests that are already on RaktSetu")
    ap.add_argument("--wait", type=int, default=15, help="seconds to let WhatsApp Web load before typing (default 15)")
    ap.add_argument("--gap", type=int, default=8, help="seconds between WhatsApp messages (default 8)")
    ap.add_argument("--site", help=f"RaktSetu URL (default {SITE})")
    args = ap.parse_args()
    if args.site:
        SITE = args.site.rstrip("/")
    if args.to and not re.fullmatch(r"\+\d{10,15}", args.to):
        sys.exit("❌ --to needs the country code, e.g. +919845012345")

    src = Path(args.src).expanduser()
    if not src.exists():
        sys.exit(f"❌ Not found: {src}")
    print(f"🩸 RaktSetu WhatsApp → {SITE}  ({'dry run, nothing will be sent' if args.dry_run else 'sending with pywhatkit'})")
    state = load_state()
    if not args.watch:
        run_once(src, args, state)
        return
    print(f"👀 Watching {src}. Re-export the chat into the same place to pick up new messages. Ctrl+C to stop.")
    last = None
    try:
        while True:
            stamp = max((p.stat().st_mtime for p in ([src] if src.is_file() else src.rglob("*"))), default=0)
            if stamp != last:
                last = stamp
                run_once(src, args, state)
            time.sleep(args.every)
    except KeyboardInterrupt:
        print("\n👋 Stopped.")


if __name__ == "__main__":
    main()
