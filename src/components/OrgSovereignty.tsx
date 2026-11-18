import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence, useScroll, useTransform, type Transition } from "framer-motion";
import CapacityRadar, { CAPACITIES, BASELINE_VALUES } from "./CapacityRadar";
import { EASE_OUT, LineReveal, useInViewOnce, useMotionTier, useReducedMotionSafe } from "@/components/fx";
import "./landing-a/landing-a.css";

/** Erster Sichtkontakt: so lange nach dem inView, bis Switching aufzieht. */
const ARM_DELAY_MS = 400;
/** Panel-Takt (Sekunden) */
const T_QUESTION = 0.1;
const T_BAR = 0.14;
const BAR_S = 0.4;
const T_DEF_TEXT = T_BAR + BAR_S;
const T_LIST = 0.22;
const LIST_STAGGER = 0.045;

/**
 * Laufband mit den vier Faehigkeiten: wandert mit dem Scrollen, nie von selbst (keine Schleife).
 * Ruhige Stufe: steht still und umbricht, damit alle vier Namen lesbar sind. Reine Zierde,
 * die Namen stehen ohnehin in der Liste darunter.
 */
function Marquee() {
  const still = useMotionTier() === "off";
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: boxRef, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, (p) => -(0.04 + 0.5 * p) * halfRef.current);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      halfRef.current = el.scrollWidth / 2;
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="la-mq" data-still={still} aria-hidden="true">
      <motion.div ref={trackRef} className="la-mq__track" style={still ? undefined : { x }}>
        {[1, 2].map((s) => (
          <div key={s} className={`la-mq__set la-mq__set--${s}`}>
            {CAPACITIES.map((c) => (
              <span key={c.key} className="la-mq__item">
                {c.tag}
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

const OrgSovereignty = () => {
  const reduced = useReducedMotionSafe();
  const [active, setActive] = useState(0);
  const cap = CAPACITIES[active];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Bis zum ersten Sichtkontakt steht das Radar komplett auf der Baseline;
  // danach zieht die aktive Faehigkeit als Gummiband auf 80 %. Sanfte Stufe
  // (reduzierte Bewegung): gleicher Zeitpunkt, aber CapacityRadar blendet die
  // Form per Crossfade ueber statt zu federn.
  const radarRef = useRef<HTMLDivElement | null>(null);
  const radarInView = useInViewOnce(radarRef, { amount: 0.4 });
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (armed || !radarInView) return;
    const t = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [armed, radarInView]);

  // Druck vor dem Sichtkontakt: Im Druck erscheint der Endzustand (aktive
  // Faehigkeit auf 80 %). flushSync, damit das Radar noch vor dem Snapshot
  // rendert; CapacityRadar setzt die Werte im Druck ohne Feder.
  useEffect(() => {
    if (armed || typeof window === "undefined") return;
    const onPrint = () => flushSync(() => setArmed(true));
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, [armed]);

  const select = (i: number) => {
    setActive(i);
    setArmed(true);
  };

  // Pfeiltasten, Home und End wie bei jeder Tab-Leiste (Roving Tabindex)
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const len = CAPACITIES.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % len;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + len) % len;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = len - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  // selected capacity rises to 80%, the others sit at their baseline
  const radarValues = armed ? BASELINE_VALUES.map((b, i) => (i === active ? 0.8 : b)) : BASELINE_VALUES;

  // Sanfte Stufe: gleiche Dauern und Verzoegerungen, aber nur opacity (kein Versatz).
  const enter = (delay: number, duration = 0.3): Transition => ({ duration, delay, ease: EASE_OUT });
  const rise = (offset: string) =>
    reduced
      ? ({ initial: { opacity: 0 }, animate: { opacity: 1 } } as const)
      : ({ initial: { opacity: 0, transform: offset }, animate: { opacity: 1, transform: "translate(0px, 0px)" } } as const);
  const listItem = (k: number) => ({
    ...rise("translate(-6px, 0px)"),
    transition: enter(T_LIST + k * LIST_STAGGER, 0.3),
  });

  return (
    <section id="organisationen" className="la-or bg-background">
      <div className="rx-wrap la-or__in">
        <div className="la-or__intro">
          <LineReveal
            as="h2"
            className="rx-h2"
            lines={[
              "Vier Fähigkeiten bestimmen den",
              <>
                organisationalen <span className="text-green">Handlungsspielraum</span>
              </>,
            ]}
          />
          <p className="rx-sub la-or__lead">
            Digitale Souveränität bezeichnet den Handlungsspielraum einer Organisation im Umgang mit kritischen digitalen
            Abhängigkeiten. Wir erfassen diesen Handlungsspielraum anhand von vier organisationalen Fähigkeiten:
            Switching, Internalization, Multi-Sourcing und Negotiation.
          </p>
        </div>
      </div>

      <Marquee />

      <div className="rx-wrap la-or__in la-or__in--main">
        <div className="la-or__main">
          {/* Links: das Radar bleibt beim Lesen der Faehigkeit im Bild */}
          <div className="la-or__fig">
            <div ref={radarRef} className="la-or__radar">
              <CapacityRadar
                values={radarValues}
                color="#00802f"
                activeIndex={armed ? active : undefined}
                size={560}
              />
            </div>
            <p className="la-or__cap">Digitale Souveränität von Organisationen</p>

            {/* Punktnavigation */}
            <div className="la-dots">
              {CAPACITIES.map((c, i) => (
                <button key={c.key} type="button" aria-label={c.tag} aria-pressed={i === active} onClick={() => select(i)}>
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {/* Rechts: vier Faehigkeiten als Liste, darunter die gewaehlte im Detail */}
          <div className="la-or__side">
            <div role="tablist" aria-orientation="vertical" className="la-tabs">
              {CAPACITIES.map((c, i) => {
                const on = i === active;
                return (
                  <button
                    key={c.key}
                    ref={(n) => {
                      tabRefs.current[i] = n;
                    }}
                    type="button"
                    role="tab"
                    id={`capacity-pill-tab-${i}`}
                    aria-selected={on}
                    aria-controls="capacity-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => select(i)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                    className="la-tab"
                  >
                    <span className="la-tab__n" aria-hidden="true">
                      0{i + 1}
                    </span>
                    <span className="block min-w-0">
                      <span className="la-tab__tag">{c.tag}</span>
                      <span className="la-tab__title" aria-hidden="true">
                        {c.title}
                      </span>
                    </span>
                    <span aria-hidden="true" className="la-tab__c">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 7h12M8 2l5 5-5 5" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Capacity content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                id="capacity-panel"
                role="tabpanel"
                aria-labelledby={`capacity-pill-tab-${active}`}
                className="la-cap"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
              >
                <motion.div {...rise("translate(0px, 6px)")} transition={enter(0)}>
                  <span className="la-cap__no">
                    Fähigkeit 0{active + 1} · {cap.tag}
                  </span>
                </motion.div>
                <LineReveal as="h3" trigger="mount" lines={[cap.title]} delay={0.04} duration={0.6} className="la-cap__h" />
                <motion.p className="la-cap__q" {...rise("translate(0px, 6px)")} transition={enter(T_QUESTION)}>
                  {cap.keyQuestion}
                </motion.p>

                {/* Definition: eigener 2-px-Balken (zeichnet sich von oben; sanfte Stufe: clip-path-Wipe statt scaleY) */}
                <div className="la-cap__def">
                  <motion.i
                    aria-hidden="true"
                    className="fx-deco"
                    style={{ transformOrigin: "top center" }}
                    initial={reduced ? { clipPath: "inset(0% 0% 100% 0%)" } : { transform: "scaleY(0)" }}
                    animate={reduced ? { clipPath: "inset(0% 0% 0% 0%)" } : { transform: "scaleY(1)" }}
                    transition={enter(T_BAR, BAR_S)}
                  />
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={enter(T_DEF_TEXT, 0.15)}>
                    {cap.definition}
                  </motion.p>
                </div>

                <div className="la-cap__cols">
                  <div>
                    <h4 className="la-cap__h4">Relevante Einflussfaktoren</h4>
                    <ul className="la-cap__list">
                      {cap.drivers.map((d, j) => (
                        <motion.li key={d} {...listItem(j)}>
                          {d}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="la-cap__h4">Beispiele organisationaler Maßnahmen</h4>
                    <ul className="la-cap__list">
                      {cap.actions.map((action, j) => (
                        <motion.li key={j} {...listItem(cap.drivers.length + j)}>
                          {action}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrgSovereignty;
