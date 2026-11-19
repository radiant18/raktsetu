"use client";
import { useEffect, useRef, useState } from "react";

// Six separate boxes: active box glows, digits pop in, paste fills all, error shakes, success turns green.
export default function OtpInput({ value, onChange, onComplete, state = "idle", length = 6 }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; state?: "idle" | "error" | "success"; length?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(true);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => { if (state === "error") ref.current?.focus(); }, [state]);
  const active = Math.min(value.length, length - 1);

  return (
    <div className={`relative ${state === "error" ? "shake" : ""}`} onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-label="Verification code"
        className="absolute inset-0 opacity-0 cursor-text"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
      />
      <div className="flex gap-2 md:gap-3 justify-between pointer-events-none">
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const isActive = focused && i === active && state !== "success";
          return (
            <div key={i}
              className={`otp-box relative flex-1 aspect-[4/5] max-w-16 rounded-2xl flex items-center justify-center font-display text-3xl transition-all duration-200
                ${state === "success" ? "bg-[#2fd39f]/10 border-2 border-pulse text-pulse" : state === "error" ? "bg-[#e8132f]/12 border-2 border-rakt text-rakt" : isActive ? "bg-[#141414] border-2 border-ink shadow-[0_0_0_4px_rgba(224,17,43,.15)] -translate-y-0.5" : ch ? "bg-[#141414] border border-ink/40" : "bg-mist border border-line"}`}
              style={{ transitionDelay: state === "success" ? `${i * 60}ms` : "0ms" }}>
              {ch ? <span key={ch + i} className="otp-digit">{ch}</span> : isActive ? <span className="otp-caret" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
