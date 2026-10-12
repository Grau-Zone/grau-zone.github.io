import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "./motion";
import { useReducedMotionSafe } from "./hooks";

export interface LockOnProps {
  color?: string;
  play?: boolean;
  /** Kantenlaenge der Ecken in px */
  size?: number;
  /** Abstand der Ecken zum Inhalt in px (negativ = aussen) */
  inset?: number;
  className?: string;
  children?: ReactNode;
}

const CORNERS = [
  { key: "tl", sx: -1, sy: -1 },
  { key: "tr", sx: 1, sy: -1 },
  { key: "bl", sx: -1, sy: 1 },
  { key: "br", sx: 1, sy: 1 },
] as const;

/**
 * Zielerfassung: vier L-Ecken fahren von aussen auf den Inhalt, blitzen
 * einmal auf und bleiben gedimmt stehen. Kein Einfluss aufs Layout.
 * Reduzierte Bewegung (sanfte Stufe): Die Ecken stehen am Ziel und blenden
 * nur per opacity ein (gleicher Verlauf, ohne Anflug).
 */
export function LockOn({ color = "#8BA4FF", play = false, size = 8, inset = -6, className, children }: LockOnProps) {
  const reduced = useReducedMotionSafe();
  const border = `1.5px solid ${color}`;

  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      {CORNERS.map(({ key, sx, sy }) => {
        const style: CSSProperties = {
          width: size,
          height: size,
          [sy < 0 ? "top" : "bottom"]: inset,
          [sx < 0 ? "left" : "right"]: inset,
          [sy < 0 ? "borderTop" : "borderBottom"]: border,
          [sx < 0 ? "borderLeft" : "borderRight"]: border,
        };
        const away = `translate(${sx * 10}px,${sy * 10}px)`;
        return (
          <motion.span
            // reduced im key: framer setzt initial nur beim Mount; ein Live-Wechsel
            // der OS-Einstellung baut die Ecke neu auf (kein Versatz bleibt haengen).
            key={`${key}-${reduced ? "r" : "m"}`}
            aria-hidden="true"
            className="fx-deco pointer-events-none absolute"
            style={style}
            initial={reduced ? { opacity: 0 } : { opacity: 0, transform: away }}
            animate={
              reduced
                ? play
                  ? { opacity: [0, 1, 0.4] }
                  : { opacity: 0 }
                : play
                  ? { opacity: [0, 1, 0.4], transform: "translate(0px,0px)" }
                  : { opacity: 0, transform: away }
            }
            transition={{
              transform: { duration: 0.35, ease: EASE_OUT },
              opacity: { duration: 0.65, times: [0, 0.54, 1], ease: "linear" },
            }}
          />
        );
      })}
    </span>
  );
}
