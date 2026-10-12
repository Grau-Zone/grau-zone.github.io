import { useRef, type CSSProperties } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "./motion";
import { useInViewOnce, useReducedMotionSafe } from "./hooks";

export interface SlotTextProps {
  value: string;
  trigger?: "mount" | "inView";
  /** Optional: von aussen gesteuert (ueberschreibt trigger). */
  play?: boolean;
  /** Sekunden, vor dem ersten Zeichen */
  delay?: number;
  stagger?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Zeichen rollen wie bei einem Zaehlwerk von unten ein. Bei Wertwechsel
 * rollt der alte Wert nach oben raus. Der Wert steht sr-only im DOM.
 * Reduzierte Bewegung (sanfte Stufe): gleiche Staffelung, aber die Zeichen
 * blenden per opacity ein und aus (Crossfade statt Rollen).
 */
export function SlotText({
  value,
  trigger = "mount",
  play,
  delay = 0,
  stagger = 0.018,
  duration = 0.45,
  className,
  style,
}: SlotTextProps) {
  const reduced = useReducedMotionSafe();
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const inView = useInViewOnce(hostRef, {});
  const go = play ?? (trigger === "mount" ? true : inView);

  const chars = Array.from(value);
  const charVariants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        shown: (i: number) => ({
          opacity: 1,
          transition: { duration, ease: EASE_OUT, delay: delay + i * stagger },
        }),
        gone: { opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } },
      }
    : {
        hidden: { transform: "translateY(100%)" },
        shown: (i: number) => ({
          transform: "translateY(0%)",
          transition: { duration, ease: EASE_OUT, delay: delay + i * stagger },
        }),
        gone: { transform: "translateY(-100%)", transition: { duration: 0.2, ease: EASE_OUT } },
      };

  return (
    <span ref={hostRef} className={cn("relative inline-flex tabular-nums", className)} style={style}>
      <span className="sr-only">{value}</span>
      {/* reduced im key: framer setzt den Startwert nur beim Mount; ein
          Live-Wechsel der OS-Einstellung baut die Zeichen neu auf. */}
      <span key={reduced ? "r" : "m"} aria-hidden="true" className="relative inline-grid">
        <AnimatePresence initial={true}>
          <motion.span
            key={value}
            className="inline-flex whitespace-pre"
            style={{ gridArea: "1 / 1" }}
            initial="hidden"
            animate={go ? "shown" : "hidden"}
            exit="gone"
          >
            {chars.map((c, i) => (
              <span
                key={i}
                className="inline-block overflow-hidden align-bottom"
                style={{ height: "1.15em", lineHeight: "1.15em" }}
              >
                <motion.span data-fx-reveal="" className="inline-block" custom={i} variants={charVariants}>
                  {c === " " ? " " : c}
                </motion.span>
              </span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
