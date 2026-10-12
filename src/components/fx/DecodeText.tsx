import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useInViewOnce } from "./hooks";

export interface DecodeTextProps {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  glyphs?: string;
  /** Millisekunden */
  duration?: number;
  /** Millisekunden */
  delay?: number;
  trigger?: "inView" | "mount" | "manual";
  /** nur bei trigger='manual' */
  play?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_";
const QUANT = 50;

/**
 * Entschluesselungs-Effekt. Der echte Text bleibt im DOM (waehrend des
 * Decodes nur transparent, die Breite bleibt), darueber liegt ein
 * aria-hidden Overlay, dessen textContent per rAF (50-ms-Raster) geschrieben
 * wird. Laeuft genau einmal.
 */
export function DecodeText({
  text,
  as = "span",
  glyphs = DEFAULT_GLYPHS,
  duration = 600,
  delay = 0,
  trigger = "inView",
  play,
  className,
  style,
}: DecodeTextProps) {
  const hostRef = useRef<HTMLElement | null>(null);
  const realRef = useRef<HTMLSpanElement | null>(null);
  const overlayRef = useRef<HTMLSpanElement | null>(null);
  const doneRef = useRef(false);
  const [running, setRunning] = useState(false);

  const inView = useInViewOnce(hostRef, {});
  const go = trigger === "mount" ? true : trigger === "manual" ? !!play : inView;

  // Start: genau einmal, nie im Druck. Laeuft auch bei reduzierter Bewegung
  // (sanfte Stufe: Decode ist erlaubt, kein Ortswechsel).
  useEffect(() => {
    if (!go || doneRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("print").matches) return;
    if (typeof requestAnimationFrame !== "function") return;
    doneRef.current = true;
    setRunning(true);
  }, [go]);

  useLayoutEffect(() => {
    if (!running) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    // Umbrochener Text (z. B. lange Eyebrow bei 390 px): Das einzeilige
    // Overlay kann die Zeilen nicht abbilden. Dann ohne Decode, noch vor dem
    // ersten Paint.
    const lineBoxes = realRef.current?.getClientRects().length ?? 0;
    if (lineBoxes > 1) {
      setRunning(false);
      return;
    }
    const chars = Array.from(text);
    const n = Math.max(1, chars.length);
    const pick = () => glyphs.charAt(Math.floor(Math.random() * glyphs.length));
    let raf = 0;
    let start = -1;
    let lastStep = -1;

    const write = (t: number) => {
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (/\s/.test(c)) out += c;
        else if (t >= (i / n) * duration) out += c;
        else out += pick();
      }
      overlay.textContent = out;
    };

    const stop = () => {
      setRunning(false);
    };

    const frame = (now: number) => {
      if (start < 0) start = now;
      const t = now - start - delay;
      if (t >= duration) {
        stop();
        return;
      }
      const step = Math.floor(t / QUANT);
      if (step !== lastStep) {
        lastStep = step;
        write(t);
      }
      raf = requestAnimationFrame(frame);
    };

    write(-1);
    raf = requestAnimationFrame(frame);
    const onPrint = () => stop();
    window.addEventListener("beforeprint", onPrint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [running, text, glyphs, duration, delay]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = as as any;

  return (
    <Comp ref={hostRef} className={cn("relative", className)} style={style}>
      <span ref={realRef} data-fx-decode="" style={running ? { color: "transparent" } : undefined}>
        {text}
      </span>
      {running ? (
        <span
          ref={overlayRef}
          aria-hidden="true"
          className="fx-deco pointer-events-none absolute inset-0 overflow-hidden whitespace-nowrap"
          style={{ font: "inherit", textTransform: "inherit", letterSpacing: "inherit", color: "inherit" }}
        />
      ) : null}
    </Comp>
  );
}
