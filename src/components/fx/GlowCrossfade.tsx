import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { CSS_EASE_IN_OUT } from "./motion";

export interface GlowCrossfadeProps {
  /** je Eintrag ein background- bzw. box-shadow-Wert */
  layers: string[];
  /** Index der aktiven Ebene */
  active: number;
  kind?: "background" | "shadow";
  /** Sekunden */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Gradients und Schatten interpolieren nicht. Deshalb liegt jede Variante
 * auf einer eigenen Ebene, gewechselt wird nur die opacity.
 */
export function GlowCrossfade({ layers, active, kind = "background", duration = 0.7, className, style }: GlowCrossfadeProps) {
  // opacity-Wechsel sind auch bei reduzierter Bewegung erlaubt (sanfte Stufe)
  const transition = `opacity ${duration}s ${CSS_EASE_IN_OUT}`;
  return (
    <div
      aria-hidden="true"
      className={cn("fx-deco pointer-events-none absolute inset-0 rounded-[inherit]", className)}
      style={style}
    >
      {layers.map((v, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-[inherit]"
          style={{
            ...(kind === "shadow" ? { boxShadow: v } : { background: v }),
            opacity: i === active ? 1 : 0,
            transition,
          }}
        />
      ))}
    </div>
  );
}
