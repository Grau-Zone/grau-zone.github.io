import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

import SiteFooter from "./SiteFooter";
import RadarHorizon from "./RadarHorizon";
import {
  CSS_EASE_OUT,
  DecodeText,
  EASE_IN_OUT,
  EASE_OUT,
  LineReveal,
  Reveal,
  RevealGroup,
  RevealItem,
  SpotlightCard,
  safeAnimate,
  useFinePointer,
  useInViewOnce,
  useIsMobile,
  useReducedMotionSafe,
} from "@/components/fx";

const PILLARS = [
  {
    n: "#1",
    title: "Makro-Ebene",
    desc: "Analyse technologischer, marktlicher und regulatorischer Entwicklungen, die digitale Abhängigkeiten von Organisationen beeinflussen.",
  },
  {
    n: "#2",
    title: "Anbieter-Ebene",
    desc: "Analyse von Eigenschaften digitaler Anbieter und Services, die Abhängigkeiten von Organisationen reduzieren oder verstärken.",
  },
  {
    n: "#3",
    title: "Organisationsebene",
    desc: "Messung des organisationalen Handlungsspielraums im Umgang mit digitalen Abhängigkeiten anhand von Switching, Internalization, Multi-Sourcing und Negotiation Capacity.",
  },
];

/** Verzoegerung der Knoten und Nummern in Sekunden. */
const PILLAR_DELAYS = [0, 0.45, 0.9];
const PILLAR_GLYPHS = "#0123456789ABCDEF";
const NUMBER_DIM = "rgba(139,164,255,0.5)";
const NUMBER_LIT = "#8BA4FF";
const LINE_COLOR = "rgba(139,164,255,0.35)";

// Sanfte Stufe: die Pipeline-Linie wird per clip-path aufgedeckt statt skaliert.
const CLIP_FULL = "inset(0% 0% 0% 0%)";
const CLIP_HIDDEN_H = "inset(0% 100% 0% 0%)";
const CLIP_HIDDEN_V = "inset(0% 0% 100% 0%)";

const isMousePointer = (e: React.PointerEvent) => e.pointerType === "mouse" || e.pointerType === "pen";

const Footer = () => {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const hoverFx = fine && !reduced;
  const mobile = useIsMobile();

  const sectionRef = useRef<HTMLElement | null>(null);

  // ── Partner-Icons: Mikrobewegung beim Hover (nur feiner Zeiger) ──
  const dssRingRef = useRef<SVGCircleElement | null>(null);
  const dssAnimRef = useRef<Animation | null>(null);
  const hsgColsRef = useRef<(SVGPathElement | null)[]>([]);
  const hsgAnimsRef = useRef<(Animation | null)[]>([]);

  const pulseDss = useCallback(
    (e: React.PointerEvent) => {
      if (!hoverFx || !isMousePointer(e)) return;
      dssAnimRef.current?.cancel();
      dssAnimRef.current = safeAnimate(
        dssRingRef.current,
        [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
        { duration: 400, easing: CSS_EASE_OUT },
      );
    },
    [hoverFx],
  );

  const raiseHsg = useCallback(
    (e: React.PointerEvent) => {
      if (!hoverFx || !isMousePointer(e)) return;
      hsgAnimsRef.current.forEach((a) => a?.cancel());
      hsgAnimsRef.current = hsgColsRef.current.map((el, i) =>
        safeAnimate(el, [{ transform: "translateY(2px)" }, { transform: "translateY(0px)" }], {
          duration: 300,
          delay: i * 30,
          easing: CSS_EASE_OUT,
          fill: "backwards",
        }),
      );
    },
    [hoverFx],
  );

  useEffect(
    () => () => {
      dssAnimRef.current?.cancel();
      hsgAnimsRef.current.forEach((a) => a?.cancel());
    },
    [],
  );

  // ── Projektsaeulen als Pipeline ──
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pillarsIn = useInViewOnce(gridRef, { margin: "0px 0px -15% 0px" });
  // Auch bei reduzierter Bewegung erst beim Hineinscrollen: Linie (clip-path),
  // Knoten und Ziffernfarbe (opacity) laufen dann in der sanften Stufe.
  const pillarsGo = pillarsIn;

  // Handy: die senkrechte Linie endet genau am letzten Knoten. Laenge per
  // ResizeObserver direkt ins DOM, kein React-State.
  useEffect(() => {
    const grid = gridRef.current;
    const line = lineRef.current;
    if (!grid || !line) return;
    const fit = () => {
      if (!mobile) {
        line.style.height = "";
        return;
      }
      const first = nodeRefs.current[0];
      const last = nodeRefs.current[PILLARS.length - 1];
      if (!first || !last) return;
      const a = first.getBoundingClientRect();
      const b = last.getBoundingClientRect();
      const h = b.top + b.height / 2 - (a.top + a.height / 2);
      line.style.height = h > 0 ? `${h}px` : "";
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [mobile]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative overflow-hidden supports-[overflow:clip]:overflow-clip"
      style={{ background: "transparent", borderTop: "1px solid rgba(139,164,255,0.08)" }}
    >
      {/* About section; der Radar-Horizont liegt unten mittig dahinter, ueber der SiteFooter */}
      <div className="relative">
        <RadarHorizon targetRef={sectionRef} />

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
            {/* Left: Project info */}
            <div>
              <DecodeText
                text="Über das Projekt"
                className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-5"
                style={{ color: "rgba(139,164,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
              />
              <LineReveal
                lines={["Digitale Souveränität", "systematisch erfassen."]}
                className="text-3xl lg:text-4xl font-semibold text-white mb-5"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
              />
              <Reveal
                as="p"
                y={10}
                delay={0.12}
                className="text-sm leading-relaxed mb-4"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif", maxWidth: "42ch" }}
              >
                Die Dieter Schwarz Stiftung und Schwarz Digits fördern das Forschungsprojekt zur
                Messung digitaler Souveränität von Organisationen.
              </Reveal>
              <Reveal
                as="p"
                y={10}
                delay={0.2}
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif", maxWidth: "42ch" }}
              >
                Ziel des Forschungsprojekts ist es, digitale Abhängigkeiten und den daraus
                resultierenden organisationalen Handlungsspielraum systematisch zu erfassen. Der
                Sovereignty Radar soll Organisationen dabei unterstützen, Abhängigkeiten sichtbar zu
                machen, zu vergleichen und gezielt zu adressieren.
              </Reveal>
            </div>

            {/* Right: Partners */}
            <RevealGroup stagger={0.08} delayChildren={0.1} className="space-y-6">
              {/* DSS */}
              <RevealItem>
                <SpotlightCard
                  color="#4B6EFF"
                  tilt={0}
                  className="p-6 rounded-2xl"
                  style={{ background: "rgba(75,110,255,0.06)", border: "1px solid rgba(75,110,255,0.15)" }}
                  onPointerEnter={pulseDss}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(75,110,255,0.15)" }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="10" cy="10" r="8" stroke="#4B6EFF" strokeWidth="1.5" />
                        <circle
                          ref={dssRingRef}
                          cx="10"
                          cy="10"
                          r="4"
                          stroke="#4B6EFF"
                          strokeWidth="1.5"
                          style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        />
                        <circle cx="10" cy="10" r="1.5" fill="#4B6EFF" />
                      </svg>
                    </div>
                    <div>
                      <div
                        className="font-semibold text-white text-sm mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        Dieter Schwarz Stiftung / Schwarz Digits
                      </div>
                      <div
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                      >
                        Förder- und Praxispartner des Forschungsprojekts. Schwarz Digits bringt
                        insbesondere die Perspektive eines europäischen Anbieters digitaler
                        Infrastruktur in das Projekt ein.
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </RevealItem>

              {/* HSG */}
              <RevealItem>
                <SpotlightCard
                  color="#A855F7"
                  tilt={0}
                  className="p-6 rounded-2xl"
                  style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}
                  onPointerEnter={raiseHsg}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(168,85,247,0.15)" }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M10 2L2 7v2h16V7L10 2z" stroke="#A855F7" strokeWidth="1.5" strokeLinejoin="round" />
                        {["M4 9v7", "M8 9v7", "M12 9v7", "M16 9v7"].map((d, i) => (
                          <path
                            key={d}
                            ref={(el) => {
                              hsgColsRef.current[i] = el;
                            }}
                            d={d}
                            stroke="#A855F7"
                            strokeWidth="1.5"
                          />
                        ))}
                        <path d="M2 16h16" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div
                        className="font-semibold text-white text-sm mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        IWI-HSG, Universität St. Gallen
                      </div>
                      <div
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                      >
                        Wissenschaftliche Durchführung durch das Institut für Wirtschaftsinformatik der
                        Universität St.Gallen. Entwicklung des Messmodells, empirische Untersuchung und
                        Analyse organisationaler digitaler Souveränität.
                      </div>
                      <div
                        className="text-xs leading-relaxed mt-2"
                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                      >
                        Prof. Dr. Mahei Li · Prof. Dr. Andreas Janson · Prof. Dr. Andreas Hein
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </RevealItem>
            </RevealGroup>
          </div>

          {/* Three project pillars */}
          <div
            className="rounded-2xl p-6 lg:p-8 mb-16"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <DecodeText
              as="div"
              text="Projektsäulen"
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "rgba(139,164,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
            />
            <div ref={gridRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pipeline-Linie: Desktop waagrecht ueber den Spalten, Handy senkrecht links */}
              <motion.div
                // reduced im key: ein Live-Wechsel der OS-Einstellung baut die Linie
                // neu auf, damit kein scale- bzw. clip-Startwert haengen bleibt.
                key={`${mobile ? "v" : "h"}-${reduced ? "r" : "m"}`}
                ref={lineRef}
                aria-hidden="true"
                data-fx-reveal=""
                className="fx-deco pointer-events-none absolute left-[3px] top-4 w-px origin-top md:left-0 md:right-0 md:top-[3px] md:h-px md:w-auto md:origin-left"
                style={{ background: LINE_COLOR }}
                initial={
                  reduced
                    ? { clipPath: mobile ? CLIP_HIDDEN_V : CLIP_HIDDEN_H }
                    : mobile
                      ? { scaleY: 0 }
                      : { scaleX: 0 }
                }
                animate={
                  pillarsGo
                    ? reduced
                      ? { clipPath: CLIP_FULL }
                      : mobile
                        ? { scaleY: 1 }
                        : { scaleX: 1 }
                    : undefined
                }
                transition={{ duration: 1.1, ease: EASE_IN_OUT }}
              />
              {PILLARS.map(({ n, title, desc }, i) => {
                const delay = PILLAR_DELAYS[i];
                return (
                  <div key={n} className="relative pl-6 md:pl-0 md:pt-6">
                    <motion.span
                      ref={(el) => {
                        nodeRefs.current[i] = el;
                      }}
                      aria-hidden="true"
                      data-fx-reveal=""
                      className="fx-deco pointer-events-none absolute left-0 top-[calc(1rem-3.5px)] h-[7px] w-[7px] rounded-full md:top-0"
                      style={{ background: NUMBER_LIT, boxShadow: "0 0 8px rgba(139,164,255,0.6)" }}
                      // reduce: nur Aufhellen, kein Wachsen (animate setzt scale 1
                      // ohnehin; MotionConfig "user" laesst es dann sofort springen)
                      initial={reduced ? { opacity: 0.3 } : { opacity: 0.3, scale: 0.7 }}
                      animate={pillarsGo ? { opacity: 1, scale: 1 } : undefined}
                      transition={{ duration: 0.3, delay, ease: EASE_OUT }}
                    />
                    <div
                      className="relative text-2xl font-bold mb-2"
                      style={{ color: NUMBER_DIM, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <DecodeText
                        text={n}
                        trigger="manual"
                        play={pillarsIn}
                        glyphs={PILLAR_GLYPHS}
                        duration={400}
                        delay={delay * 1000}
                      />
                      {/* Farbwechsel nach dem Decode: Overlay-Kopie, nur opacity */}
                      <motion.span
                        aria-hidden="true"
                        data-fx-reveal=""
                        className="pointer-events-none absolute left-0 top-0"
                        style={{ color: NUMBER_LIT }}
                        initial={{ opacity: 0 }}
                        animate={pillarsGo ? { opacity: 1 } : undefined}
                        transition={{ duration: 0.3, delay: delay + 0.4, ease: EASE_OUT }}
                      >
                        {n}
                      </motion.span>
                    </div>
                    <div
                      className="font-semibold text-white text-sm mb-2"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {title}
                    </div>
                    <div
                      className="text-xs leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                    >
                      {desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter breit />
    </section>
  );
};

export default Footer;
