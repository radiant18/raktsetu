#!/usr/bin/env python3
"""
RaktSetu auto-scanner: sends blood-request screenshots to RaktSetu for verification.

Uses only data you already have (no logging into WhatsApp, no scraping other people's chats):

  1. watch   - watch a folder (e.g. your synced "WhatsApp Images" or Screenshots folder)
               and scan every new image the moment it appears.
  2. export  - read a WhatsApp "Export chat" (.zip or folder, with media), find the
               blood-request messages (English / Hindi / Kannada keywords) and scan their images.
  3. scan    - scan one or more image files right now.

Every result is printed and appended to raktsetu_log.csv.
Standard library only. Python 3.9+.

Examples:
  python3 raktsetu_scan.py scan demo-kit/fresh.png demo-kit/scam.png
  python3 raktsetu_scan.py watch ~/Pictures/WhatsApp
  python3 raktsetu_scan.py export "WhatsApp Chat with Blood Donors BLR.zip"
"""
import argparse, csv, json, mimetypes, os, re, sys, tempfile, time, uuid, zipfile
from datetime import datetime
from pathlib import Path
from urllib import request as urlreq, error as urlerr

SITE = os.environ.get("RAKTSETU_URL", "https://raktsetu-red.vercel.app")
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
LOG = Path("raktsetu_log.csv")

# Words that mark a blood-donation message, in English, Hindi and Kannada
KEYWORDS = [
    r"\bblood\b", r"\bdonor", r"\bdonat", r"\bunits?\b", r"\bplatelet", r"\bplasma\b", r"\bpcv\b", r"\bsdp\b",
    r"\b(a|b|ab|o)\s*(\+|-|−|pos|neg|positive|negative)", r"\bve\b",
    "खून", "रक्त", "रक्तदान", "डोनर",          # Hindi
    "ರಕ್ತ", "ರಕ್ತದಾನ", "ದಾನಿ",                 # Kannada
]
KW = re.compile("|".join(KEYWORDS), re.IGNORECASE)

ICON = {
    "created": "🟢 LIVE (new request posted)", "active": "🟢 STILL NEEDED", "unverified": "🟡 LIVE, double-check",
    "duplicate": "🔁 ALREADY POSTED (merged)", "stale": "⌛ OLD, don't forward", "fulfilled": "🛑 DONE, stop forwarding",
    "flagged": "🚨 POSSIBLE SCAM", "not_a_request": "⚪ not a blood request",
}


def scan(path: Path, retries: int = 2) -> dict:
    """Upload one image to RaktSetu's checker and return its verdict."""
    data = path.read_bytes()
    if len(data) > 8 * 1024 * 1024:
        return {"verdict": "error", "error": "image larger than 8 MB"}
    boundary = "----raktsetu" + uuid.uuid4().hex
    ctype = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{path.name}\"\r\n"
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urlreq.Request(f"{SITE}/api/check", data=body, method="POST",
                         headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "User-Agent": "raktsetu-scanner/1.0"})
    for attempt in range(retries + 1):
        try:
            with urlreq.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urlerr.HTTPError as e:
            try:
                return {"verdict": "error", "error": json.loads(e.read()).get("error", str(e))}
            except Exception:
                return {"verdict": "error", "error": str(e)}
        except Exception as e:  # network hiccup: retry
            if attempt == retries:
                return {"verdict": "error", "error": str(e)}
            time.sleep(2 * (attempt + 1))
    return {"verdict": "error", "error": "unknown"}


def report(path: Path, res: dict, context: str = "") -> None:
    v = res.get("verdict", "error")
    r = res.get("request") or {}
    x = res.get("extracted") or {}
    group = r.get("bloodGroup") or x.get("bloodGroup") or "?"
    hosp = r.get("hospital") or x.get("hospital") or "?"
    link = f"{SITE}/r/{r['id']}" if r.get("id") else ""
    print(f"\n📸 {path.name}")
    if context:
        print(f"   💬 {context[:110]}")
    print(f"   {ICON.get(v, '❌ ' + str(res.get('error', v)))}")
    if v not in ("not_a_request", "error"):
        print(f"   🩸 {group} · {r.get('units') or x.get('units') or '?'} unit(s) · {hosp}")
        for reason in (res.get("reasons") or [])[:3]:
            print(f"   • {reason}")
        if link:
            print(f"   🔗 {link}")
    new = not LOG.exists()
    with LOG.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["time", "file", "verdict", "blood_group", "hospital", "link", "message", "error"])
        w.writerow([datetime.now().isoformat(timespec="seconds"), str(path), v, group, hosp, link, context, res.get("error", "")])


def images_in(folder: Path):
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXT and p.is_file())


# ---------- modes ----------

def cmd_scan(files):
    for f in files:
        p = Path(f).expanduser()
        if not p.exists():
            print(f"❌ not found: {p}")
            continue
        report(p, scan(p))


def cmd_watch(folder, every):
    folder = Path(folder).expanduser()
    if not folder.is_dir():
        sys.exit(f"❌ not a folder: {folder}")
    seen = {p: p.stat().st_mtime for p in images_in(folder)}
    print(f"👀 Watching {folder}  ({len(seen)} existing images ignored). New images are scanned automatically. Ctrl+C to stop.")
    try:
        while True:
            time.sleep(every)
            for p in images_in(folder):
                m = p.stat().st_mtime
                if seen.get(p) == m:
                    continue
                # wait until the file has finished writing
                size = p.stat().st_size
                time.sleep(1)
                if p.stat().st_size != size:
                    continue
                seen[p] = m
                report(p, scan(p))
    except KeyboardInterrupt:
        print(f"\n👋 Stopped. Results saved in {LOG.resolve()}")


# WhatsApp export lines look like:
#   19/11/2026, 9:42 am - Arjun: <attached: IMG-20261119-WA0007.jpg>   (iOS style uses [..] and "<attached: ...>")
#   19/11/26, 09:42 - Arjun: IMG-20261119-WA0007.jpg (file attached)    (Android style)
LINE = re.compile(r"^\[?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+([\d:]+\s*(?:[ap]\.?m\.?)?)\]?\s*[-–]?\s*([^:]+):\s*(.*)$", re.IGNORECASE)
ATTACH = re.compile(r"<attached:\s*([^>]+)>|([\w\-.]+\.(?:jpe?g|png|webp|gif))\s*\(file attached\)", re.IGNORECASE)


def cmd_export(src):
    src = Path(src).expanduser()
    tmp = None
    if src.suffix.lower() == ".zip":
        tmp = tempfile.TemporaryDirectory()
        with zipfile.ZipFile(src) as z:
            z.extractall(tmp.name)
        root = Path(tmp.name)
    elif src.is_dir():
        root = src
    else:
        sys.exit("❌ give the exported .zip or the folder it unzips to")
    chats = list(root.rglob("*.txt"))
    if not chats:
        sys.exit("❌ no chat .txt found. In WhatsApp: open the group → ⋮ → More → Export chat → Include media.")
    media = {p.name: p for p in images_in(root)}

    # group lines into messages, keep the text around each attachment
    msgs = []
    for line in chats[0].read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.replace("‎", "").strip()
        m = LINE.match(line)
        if m:
            msgs.append({"who": m.group(3).strip(), "text": m.group(4)})
        elif msgs:
            msgs[-1]["text"] += " " + line

    hits = []
    for i, msg in enumerate(msgs):
        a = ATTACH.search(msg["text"])
        if not a:
            continue
        name = (a.group(1) or a.group(2)).strip()
        if name not in media:
            continue
        # look at this message + the 2 messages before/after for blood words
        around = " ".join(msgs[j]["text"] for j in range(max(0, i - 2), min(len(msgs), i + 3)))
        if KW.search(around):
            hits.append((media[name], ATTACH.sub("", around).strip()))
    text_only = sum(1 for m in msgs if KW.search(m["text"]) and not ATTACH.search(m["text"]))

    print(f"💬 {len(msgs)} messages · {len(media)} images · {len(hits)} blood-related images to scan · {text_only} text-only blood messages (skipped: need a screenshot)")
    counts = {}
    for p, ctx in hits:
        res = scan(p)
        counts[res.get("verdict", "error")] = counts.get(res.get("verdict", "error"), 0) + 1
        report(p, res, ctx)
    print("\n📊 Summary: " + (", ".join(f"{ICON.get(k, k).split(' (')[0]}: {v}" for k, v in counts.items()) or "nothing to scan"))
    print(f"📄 Full log: {LOG.resolve()}")
    if tmp:
        tmp.cleanup()


def main():
    global SITE
    ap = argparse.ArgumentParser(description="Send blood-request screenshots to RaktSetu automatically.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan", help="scan image files now"); s.add_argument("files", nargs="+")
    w = sub.add_parser("watch", help="scan new images in a folder as they arrive"); w.add_argument("folder"); w.add_argument("--every", type=float, default=3)
    e = sub.add_parser("export", help="scan blood-related images in a WhatsApp chat export"); e.add_argument("src")
    ap.add_argument("--site", help=f"RaktSetu URL (default {SITE})")
    a = ap.parse_args()
    if a.site:
        SITE = a.site.rstrip("/")
    print(f"🩸 RaktSetu scanner → {SITE}")
    {"scan": lambda: cmd_scan(a.files), "watch": lambda: cmd_watch(a.folder, a.every), "export": lambda: cmd_export(a.src)}[a.cmd]()


if __name__ == "__main__":
    main()
