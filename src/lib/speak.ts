// Browser text-to-speech in the donor's language. Falls back to the closest available voice.
const LOCALE: Record<string, string> = { kn: "kn-IN", hi: "hi-IN", en: "en-IN" };

export function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const want = LOCALE[lang] ?? "en-IN";
  u.lang = want;
  const voices = synth.getVoices();
  const v = voices.find((x) => x.lang === want) ?? voices.find((x) => x.lang.startsWith(want.slice(0, 2))) ?? (lang === "kn" ? voices.find((x) => x.lang === "hi-IN") : undefined);
  if (v) u.voice = v;
  u.rate = 0.95;
  synth.speak(u);
}
