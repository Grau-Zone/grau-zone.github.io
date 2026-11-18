// Woerter einer Ueberschrift steigen einzeln aus einer Maske, sobald sie sichtbar wird.
// Gegenstueck zu SplitHeading (rx), aber fuer eine vorhandene Ueberschrift (h2 oder h3 mit
// eigener Ebene) und mit Hervorhebung, die auf Weiss gruen und auf dem tiefen Gruen mint ist
// (Klasse rv-em, Farbe aus --rv-accent-text).
//
// Der Text bleibt unveraendert im DOM (Woerter als Spans mit Leerzeichen dazwischen, kein
// aria-hidden). Endzustand ohne Animation: alles steht da. Reduzierte Bewegung: kein Versatz,
// der Text steht sofort. Im Druck zwingt [data-fx-reveal] den Endzustand.
import { Fragment, useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "../fx";

export function RiseWords({ text, em, delay = 0 }: { text: string; em?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
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
        if (es.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hot = new Set((em ?? "").split(/\s+/).filter(Boolean));
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span ref={ref}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="rv-w">
            <span
              data-fx-reveal=""
              className={hot.has(w.replace(/[.,;:!?]$/, "")) ? "rv-em" : undefined}
              style={
                reduced
                  ? undefined
                  : {
                      transform: seen ? "none" : "translateY(105%)",
                      transitionProperty: seen ? "transform" : "none",
                      transitionDuration: "1s",
                      transitionTimingFunction: "var(--rx-ease, cubic-bezier(0.16,1,0.3,1))",
                      transitionDelay: `${delay + (i % 12) * 40}ms`,
                    }
              }
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
