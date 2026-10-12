import {
  Fragment,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CSS_EASE_OUT, EASE_OUT, safeAnimate } from "./motion";
import { useInViewOnce, useReducedMotionSafe } from "./hooks";

export interface LineRevealProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "style"> {
  as?: keyof JSX.IntrinsicElements;
  lines: ReactNode[];
  trigger?: "mount" | "inView";
  /** Optional: von aussen gesteuert (ueberschreibt trigger). */
  play?: boolean;
  delay?: number;
  stagger?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  lineClassName?: string;
}

/**
 * Zeilen gleiten einzeln aus einer Maske nach oben. Zwischen den Zeilen steht
 * ein Textknoten ' ' (statt <br/>), textContent und Vorlesetext bleiben gleich.
 * Der Container selbst bekommt nie opacity (LCP).
 *
 * trigger='mount' (ohne play): Das Markup traegt den Endzustand, das Entree
 * laeuft per WAAPI mit fill 'backwards' auf der Dokument-Timeline. Die Zeilen
 * haengen damit nicht an framers rAF-Schleife.
 *
 * Reduzierte Bewegung (sanfte Stufe): Die Zeilen blenden nur per opacity ein
 * (gleiche Dauer, Verzoegerung und Staffelung), ohne y-Versatz. Beim
 * Mount-Entree startet die opacity bei 0.01 statt 0, damit eine h1 ab dem
 * ersten Paint LCP-Kandidat bleibt (Chrome ignoriert opacity 0).
 */
export const LineReveal = forwardRef<HTMLElement, LineRevealProps>(function LineReveal(
  {
    as = "h2",
    lines,
    trigger = "inView",
    play,
    delay = 0,
    stagger = 0.09,
    duration = 0.8,
    className,
    style,
    lineClassName,
    ...rest
  },
  forwarded,
) {
  const reduced = useReducedMotionSafe();
  const innerRef = useRef<HTMLElement | null>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      innerRef.current = node;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [forwarded],
  );
  const inView = useInViewOnce(innerRef, { amount: 0.5 });
  const onMount = play === undefined && trigger === "mount";
  const go = play ?? (trigger === "mount" ? true : inView);

  // Entree beim Mount: vor dem ersten Paint gestartet, also ohne Aufblitzen.
  useLayoutEffect(() => {
    if (!onMount) return;
    if (typeof window !== "undefined" && window.matchMedia?.("print").matches) return;
    const frames: Keyframe[] = reduced
      ? [{ opacity: 0.01 }, { opacity: 1 }]
      : [{ transform: "translateY(105%)" }, { transform: "translateY(0%)" }];
    const anims = lineRefs.current.map((el, i) =>
      safeAnimate(el, frames, {
        duration: duration * 1000,
        delay: (delay + i * stagger) * 1000,
        easing: CSS_EASE_OUT,
        fill: "backwards",
      }),
    );
    return () => anims.forEach((a) => a?.cancel());
    // genau einmal beim Mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = as as any;

  return (
    <Comp ref={setRef} className={className} style={style} {...rest}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
            {onMount ? (
              <span
                ref={(n) => {
                  lineRefs.current[i] = n;
                }}
                data-fx-reveal=""
                className={cn("block", lineClassName)}
              >
                {line}
              </span>
            ) : (
              <motion.span
                // reduced im key: framer setzt initial nur beim Mount. Ein
                // Live-Wechsel der OS-Einstellung baut die Zeile neu auf, damit
                // kein Startwert (Versatz bzw. opacity 0) haengen bleibt.
                key={reduced ? "r" : "m"}
                data-fx-reveal=""
                className={cn("block", lineClassName)}
                initial={reduced ? { opacity: 0 } : { transform: "translateY(105%)" }}
                animate={go ? (reduced ? { opacity: 1 } : { transform: "translateY(0%)" }) : undefined}
                transition={{ duration, ease: EASE_OUT, delay: delay + i * stagger }}
              >
                {line}
              </motion.span>
            )}
          </span>
        </Fragment>
      ))}
    </Comp>
  );
});
