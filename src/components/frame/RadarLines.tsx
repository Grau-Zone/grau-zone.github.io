// Radar als feine Linienzeichnung: Ringe, Achsen, Skala, ein Mittelpunkt.
//
// Gruen auf Weiss ("light"), Mint auf tiefem Gruen ("deep"). Die Ringe zeichnen
// sich beim Sichtkontakt per stroke-dashoffset (Linienzeichnen ist auch bei
// reduzierter Bewegung erlaubt), danach folgt ein einmaliger Ortungs-Ring.
// Optional dreht ein Radarkeil (sweep) und blitzen Punkte auf (blips); beides
// sind Endlosschleifen: sie stehen ausserhalb des Bildes, im versteckten Tab und
// bei gedruecktem Pause-Knopf (usePauseOffscreen) und werden bei reduzierter
// Bewegung gar nicht erst gerendert (dann stehen die Punkte still).
// Die Zeichnung ist Dekoration (aria-hidden).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Blip, RadarSweep, SvgPing, sweepDelay, useInViewOnce, useMotionTier, usePauseOffscreen } from "@/components/fx";
import "./frame.css";

const C = 200;
const R = [190, 150, 110, 70, 30];
const SWEEP_PERIOD = 9;

/** Zeitpunkt, zu dem der Keil einen Punkt (Prozent der Flaeche) erreicht: Winkel ab 12 Uhr im Uhrzeigersinn. */
const blipDelay = (x: number, y: number) => {
  const deg = (Math.atan2(x - 50, 50 - y) * 180) / Math.PI;
  return sweepDelay(deg, SWEEP_PERIOD);
};

// Skala: alle 5 Grad ein Strich, alle 30 Grad ein langer
const TICKS = (() => {
  let d = "";
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 6 === 0 ? 177 : 184;
    d += `M${(C + Math.sin(a) * 190).toFixed(1)} ${(C - Math.cos(a) * 190).toFixed(1)}L${(C + Math.sin(a) * r1).toFixed(1)} ${(C - Math.cos(a) * r1).toFixed(1)}`;
  }
  return d;
})();
const AXES = `M10 ${C}H390M${C} 10V390M${(C - 134).toFixed(1)} ${(C - 134).toFixed(1)}L${(C + 134).toFixed(1)} ${(C + 134).toFixed(1)}M${(C + 134).toFixed(1)} ${(C - 134).toFixed(1)}L${(C - 134).toFixed(1)} ${(C + 134).toFixed(1)}`;

export interface RadarLinesProps {
  tone?: "light" | "deep";
  /** Anzahl der Ringe von aussen nach innen (1 bis 5) */
  rings?: number;
  /** Index des hervorgehobenen Rings (0 = aussen) */
  active?: number | null;
  /** Skala am aeusseren Ring */
  ticks?: boolean;
  /** Achsenkreuz und Diagonalen */
  axes?: boolean;
  /** drehender Radarkeil (Endlosschleife) */
  sweep?: boolean;
  /** aufblitzende Punkte in Prozent der Flaeche (Endlosschleife) */
  blips?: { x: number; y: number; delay?: number }[];
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const RadarLines = ({
  tone = "light",
  rings = 4,
  active = null,
  ticks = true,
  axes = true,
  sweep = false,
  blips,
  className,
  style,
  children,
}: RadarLinesProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const seen = useInViewOnce(ref, { amount: 0.15, margin: "0px" });
  usePauseOffscreen(ref);
  const [ping, setPing] = useState(0);
  const n = Math.max(1, Math.min(R.length, rings));
  const color = tone === "deep" ? "#6fd69a" : "#00802f";

  // Der Ortungs-Ring folgt, wenn die Ringe gezeichnet sind
  useEffect(() => {
    if (!seen) return;
    const t = window.setTimeout(() => setPing(1), 1500);
    return () => window.clearTimeout(t);
  }, [seen]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-in={seen ? "true" : "false"}
      className={"fr-radar fx-deco" + (tone === "deep" ? " fr-radar--deep" : "") + (className ? " " + className : "")}
      style={style}
    >
      <svg viewBox="0 0 400 400" fill="none" focusable="false">
        {axes && <path className="fr-ax" d={AXES} strokeDasharray="2 6" />}
        {ticks && <path className="fr-tk" d={TICKS} />}
        {R.slice(0, n).map((r, i) => (
          <circle
            key={r}
            className="fr-r"
            cx={C}
            cy={C}
            r={r}
            pathLength={1}
            data-on={active === i ? "true" : "false"}
            style={{ ["--d" as string]: `${0.12 * i}s` }}
          />
        ))}
        <circle className="fr-c" cx={C} cy={C} r={3} />
        <SvgPing cx={C} cy={C} r={3} color={color} play={ping} scale={14} count={2} gap={0.4} duration={1.6} strokeWidth={1.2} />
        {blips && tier === "off" && blips.map((b, i) => <circle key={i} className="fr-blip-still" cx={(b.x / 100) * 400} cy={(b.y / 100) * 400} r={3} />)}
      </svg>
      {sweep && tier !== "off" && <RadarSweep color={color} period={SWEEP_PERIOD} trail={70} intensity={0.14} style={{ inset: "2.5%" }} />}
      {blips && tier !== "off" && blips.map((b, i) => <Blip key={i} x={b.x} y={b.y} color={color} size={7} delay={b.delay ?? blipDelay(b.x, b.y)} period={SWEEP_PERIOD} />)}
      {children}
    </div>
  );
};

export default RadarLines;
