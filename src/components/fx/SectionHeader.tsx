import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "./motion";
import { useInViewOnce, useReducedMotionSafe } from "./hooks";
import { DecodeText } from "./DecodeText";
import { LineReveal } from "./LineReveal";

export interface SectionHeaderProps {
  eyebrow: string;
  lines: ReactNode[];
  lead?: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** id der Ueberschrift (z. B. fuer aria-labelledby) */
  headingId?: string;
  eyebrowClassName?: string;
  eyebrowStyle?: CSSProperties;
  headingClassName?: string;
  headingStyle?: CSSProperties;
  leadClassName?: string;
  leadStyle?: CSSProperties;
}

const DEFAULT_EYEBROW_CLASS = "inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4";
const DEFAULT_EYEBROW_STYLE: CSSProperties = { color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" };
const DEFAULT_HEADING_CLASS = "text-4xl lg:text-5xl font-semibold text-white mb-4";
const DEFAULT_HEADING_STYLE: CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" };
const DEFAULT_LEAD_CLASS = "text-base leading-relaxed";
const DEFAULT_LEAD_STYLE: CSSProperties = { color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" };

/**
 * Sektionskopf: Strich + Eyebrow (Decode) -> Ueberschrift zeilenweise ->
 * Lead. Startet gemeinsam beim Sichtkontakt.
 * Reduzierte Bewegung (sanfte Stufe): gleiche Choreografie und Dauern, aber
 * ohne Versatz: Strich per clip-path aufgedeckt, Eyebrow, Zeilen und Lead
 * blenden per opacity ein, der Decode laeuft.
 */
export function SectionHeader({
  eyebrow,
  lines,
  lead,
  as = "h2",
  className,
  headingId,
  eyebrowClassName = DEFAULT_EYEBROW_CLASS,
  eyebrowStyle = DEFAULT_EYEBROW_STYLE,
  headingClassName = DEFAULT_HEADING_CLASS,
  headingStyle = DEFAULT_HEADING_STYLE,
  leadClassName = DEFAULT_LEAD_CLASS,
  leadStyle = DEFAULT_LEAD_STYLE,
}: SectionHeaderProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInViewOnce(ref, { amount: 0.4, margin: "0px 0px -15% 0px" });

  return (
    <div ref={ref} className={className}>
      {eyebrow ? (
        <span className={eyebrowClassName} style={eyebrowStyle}>
          {/* reduced im key (auch unten): framer setzt initial nur beim Mount.
              Ein Live-Wechsel der OS-Einstellung baut das Element neu auf,
              damit kein Startwert (scale, clip, Versatz, opacity 0) haengen bleibt. */}
          <motion.span
            key={reduced ? "line-r" : "line-m"}
            aria-hidden="true"
            className="fx-deco pointer-events-none mr-3 inline-block align-middle"
            style={{ width: 20, height: 1, background: "rgba(139,164,255,0.6)", transformOrigin: "left center" }}
            initial={reduced ? { clipPath: "inset(0 100% 0 0)" } : { transform: "scaleX(0)" }}
            animate={inView ? (reduced ? { clipPath: "inset(0 0% 0 0)" } : { transform: "scaleX(1)" }) : undefined}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          />
          <motion.span
            key={reduced ? "eyebrow-r" : "eyebrow-m"}
            data-fx-reveal=""
            className="inline-block"
            initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateX(-6px)" }}
            animate={inView ? (reduced ? { opacity: 1 } : { opacity: 1, transform: "translateX(0px)" }) : undefined}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.08 }}
          >
            <DecodeText text={eyebrow} trigger="manual" play={inView} duration={500} delay={80} />
          </motion.span>
        </span>
      ) : null}
      <LineReveal
        as={as}
        id={headingId}
        lines={lines}
        play={inView}
        delay={0.12}
        stagger={0.08}
        duration={0.75}
        className={headingClassName}
        style={headingStyle}
      />
      {lead ? (
        <motion.p
          key={reduced ? "r" : "m"}
          data-fx-reveal=""
          className={leadClassName}
          style={leadStyle}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
          animate={inView ? (reduced ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }) : undefined}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.3 }}
        >
          {lead}
        </motion.p>
      ) : null}
    </div>
  );
}
