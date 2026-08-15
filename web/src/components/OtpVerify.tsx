import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Animated 4-digit OTP verification.
 *
 * Motion script (mirrors the reference interaction):
 * 1. entry   — the four cells rise in, the active cell glows gold
 * 2. filling — each digit pops as it lands; the last digit auto-submits
 * 3. checking— the row folds into a slowly rotating 2x2 diamond cluster
 * 4. merging — the cluster collapses into one gold tile
 * 5. verified— the tile morphs into a gold disc and the tick draws itself
 */

type Phase = "input" | "checking" | "merging" | "verified";

const CELLS = [0, 1, 2, 3];
const GAP = 66; // px between cells while typing
const CLUSTER = 27; // px offset of each cell in the 2x2 cluster

export function OtpVerify({
  length = 4,
  destination,
  onVerified,
}: {
  length?: number;
  destination: string;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>("input");
  const [resendIn, setResendIn] = useState(24);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const value = digits.join("");
  const filled = value.length === length && !digits.includes("");

  useEffect(() => {
    if (phase !== "input") return;
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!filled || phase !== "input") return;
    const push = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    push(() => setPhase("checking"), 420);
    push(() => setPhase("merging"), 2100);
    push(() => setPhase("verified"), 2700);
    push(onVerified, 4400);
  }, [filled, phase, onVerified]);

  const write = (raw: string) => {
    if (phase !== "input") return;
    const next = raw.replace(/\D/g, "").slice(0, length).split("");
    setDigits(CELLS.slice(0, length).map((i) => next[i] ?? ""));
    setActive(Math.min(next.length, length - 1));
  };

  const caption = useMemo(() => {
    if (phase === "verified")
      return { title: "Verified", body: ["Your number is confirmed.", "Taking you in now."] };
    if (phase === "input")
      return {
        title: "Enter your code",
        body: [
          `We sent a ${length}-digit code to ${destination}.`,
          "It verifies the moment the last digit lands.",
        ],
      };
    return { title: "Checking your code", body: ["This takes a second.", "Keep this tab open."] };
  }, [phase, length, destination]);

  const cellStyle = (i: number) => {
    if (phase === "input")
      return { transform: `translate(${(i - (length - 1) / 2) * GAP}px, 0) rotate(0deg) scale(1)` };
    if (phase === "checking") {
      const x = (i % 2 === 0 ? -1 : 1) * CLUSTER;
      const y = (i < 2 ? -1 : 1) * CLUSTER;
      return { transform: `translate(${x}px, ${y}px) rotate(45deg) scale(0.62)` };
    }
    return { transform: "translate(0px, 0px) rotate(45deg) scale(0.62)", opacity: 0 };
  };

  return (
    <div className="otp-stage w-full max-w-[420px] px-1">
      <p className="text-center text-[10px] tracking-[0.34em] text-gold uppercase">Interaction</p>
      <h1 className="mt-2 text-center font-display text-[30px] text-cream sm:text-[34px]">
        OTP Verification
      </h1>

      <div className="otp-card relative mt-7 overflow-hidden rounded-[22px] px-5 py-8 sm:px-8">
        <span className="mx-auto mb-6 block h-[3px] w-9 rounded-full bg-cream/25" />

        <div key={phase} className="otp-fade text-center">
          <p className="text-[15px] font-medium text-cream">{caption.title}</p>
          {caption.body.map((line) => (
            <p key={line} className="mt-1 text-[12.5px] leading-relaxed text-cream/45">
              {line}
            </p>
          ))}
        </div>

        <div className="relative mx-auto mt-7 h-[74px] w-full">
          <div
            className={`absolute inset-0 grid place-items-center ${
              phase === "checking" ? "otp-orbit" : ""
            }`}
          >
            {CELLS.slice(0, length).map((i) => (
              <div
                key={i}
                aria-hidden={phase !== "input"}
                style={cellStyle(i)}
                className={`otp-cell absolute grid size-[52px] place-items-center rounded-[14px] border text-[20px] ${
                  digits[i] || (phase === "input" && i === active)
                    ? "border-gold text-cream"
                    : "border-cream/12 text-cream/60"
                } ${digits[i] ? "otp-pop" : ""}`}
              >
                {phase === "input" ? (
                  digits[i] || (i === active ? <span className="otp-caret" /> : "")
                ) : (
                  <span className="block -rotate-45">{digits[i]}</span>
                )}
              </div>
            ))}
          </div>

          {phase !== "input" && phase !== "checking" ? (
            <div className="absolute inset-0 grid place-items-center">
              <div
                className={`otp-seal grid place-items-center bg-gold ${
                  phase === "verified" ? "otp-seal-done" : ""
                }`}
              >
                {phase === "verified" ? (
                  <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
                    <path
                      d="M5 12.5 10 17.5 19 7"
                      stroke="#1C1A18"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="otp-tick"
                    />
                  </svg>
                ) : null}
              </div>
            </div>
          ) : null}

          {phase === "input" ? (
            <input
              ref={inputRef}
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Verification code"
              value={value}
              onChange={(e) => write(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          ) : null}
        </div>

        <div className="mt-6 text-center text-[12px]">
          {phase === "input" ? (
            <p className="text-cream/40">
              Didn't get it?{" "}
              {resendIn > 0 ? (
                <span className="text-cream/70">Resend in 0:{String(resendIn).padStart(2, "0")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setResendIn(24)}
                  className="text-gold underline underline-offset-4"
                >
                  Resend code
                </button>
              )}
            </p>
          ) : phase === "verified" ? (
            <p className="otp-fade text-gold">Signing you in</p>
          ) : (
            <p className="otp-fade inline-flex items-center gap-2 text-cream/45">
              <span className="otp-dot size-1.5 rounded-full bg-gold" />
              Verifying
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-cream/35">
        Demo mode — any {length} digits complete the check.
      </p>
    </div>
  );
}
