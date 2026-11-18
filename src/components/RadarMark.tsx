import { motion, type MotionValue } from "framer-motion";
import { SvgPing } from "@/components/fx";

// Das Radar-Signet der Seite.
//
// Lag bisher viermal wortgleich im Code: Navbar, Footer, Impressum, Awf. Drei
// davon waren zeichengleich, die Fusszeilen-Fassung nutzte ein abweichendes
// 24er-Koordinatensystem mit leicht anderen Radien. Vereinheitlicht auf die
// 28er-Geometrie, die Groesse kommt ueber die Prop.
//
// Nicht zu verwechseln mit dem IWI-Logo (IwiLogo.tsx): dieses Zeichen ist die
// Marke des Projekts, jenes die des herausgebenden Instituts.
//
// Ohne sweep und ping rendert das Signet statisch (Footer, Impressum, Awf,
// NotFound). Nur die Navbar gibt beides mit.
//
// Farben: feine gruene Linienzeichnung auf hellem Grund ("light", Standard),
// Mint auf tiefem Gruen und auf Tinte ("deep"). Mint steht nie auf Weiss.
interface RadarMarkProps {
  /** Kantenlaenge in Pixeln. */
  size?: number;
  className?: string;
  /**
   * Drehwinkel des Zeigers in Grad (im Uhrzeigersinn ab 12 Uhr). Bei
   * reduzierter Bewegung gibt die Navbar ihn nicht mit, der Zeiger steht.
   */
  sweep?: MotionValue<number>;
  /** Jede Aenderung loest einen Ortungs-Ring am Zentrum aus. */
  ping?: number;
  /** Grund, auf dem das Signet steht: hell (gruen) oder tief/dunkel (mint). */
  tone?: "light" | "deep";
}

const COLOR = { light: "#00802f", deep: "#6fd69a" } as const;

const RadarMark = ({ size = 28, className, sweep, ping, tone = "light" }: RadarMarkProps) => {
  const c = COLOR[tone];
  const pointer = <line x1="14" y1="14" x2="14" y2="2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="14" cy="14" r="12" stroke={c} strokeOpacity={0.4} strokeWidth="1" />
      <circle cx="14" cy="14" r="7" stroke={c} strokeOpacity={0.7} strokeWidth="1" />
      {ping !== undefined && <SvgPing cx={14} cy={14} r={2.5} color={c} play={ping} scale={3.2} duration={0.7} />}
      <circle cx="14" cy="14" r="2.5" fill={c} />
      {sweep ? (
        <motion.g style={{ rotate: sweep, transformBox: "view-box", transformOrigin: "14px 14px" }}>{pointer}</motion.g>
      ) : (
        pointer
      )}
    </svg>
  );
};

export default RadarMark;
