import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotionSafe } from "@/components/fx";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * Ueberschrift, deren Woerter einzeln aus einer Maske steigen, sobald sie sichtbar wird.
 * children ist ein String; fuer eine gruene Hervorhebung die Woerter in em angeben
 * (em="Heilbronn Wort2"). Bei reduzierter Bewegung steht der Text sofort da.
 */
export function SplitHeading({
  as = "h2",
  children,
  em,
  className,
  delay = 0,
}: {
  as?: Tag;
  children: string;
  em?: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotionSafe();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const emSet = new Set((em ?? "").split(/\s+/).filter(Boolean));
  const words = children.split(/\s+/);
  const nodes: ReactNode[] = [];
  words.forEach((w, i) => {
    const hot = emSet.has(w.replace(/[.,;:!?]$/, ""));
    nodes.push(
      <span key={i} className="rx-w" aria-hidden="true">
        <span
          className={hot ? "text-green" : undefined}
          style={
            reduced
              ? undefined
              : {
                  transform: seen ? "none" : "translateY(105%)",
                  transitionProperty: seen ? "transform" : "none",
                  transitionDuration: "1s",
                  transitionTimingFunction: "var(--rx-ease)",
                  transitionDelay: `${delay + (i % 14) * 38}ms`,
                }
          }
        >
          {w}
        </span>
      </span>,
    );
    if (i < words.length - 1) nodes.push(" ");
  });
  return createElement(as, { ref, className, "aria-label": children }, nodes);
}
