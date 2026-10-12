import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_IN_OUT, safeAnimate } from "./motion";
import { useInViewOnce, useReducedMotionSafe } from "./hooks";

export interface ScanDividerProps {
  position: "top" | "bottom";
  alpha?: number;
  className?: string;
}

const GROW_MS = 1100;
const SEGMENT_DELAY_MS = 300;

/**
 * Sektions-Trennlinie: waechst bei Sichtkontakt aus der Mitte, danach laeuft
 * einmal ein Lichtsegment darueber. Reduziert (sanfte Stufe): Die Linie wird
 * per clip-path aus der Mitte aufgedeckt (gleiche Dauer), kein Lichtsegment.
 */
export function ScanDivider({ position, alpha = 0.15, className }: ScanDividerProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);
  const segRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewOnce(ref, { amount: 0 });

  useEffect(() => {
    if (!inView || reduced) return;
    const a = safeAnimate(
      segRef.current,
      [{ transform: "translateX(-160px)" }, { transform: "translateX(100vw)" }],
      { duration: 1600, delay: GROW_MS + SEGMENT_DELAY_MS, easing: "linear", fill: "none" },
    );
    return () => a?.cancel();
  }, [inView, reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "fx-deco pointer-events-none absolute left-0 right-0 h-px overflow-hidden",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
    >
      <motion.div
        // reduced im key: framer setzt initial nur beim Mount. Ein Live-Wechsel
        // der OS-Einstellung baut die Linie neu auf (kein scale/clip bleibt haengen).
        key={reduced ? "r" : "m"}
        className="absolute inset-0"
        style={{ background: `linear-gradient(90deg, transparent, rgba(139,164,255,${alpha}), transparent)` }}
        initial={reduced ? { clipPath: "inset(0 50% 0 50%)" } : { transform: "scaleX(0)" }}
        animate={inView ? (reduced ? { clipPath: "inset(0 0% 0 0%)" } : { transform: "scaleX(1)" }) : undefined}
        transition={{ duration: GROW_MS / 1000, ease: EASE_IN_OUT }}
      />
      {reduced ? null : (
        <div
          ref={segRef}
          className="absolute left-0 top-0 h-full"
          style={{
            width: 160,
            transform: "translateX(-160px)",
            background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.9), transparent)",
          }}
        />
      )}
    </div>
  );
}
