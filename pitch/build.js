// RaktSetu pitch deck: dark + blood-red theme matching the website.
// Build: node build.js  -> RaktSetu.pptx (then post.py adds Morph transitions + entrance animations)
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");
const lu = require("react-icons/lu");

const RED = "E8132F", DEEP = "B30C22", INK = "F4F4F2", PAPER = "060606", SURF = "121212", LINE = "2A2A2A", MUTED = "9B9B97", GREEN = "2FD39F";
const HEAD = "Arial Black", BODY = "Arial";
const W = 13.333, H = 7.5;

async function icon(name, color = "#" + INK, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(lu[name], { color, size, strokeWidth: 2 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

async function background(glowX, glowY) {
  const lines = [];
  for (let x = 0; x <= 1920; x += 96) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>`);
  for (let y = 0; y <= 1080; y += 96) lines.push(`<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs><radialGradient id="g" cx="${glowX}" cy="${glowY}" r="0.55"><stop offset="0" stop-color="#e8132f" stop-opacity="0.33"/><stop offset="0.5" stop-color="#7a0612" stop-opacity="0.12"/><stop offset="1" stop-color="#060606" stop-opacity="0"/></radialGradient></defs>
    <rect width="1920" height="1080" fill="#060606"/><rect width="1920" height="1080" fill="url(#g)"/>${lines.join("")}</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "RaktSetu";
  pres.author = "Team Alpha";
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };

  const BG = {
    tl: await background(0.1, 0.1), tr: await background(0.9, 0.15), br: await background(0.85, 0.9),
    bl: await background(0.1, 0.9), c: await background(0.5, 0.5),
  };
  const I = {};
  for (const n of ["LuCamera", "LuScanText", "LuShieldCheck", "LuMapPin", "LuMessageCircle", "LuKeyRound", "LuRepeat", "LuBadgeAlert", "LuPhoneCall", "LuCircleHelp",
    "LuDroplet", "LuHospital", "LuHeartHandshake", "LuUsers", "LuLanguages", "LuMic", "LuSmartphone", "LuSparkles", "LuBrain", "LuDatabase", "LuMap", "LuCode", "LuClock", "LuStar", "LuReceipt", "LuCircleCheck", "LuCopy", "LuHourglass", "LuTriangleAlert", "LuArrowRight"])
    I[n] = await icon(n);
  const IR = {};
  for (const n of ["LuDroplet", "LuCircleCheck", "LuArrowRight"]) IR[n] = await icon(n, "#" + RED);

  const shot = (f) => "image/png;base64," + fs.readFileSync(`shots/${f}.png`).toString("base64");

  // ---------- helpers ----------
  let slideNo = 0;
  function base(bg) {
    const s = pres.addSlide();
    slideNo++;
    s.background = { color: PAPER };
    s.addImage({ data: BG[bg], x: 0, y: 0, w: W, h: H, objectName: "bg" });
    // the wordmark stays put across slides (Morph keeps it still)
    s.addImage({ data: IR.LuDroplet, x: 0.55, y: 0.38, w: 0.3, h: 0.3, objectName: "!!logo-drop" });
    s.addText("RAKTSETU", { x: 0.9, y: 0.33, w: 2.4, h: 0.4, fontFace: HEAD, fontSize: 14, color: INK, margin: 0, isTextBox: true, objectName: "!!logo-word" });
    if (slideNo > 1) s.addText(String(slideNo).padStart(2, "0"), { x: W - 1.3, y: 0.33, w: 0.8, h: 0.4, fontFace: BODY, fontSize: 11, color: MUTED, align: "right", margin: 0, isTextBox: true, objectName: "pg" });
    return s;
  }
  // the glowing blood cell that Morph glides from slide to slide
  function orb(s, x, y, d, t = 20) {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: RED, transparency: t }, line: { type: "none" }, objectName: "!!orb" });
    s.addShape(pres.shapes.OVAL, { x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, fill: { color: DEEP, transparency: t + 10 }, line: { type: "none" }, objectName: "!!orb-core" });
  }
  function kicker(s, text, y = 1.05) {
    s.addText([{ text: "// ", options: { color: RED } }, { text: text.toUpperCase(), options: { color: MUTED } }], { x: 0.55, y, w: 8, h: 0.35, fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, margin: 0, isTextBox: true, objectName: "a_kicker" });
  }
  function title(s, line1, line2, y = 1.45, size = 40) {
    const runs = [{ text: line1, options: { color: INK, breakLine: Boolean(line2) } }];
    if (line2) runs.push({ text: line2, options: { color: RED } });
    s.addText(runs, { x: 0.55, y, w: 11.5, h: line2 ? 1.5 : 0.85, fontFace: HEAD, fontSize: size, margin: 0, valign: "top", lineSpacingMultiple: 0.95, isTextBox: true, objectName: "a_title" });
  }
  function card(s, x, y, w, h, name, fill = SURF) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.18, fill: { color: fill }, line: { color: LINE, width: 1 }, objectName: name });
  }
  function iconDot(s, data, x, y, d = 0.62, color = RED, name) {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { type: "none" }, objectName: name + "-dot" });
    s.addImage({ data, x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: name + "-ic" });
  }
  function framedShot(s, img, x, y, w, name) {
    const h = w * 900 / 1440;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.12, fill: { color: "1C1C1C" }, line: { color: "3A3A3A", width: 1 }, shadow: { type: "outer", color: "000000", opacity: 0.6, blur: 18, offset: 6, angle: 90 }, objectName: name + "-frame" });
    s.addImage({ data: img, x, y, w, h, rounding: false, objectName: name });
  }

  // ---------- 1. Title ----------
  {
    const s = base("tr");
    orb(s, 9.1, 1.2, 3.6, 10);
    s.addText([{ text: "// ", options: { color: RED } }, { text: "TEAM ALPHA · REWIRED HACKATHON · BENGALURU", options: { color: MUTED } }], { x: 0.55, y: 2.0, w: 8, h: 0.35, fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, margin: 0, isTextBox: true, objectName: "a_kicker" });
    s.addText([{ text: "One screenshot.", options: { color: INK, breakLine: true } }, { text: "The right donor.", options: { color: RED } }], { x: 0.55, y: 2.5, w: 9, h: 2.1, fontFace: HEAD, fontSize: 54, margin: 0, lineSpacingMultiple: 0.95, isTextBox: true, objectName: "a_title" });
    s.addText("RaktSetu turns a forwarded blood request into a verified, live request and alerts only the donors who can actually help, near the hospital.", { x: 0.55, y: 4.75, w: 7.6, h: 1.0, fontFace: BODY, fontSize: 17, color: MUTED, margin: 0, isTextBox: true, objectName: "a_sub" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 6.05, w: 3.9, h: 0.6, rectRadius: 0.3, fill: { color: RED }, line: { type: "none" }, objectName: "a_url-bg" });
    s.addText("raktsetu-red.vercel.app", { x: 0.55, y: 6.05, w: 3.9, h: 0.6, fontFace: BODY, fontSize: 15, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "a_url" });
    s.addNotes("Introduce RaktSetu: a bridge for blood. One screenshot of a patient's details becomes a verified live request, and only matching donors nearby are alerted.");
  }

  // ---------- 2. The problem ----------
  {
    const s = base("tl");
    orb(s, 10.6, 4.9, 1.8, 25);
    kicker(s, "Why it's needed");
    title(s, "Blood requests today", "live on forwarded messages");
    const items = [
      ["LuRepeat", "Forwards never die", "A request keeps circulating for weeks after the patient already got blood."],
      ["LuBadgeAlert", "Scams hide in the noise", "Fake requests ask families and donors for money or UPI payments."],
      ["LuPhoneCall", "Wrong donors, endless calls", "Everyone calls the family, most with a blood group that can't help."],
      ["LuCircleHelp", "Promises with no proof", "\"I'm coming\" means nothing. Families can't tell who will really show up."],
    ];
    items.forEach(([ic, h, d], i) => {
      const x = 0.55 + (i % 2) * 6.15, y = 3.25 + Math.floor(i / 2) * 1.95;
      card(s, x, y, 5.95, 1.75, `a_card${i}`);
      iconDot(s, I[ic], x + 0.3, y + 0.3, 0.62, RED, `a_card${i}i`);
      s.addText(h, { x: x + 1.15, y: y + 0.27, w: 4.6, h: 0.45, fontFace: BODY, fontSize: 19, bold: true, color: INK, margin: 0, isTextBox: true, objectName: `a_card${i}h` });
      s.addText(d, { x: x + 1.15, y: y + 0.75, w: 4.55, h: 0.85, fontFace: BODY, fontSize: 14, color: MUTED, margin: 0, valign: "top", isTextBox: true, objectName: `a_card${i}d` });
    });
    s.addNotes("The problem: blood requests in India travel on WhatsApp forwards. They go stale, scams hide among them, wrong-group donors flood the family with calls, and nobody can tell who will really show up.");
  }

  // ---------- 3. The cost ----------
  {
    const s = base("c");
    orb(s, 5.4, 2.4, 2.6, 15);
    kicker(s, "Why it matters");
    title(s, "In an emergency, every", "hour is lost to noise");
    const flow = [["LuCopy", "A request is forwarded", "to hundreds of groups"], ["LuPhoneCall", "Calls pour in", "mostly the wrong blood group"], ["LuHourglass", "Hours are lost", "checking who is real"], ["LuTriangleAlert", "The patient waits", "while old forwards keep spreading"]];
    flow.forEach(([ic, h, d], i) => {
      const x = 0.55 + i * 3.12;
      card(s, x, 3.45, 2.85, 2.9, `a_f${i}`);
      iconDot(s, I[ic], x + 0.3, 3.75, 0.7, i === 3 ? RED : "2A2A2A", `a_f${i}i`);
      s.addText(h, { x: x + 0.3, y: 4.65, w: 2.35, h: 0.75, fontFace: BODY, fontSize: 18, bold: true, color: INK, margin: 0, valign: "top", isTextBox: true, objectName: `a_f${i}h` });
      s.addText(d, { x: x + 0.3, y: 5.45, w: 2.35, h: 0.7, fontFace: BODY, fontSize: 14, color: MUTED, margin: 0, valign: "top", isTextBox: true, objectName: `a_f${i}d` });
      if (i < 3) s.addImage({ data: IR.LuArrowRight, x: x + 2.88, y: 4.75, w: 0.22, h: 0.22, objectName: `a_f${i}arrow` });
    });
    s.addText("RaktSetu replaces the forward with one verified, live link.", { x: 0.55, y: 6.6, w: 12, h: 0.45, fontFace: BODY, fontSize: 17, italic: true, color: INK, margin: 0, isTextBox: true, objectName: "a_line" });
  }

  // ---------- 4. Meet RaktSetu ----------
  {
    const s = base("tr");
    orb(s, 11.4, 5.6, 1.2, 20);
    kicker(s, "The solution");
    title(s, "Meet RaktSetu", "a bridge for blood");
    s.addText([
      { text: "Families post a request with one screenshot.", options: { bullet: true, breakLine: true } },
      { text: "AI reads the patient, hospital and blood group.", options: { bullet: true, breakLine: true } },
      { text: "Every request is checked for duplicates, old forwards and scams.", options: { bullet: true, breakLine: true } },
      { text: "Only donors whose blood matches, within 15 km, get alerted.", options: { bullet: true } },
    ], { x: 0.55, y: 3.3, w: 5.3, h: 3.2, fontFace: BODY, fontSize: 16, color: INK, paraSpaceAfter: 12, margin: 0, valign: "top", isTextBox: true, objectName: "a_list" });
    framedShot(s, shot("home"), 6.25, 2.05, 6.5, "a_shot");
  }

  // ---------- 5. How it works ----------
  {
    const s = base("bl");
    orb(s, 0.3, 5.8, 1.4, 30);
    kicker(s, "How it works");
    title(s, "From screenshot to", "donor at the bedside");
    const steps = [["LuCamera", "Screenshot", "Family uploads the patient details or speaks them"], ["LuScanText", "AI reads", "Claude extracts group, units, hospital, contact"], ["LuShieldCheck", "Verify", "Duplicate, old or scam? Stopped right here"], ["LuMapPin", "Match", "Compatible group, within 15 km, eligible to give"], ["LuMessageCircle", "Alert", "WhatsApp message; donor replies YES"], ["LuKeyRound", "Confirm", "4-digit arrival code at the hospital"]];
    steps.forEach(([ic, h, d], i) => {
      const x = 0.55 + i * 2.07;
      card(s, x, 3.35, 1.9, 3.3, `a_s${i}`, i === 5 ? "2A0A0F" : SURF);
      s.addText(String(i + 1).padStart(2, "0"), { x: x + 0.22, y: 3.55, w: 0.8, h: 0.35, fontFace: HEAD, fontSize: 14, color: RED, margin: 0, isTextBox: true, objectName: `a_s${i}n` });
      iconDot(s, I[ic], x + 0.22, 4.0, 0.62, i === 5 ? RED : "2A2A2A", `a_s${i}i`);
      s.addText(h, { x: x + 0.22, y: 4.78, w: 1.6, h: 0.4, fontFace: BODY, fontSize: 17, bold: true, color: INK, margin: 0, isTextBox: true, objectName: `a_s${i}h` });
      s.addText(d, { x: x + 0.22, y: 5.22, w: 1.55, h: 1.35, fontFace: BODY, fontSize: 12.5, color: MUTED, margin: 0, valign: "top", isTextBox: true, objectName: `a_s${i}d` });
    });
    s.addNotes("Six steps: screenshot, AI read, verification, matching, WhatsApp alert, and an arrival code that proves the donor really came.");
  }

  // ---------- 6. Verification ----------
  {
    const s = base("tr");
    orb(s, 10.9, 0.9, 1.6, 25);
    kicker(s, "Trust, built in");
    title(s, "Every forward gets", "a verdict in seconds");
    const v = [[GREEN, "LuCircleCheck", "Live", "New and real: posted, and matching donors are alerted"], ["F5C451", "LuCopy", "Already posted", "Same patient, different screenshot: merged, not duplicated"], [MUTED, "LuClock", "Old forward", "Over 5 days old or already fulfilled: stop forwarding"], [RED, "LuTriangleAlert", "Possible scam", "Asks for money, or no hospital or contact: flagged"]];
    v.forEach(([col, ic, h, d], i) => {
      const y = 3.3 + i * 0.95;
      card(s, 0.55, y, 6.6, 0.8, `a_v${i}`);
      iconDot(s, I[ic], 0.72, y + 0.14, 0.52, col, `a_v${i}i`);
      s.addText(h, { x: 1.45, y: y + 0.1, w: 2.0, h: 0.6, fontFace: BODY, fontSize: 16, bold: true, color: INK, valign: "middle", margin: 0, isTextBox: true, objectName: `a_v${i}h` });
      s.addText(d, { x: 3.45, y: y + 0.08, w: 3.6, h: 0.64, fontFace: BODY, fontSize: 12, color: MUTED, valign: "middle", margin: 0, isTextBox: true, objectName: `a_v${i}d` });
    });
    const scam = "image/png;base64," + fs.readFileSync("../demo-kit/scam.png").toString("base64");
    const meta = await sharp(fs.readFileSync("../demo-kit/scam.png")).metadata();
    const h = 4.3, w = Math.min(4.6, h * meta.width / meta.height);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.75 + (4.95 - w) / 2 - 0.08, y: 2.45 - 0.08, w: w + 0.16, h: h + 0.16, rectRadius: 0.12, fill: { color: "1C1C1C" }, line: { color: RED, width: 2 }, objectName: "a_scam-frame" });
    s.addImage({ data: scam, x: 7.75 + (4.95 - w) / 2, y: 2.45, w, h, objectName: "a_scam" });
    s.addText("A real test: the scam screenshot is flagged", { x: 7.75, y: 6.95, w: 4.95, h: 0.35, fontFace: BODY, fontSize: 11, color: MUTED, align: "center", margin: 0, isTextBox: true, objectName: "a_scamcap" });
  }

  // ---------- 7. For donors ----------
  {
    const s = base("br");
    orb(s, 11.6, 6.0, 1.0, 20);
    kicker(s, "For donors");
    title(s, "Only the requests", "your blood can help");
    framedShot(s, shot("live"), 0.6, 3.25, 5.9, "a_shot");
    const pts = [["LuDroplet", "Matched by blood group", "All 8 groups, donor-to-patient compatibility built in"], ["LuMessageCircle", "WhatsApp alerts", "Nearby patients sent the moment you sign up; reply YES to go"], ["LuReceipt", "Safe to give", "Upload your last certificate, or mark first time. We wait 90 days"], ["LuStar", "Trust score", "Arrival codes reward donors who show up"]];
    pts.forEach(([ic, h, d], i) => {
      const y = 3.2 + i * 0.95;
      iconDot(s, I[ic], 7.0, y, 0.58, RED, `a_p${i}`);
      s.addText(h, { x: 7.8, y: y - 0.04, w: 4.9, h: 0.38, fontFace: BODY, fontSize: 17, bold: true, color: INK, margin: 0, isTextBox: true, objectName: `a_p${i}h` });
      s.addText(d, { x: 7.8, y: y + 0.36, w: 4.9, h: 0.45, fontFace: BODY, fontSize: 13, color: MUTED, margin: 0, valign: "top", isTextBox: true, objectName: `a_p${i}d` });
    });
  }

  // ---------- 8. WhatsApp ----------
  {
    const s = base("bl");
    orb(s, 6.0, 5.5, 1.3, 25);
    kicker(s, "Where people already are");
    title(s, "Help arrives on", "WhatsApp");
    s.addText([
      { text: "New donor? You instantly get the patients nearby who need your group.", options: { bullet: true, breakLine: true } },
      { text: "Need blood? You get the donors near you, by group and distance.", options: { bullet: true, breakLine: true } },
      { text: "Post a request and the family is told exactly who was alerted.", options: { bullet: true, breakLine: true } },
      { text: "Phone numbers stay private. Confirmation happens with a code.", options: { bullet: true } },
    ], { x: 0.55, y: 3.3, w: 6.2, h: 3.4, fontFace: BODY, fontSize: 16, color: INK, paraSpaceAfter: 12, margin: 0, valign: "top", isTextBox: true, objectName: "a_list" });
    // phone mock-up with a real message from the system
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.3, y: 1.1, w: 3.9, h: 6.0, rectRadius: 0.4, fill: { color: "0B141A" }, line: { color: "3A3A3A", width: 2 }, shadow: { type: "outer", color: "000000", opacity: 0.6, blur: 20, offset: 8, angle: 90 }, objectName: "a_phone" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.45, y: 1.25, w: 3.6, h: 0.65, rectRadius: 0.25, fill: { color: "1F2C34" }, line: { type: "none" }, objectName: "a_phone-bar" });
    s.addText("RaktSetu", { x: 8.65, y: 1.25, w: 3.2, h: 0.65, fontFace: BODY, fontSize: 15, bold: true, color: INK, valign: "middle", margin: 0, isTextBox: true, objectName: "a_phone-name" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.55, y: 2.1, w: 3.45, h: 4.75, rectRadius: 0.15, fill: { color: "1F2C34" }, line: { type: "none" }, objectName: "a_bubble" });
    s.addText([
      { text: "Welcome to RaktSetu, Kavya!", options: { bold: true, breakLine: true } },
      { text: "You're registered as an O− donor near Koramangala.", options: { breakLine: true } },
      { text: " ", options: { breakLine: true } },
      { text: "1 patient near you can take your blood right now:", options: { bold: true, breakLine: true } },
      { text: "O− · 2 units · St. John's Medical College Hospital (0.8 km)", options: { breakLine: true } },
      { text: " ", options: { breakLine: true } },
      { text: "Reply YES to go.", options: { bold: true, color: GREEN } },
    ], { x: 8.7, y: 2.2, w: 3.15, h: 4.55, fontFace: BODY, fontSize: 13, color: INK, margin: 0, valign: "top", isTextBox: true, objectName: "a_msg" });
  }

  // ---------- 9. How it helps ----------
  {
    const s = base("c");
    orb(s, 0.55, 2.0, 0.9, 20);
    kicker(s, "How it helps people", 1.05);
    title(s, "Less noise. Faster blood.", "Real people.");
    const stats = [["1", "verified link", "replaces hundreds of forwards"], ["15 km", "alert radius", "only donors who can reach in time"], ["8", "blood groups", "matched by compatibility"], ["3", "languages", "English, Hindi and Kannada"]];
    stats.forEach(([n, l, d], i) => {
      const x = 0.55 + i * 3.12;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.35, w: 2.9, h: 2.75, rectRadius: 0.2, fill: { color: i === 0 ? RED : SURF }, line: { color: i === 0 ? RED : LINE, width: 1 }, objectName: `a_st${i}` });
      s.addText(n, { x: x + 0.3, y: 3.55, w: 2.5, h: 1.15, fontFace: HEAD, fontSize: 50, color: "FFFFFF", margin: 0, valign: "middle", isTextBox: true, objectName: `a_st${i}n` });
      s.addText(l, { x: x + 0.3, y: 4.75, w: 2.5, h: 0.4, fontFace: BODY, fontSize: 17, bold: true, color: "FFFFFF", margin: 0, isTextBox: true, objectName: `a_st${i}l` });
      s.addText(d, { x: x + 0.3, y: 5.2, w: 2.4, h: 0.7, fontFace: BODY, fontSize: 13, color: i === 0 ? "FFE3E7" : MUTED, margin: 0, valign: "top", isTextBox: true, objectName: `a_st${i}d` });
    });
    s.addText([{ text: "Families ", options: { bold: true, color: INK } }, { text: "post once.  ", options: { color: MUTED } }, { text: "Donors ", options: { bold: true, color: INK } }, { text: "see only what they can help with.  ", options: { color: MUTED } }, { text: "Hospitals ", options: { bold: true, color: INK } }, { text: "get donors who actually show up.", options: { color: MUTED } }], { x: 0.55, y: 6.45, w: 12.3, h: 0.5, fontFace: BODY, fontSize: 15, margin: 0, isTextBox: true, objectName: "a_line" });
  }

  // ---------- 10. Accessible ----------
  {
    const s = base("tl");
    orb(s, 10.4, 4.3, 2.2, 20);
    kicker(s, "Built for everyone");
    title(s, "Works for the people", "who need it most");
    const a = [["LuLanguages", "Three languages", "Switch between English, हिंदी and ಕನ್ನಡ at the top of every page."], ["LuMic", "Speak instead of typing", "Hold Space (or the mic on a phone) and describe the need."], ["LuSmartphone", "Phone-first", "Large touch targets, no app to install, works on any phone."], ["LuMessageCircle", "WhatsApp", "Alerts arrive where Indian families already talk."]];
    a.forEach(([ic, h, d], i) => {
      const y = 3.25 + i * 0.95;
      iconDot(s, I[ic], 0.55, y, 0.62, RED, `a_a${i}`);
      s.addText(h, { x: 1.4, y: y - 0.02, w: 7.6, h: 0.38, fontFace: BODY, fontSize: 18, bold: true, color: INK, margin: 0, isTextBox: true, objectName: `a_a${i}h` });
      s.addText(d, { x: 1.4, y: y + 0.38, w: 7.6, h: 0.42, fontFace: BODY, fontSize: 14, color: MUTED, margin: 0, isTextBox: true, objectName: `a_a${i}d` });
    });
  }

  // ---------- 11. How we built it ----------
  {
    const s = base("br");
    orb(s, 11.9, 1.0, 0.8, 25);
    kicker(s, "How we developed it");
    title(s, "Built in one day,", "on a real stack");
    // architecture: app in the centre, services around it
    const box = (x, y, w, h, ic, head, sub, name, hot) => {
      card(s, x, y, w, h, name, hot ? "2A0A0F" : SURF);
      iconDot(s, I[ic], x + 0.22, y + (h - 0.55) / 2, 0.55, hot ? RED : "2A2A2A", name + "i");
      s.addText(head, { x: x + 0.95, y: y + 0.12, w: w - 1.05, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: INK, margin: 0, isTextBox: true, objectName: name + "h" });
      s.addText(sub, { x: x + 0.95, y: y + 0.5, w: w - 1.05, h: h - 0.6, fontFace: BODY, fontSize: 11.5, color: MUTED, margin: 0, valign: "top", isTextBox: true, objectName: name + "d" });
    };
    box(4.55, 4.15, 4.2, 1.2, "LuCode", "Next.js 15 web app", "TypeScript, Tailwind, three.js 3D, server routes", "a_b0", true);
    box(0.55, 3.25, 3.6, 1.1, "LuBrain", "Claude AI (Anthropic)", "Reads screenshots, voice and certificates", "a_b1");
    box(0.55, 5.15, 3.6, 1.1, "LuMap", "OpenStreetMap", "Geocoding hospitals, distance matching", "a_b2");
    box(9.15, 3.25, 3.6, 1.1, "LuDatabase", "Vercel + Blob storage", "Hosting and the live request database", "a_b3");
    box(9.15, 5.15, 3.6, 1.1, "LuMessageCircle", "WhatsApp sender", "Python + Selenium on WhatsApp Web", "a_b4");
    [[4.15, 3.8, 4.55, 4.55], [4.15, 5.7, 4.55, 4.95], [8.75, 4.55, 9.15, 3.8], [8.75, 4.95, 9.15, 5.7]].forEach(([x1, y1, x2, y2], i) =>
      s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: (y2 < y1) !== (x2 < x1), line: { color: RED, width: 1.5, dashType: "dash" }, objectName: `a_l${i}` }));
    s.addText("Also: Web Speech API for voice · lucide icons · Noto fonts for Hindi and Kannada · one-time phone codes, no passwords", { x: 0.55, y: 6.65, w: 12.2, h: 0.4, fontFace: BODY, fontSize: 12, color: MUTED, margin: 0, isTextBox: true, objectName: "a_also" });
    s.addNotes("Stack: Next.js 15 with TypeScript and Tailwind, Claude for reading screenshots, voice and certificates, OpenStreetMap for geocoding, Vercel and Blob storage, and a Python Selenium sender for WhatsApp.");
  }

  // ---------- 12. Close ----------
  {
    const s = base("c");
    orb(s, 4.67, 0.9, 4.0, 8);
    s.addText([{ text: "Every drop,", options: { color: INK, breakLine: true } }, { text: "to the right place.", options: { color: RED } }], { x: 0.55, y: 3.3, w: 12.2, h: 2.0, fontFace: HEAD, fontSize: 50, align: "center", margin: 0, lineSpacingMultiple: 0.95, isTextBox: true, objectName: "a_title" });
    s.addText("Try it live:  raktsetu-red.vercel.app", { x: 0.55, y: 5.55, w: 12.2, h: 0.5, fontFace: BODY, fontSize: 20, bold: true, color: INK, align: "center", margin: 0, isTextBox: true, objectName: "a_url" });
    s.addText("Team Alpha · Rewired, Bengaluru", { x: 0.55, y: 6.15, w: 12.2, h: 0.4, fontFace: BODY, fontSize: 14, color: MUTED, align: "center", margin: 0, isTextBox: true, objectName: "a_team" });
  }

  await pres.writeFile({ fileName: "RaktSetu-raw.pptx" });
  console.log("built", slideNo, "slides");
})();
