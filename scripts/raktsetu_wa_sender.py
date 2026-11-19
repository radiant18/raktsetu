#!/usr/bin/env python3
"""
RaktSetu WhatsApp sender: delivers RaktSetu's queued WhatsApp messages from your own WhatsApp.

The website puts every WhatsApp message (welcome matches for new donors and families, donor alerts,
"your request is live" updates) into an outbox. This script opens WhatsApp Web in its own Chrome
window, sends each message by clicking WhatsApp's real Send button, and marks it sent.

Setup (once):
  pip install selenium
  (Google Chrome must be installed. Selenium downloads the matching driver by itself.)

Run:
  set the key:   PowerShell:  $env:RAKTSETU_WORKER_KEY="..."     Mac/Linux:  export RAKTSETU_WORKER_KEY=...
  python raktsetu_wa_sender.py            # keeps running, checks every 10 s
  python raktsetu_wa_sender.py --once     # send what's waiting, then exit
  python raktsetu_wa_sender.py --dry-run  # print, don't send

First run: a Chrome window opens on WhatsApp Web. Scan the QR code with the phone once;
the login is saved in the "wa-profile" folder next to this script.
"""
import argparse, json, os, sys, time
from pathlib import Path
from urllib import request as urlreq
from urllib.parse import quote

SITE = os.environ.get("RAKTSETU_URL", "https://raktsetu-red.vercel.app").rstrip("/")
KEY = os.environ.get("RAKTSETU_WORKER_KEY", "")
PROFILE = Path(__file__).resolve().parent / "wa-profile"
driver = None


def api(method, path, body=None):
    req = urlreq.Request(f"{SITE}{path}", method=method,
                         data=json.dumps(body).encode() if body is not None else None,
                         headers={"x-worker-key": KEY, "Content-Type": "application/json", "User-Agent": "raktsetu-wa-sender/2.0"})
    with urlreq.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def browser():
    """One Chrome window, logged in to WhatsApp Web, reused for every message."""
    global driver
    if driver:
        return driver
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    opts = webdriver.ChromeOptions()
    opts.add_argument(f"--user-data-dir={PROFILE}")
    opts.add_argument("--start-maximized")
    opts.add_argument("--mute-audio")
    driver = webdriver.Chrome(options=opts)
    driver.get("https://web.whatsapp.com")
    print("🔐 If you see a QR code in the Chrome window, scan it with the phone (WhatsApp → Linked devices).")
    for _ in range(180):  # up to 3 minutes to log in
        if driver.find_elements(By.CSS_SELECTOR, "#pane-side, div[aria-label='Chat list']"):
            print("✅ WhatsApp Web is logged in")
            return driver
        time.sleep(1)
    raise RuntimeError("WhatsApp Web didn't log in (QR code not scanned?)")


def send(phone, text, dry):
    if dry:
        print(f"   (dry run) → {phone}\n{text}\n")
        return True
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    d = browser()
    d.get(f"https://web.whatsapp.com/send?phone={phone.lstrip('+')}&text={quote(text)}")
    send_btn = ["button[aria-label='Send']", "span[data-icon='send']", "span[data-icon='wds-ic-send-filled']"]
    for _ in range(60):  # up to 60 s for the chat to open
        for css in send_btn:
            els = d.find_elements(By.CSS_SELECTOR, css)
            if els:
                time.sleep(1)
                try:
                    els[0].click()
                except Exception:
                    d.execute_script("arguments[0].click()", els[0])
                time.sleep(3)  # let it actually go
                return True
        # number not on WhatsApp -> WhatsApp shows a popup
        if d.find_elements(By.XPATH, "//*[contains(text(),'invalid') or contains(text(),'isn’t on WhatsApp') or contains(text(),\"isn't on WhatsApp\")]"):
            print("   ⚠️  number isn't on WhatsApp, skipping")
            return True
        time.sleep(1)
    # last resort: press Enter in the message box
    boxes = d.find_elements(By.CSS_SELECTOR, "footer div[contenteditable='true']")
    if boxes:
        boxes[-1].send_keys(Keys.ENTER)
        time.sleep(3)
        return True
    raise RuntimeError("chat didn't open in 60 s")


def run_once(dry):
    msgs = api("GET", "/api/wa-outbox").get("messages", [])
    sent = 0
    for m in msgs:
        print(f"📤 {m['to']}  ({m['at'][:19]})  {m['body'].splitlines()[0][:60]}")
        try:
            if send(m["to"], m["body"], dry):
                sent += 1
                if not dry:
                    api("POST", "/api/wa-outbox", {"ids": [m["id"]]})  # mark each one right away
                    print("   ✅ sent")
        except Exception as e:
            print(f"   ❌ {e}")
    return sent


def main():
    global SITE
    ap = argparse.ArgumentParser(description="Send RaktSetu's queued WhatsApp messages through WhatsApp Web.")
    ap.add_argument("--once", action="store_true", help="send what's waiting, then exit")
    ap.add_argument("--dry-run", action="store_true", help="print messages instead of sending (doesn't mark them sent)")
    ap.add_argument("--every", type=float, default=10, help="seconds between checks (default 10)")
    ap.add_argument("--site", help=f"RaktSetu URL (default {SITE})")
    a = ap.parse_args()
    if a.site:
        SITE = a.site.rstrip("/")
    if not KEY:
        sys.exit("❌ set RAKTSETU_WORKER_KEY (same as WA_WORKER_KEY on the server)")
    print(f"🩸 RaktSetu WhatsApp sender → {SITE}" + ("  [dry run]" if a.dry_run else ""))
    if not a.dry_run:
        browser()  # open WhatsApp Web and log in before waiting for messages
    try:
        while True:
            try:
                run_once(a.dry_run)
            except Exception as e:
                print(f"⚠️  {e}")
            if a.once:
                break
            time.sleep(a.every)
    except KeyboardInterrupt:
        print("\n👋 stopped")
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    main()
