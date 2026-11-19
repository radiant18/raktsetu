#!/usr/bin/env python3
"""
RaktSetu WhatsApp sender: delivers RaktSetu's WhatsApp messages from your own WhatsApp (via pywhatkit).

The website puts every WhatsApp message (welcome matches for new donors and families, donor alerts,
"your request is live" updates) into an outbox. This script picks them up and sends them through
WhatsApp Web in your browser, then marks them sent.

Setup (once):
  pip install pywhatkit
  Open https://web.whatsapp.com in your default browser and scan the QR code with the team phone.

Run:
  export RAKTSETU_WORKER_KEY=...   # same value as WA_WORKER_KEY on Vercel
  python3 scripts/raktsetu_wa_sender.py            # keeps running, checks every 10 s
  python3 scripts/raktsetu_wa_sender.py --once     # send what's waiting, then exit
  python3 scripts/raktsetu_wa_sender.py --dry-run  # print, don't send
"""
import argparse, json, os, sys, time
from urllib import request as urlreq

SITE = os.environ.get("RAKTSETU_URL", "https://raktsetu-red.vercel.app").rstrip("/")
KEY = os.environ.get("RAKTSETU_WORKER_KEY", "")
WAIT = 25  # seconds to let WhatsApp Web load before typing


def api(method, path, body=None):
    req = urlreq.Request(f"{SITE}{path}", method=method,
                         data=json.dumps(body).encode() if body is not None else None,
                         headers={"x-worker-key": KEY, "Content-Type": "application/json", "User-Agent": "raktsetu-wa-sender/1.0"})
    with urlreq.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def focus_whatsapp():
    """Bring the browser tab with WhatsApp to the front and maximise it (Windows)."""
    try:
        import pygetwindow as gw
        wins = [x for x in gw.getAllWindows() if "whatsapp" in (x.title or "").lower()]
        if wins:
            win = wins[0]
            if win.isMinimized:
                win.restore()
            try:
                win.activate()
            except Exception:  # Windows sometimes refuses the first activate; a click fixes it
                import pyautogui
                pyautogui.click(win.left + win.width // 2, win.top + 10)
            try:
                win.maximize()
            except Exception:
                pass
            time.sleep(1.5)
            return True
    except Exception as e:
        print(f"   (couldn't focus the browser: {e})")
    return False


def send(phone, text, dry):
    if dry:
        print(f"   (dry run) → {phone}\n{text}\n")
        return True
    import pywhatkit, pyautogui  # imported lazily so --dry-run works without them
    # pywhatkit opens the chat with the message typed in. Its own Enter often lands in the wrong
    # window (PowerShell stays in front on Windows), so bring WhatsApp to the front and press it ourselves.
    pywhatkit.sendwhatmsg_instantly(phone, text, wait_time=WAIT, tab_close=False)
    focus_whatsapp()
    w, h = pyautogui.size()
    pyautogui.click(w * 0.65, h * 0.90)   # into the message box at the bottom of the chat
    time.sleep(1)
    pyautogui.press("enter")
    time.sleep(4)                         # let it actually send
    pyautogui.hotkey("command" if sys.platform == "darwin" else "ctrl", "w")  # close the tab
    time.sleep(1)
    return True


def run_once(dry):
    msgs = api("GET", "/api/wa-outbox").get("messages", [])
    if not msgs:
        return 0
    done = []
    for m in msgs:
        print(f"📤 {m['to']}  ({m['at'][:19]})  {m['body'].splitlines()[0][:60]}")
        try:
            if send(m["to"], m["body"], dry):
                done.append(m["id"])
                if not dry:
                    api("POST", "/api/wa-outbox", {"ids": [m["id"]]})  # mark each one right away
        except Exception as e:
            print(f"   ❌ {e}")
        time.sleep(3)
    return len(done)


def main():
    global SITE
    ap = argparse.ArgumentParser(description="Send RaktSetu's queued WhatsApp messages with pywhatkit.")
    ap.add_argument("--once", action="store_true", help="send what's waiting, then exit")
    ap.add_argument("--dry-run", action="store_true", help="print messages instead of sending (doesn't mark them sent)")
    ap.add_argument("--every", type=float, default=10, help="seconds between checks (default 10)")
    ap.add_argument("--wait", type=int, default=25, help="seconds to let WhatsApp Web load (default 25; raise it on a slow laptop)")
    ap.add_argument("--site", help=f"RaktSetu URL (default {SITE})")
    a = ap.parse_args()
    global WAIT
    WAIT = a.wait
    if a.site:
        SITE = a.site.rstrip("/")
    if not KEY:
        sys.exit("❌ set RAKTSETU_WORKER_KEY (same as WA_WORKER_KEY on the server)")
    print(f"🩸 RaktSetu WhatsApp sender → {SITE}" + ("  [dry run]" if a.dry_run else ""))
    try:
        while True:
            try:
                n = run_once(a.dry_run)
                if n:
                    print(f"✅ sent {n}")
            except Exception as e:
                print(f"⚠️  {e}")
            if a.once:
                break
            time.sleep(a.every)
    except KeyboardInterrupt:
        print("\n👋 stopped")


if __name__ == "__main__":
    main()
