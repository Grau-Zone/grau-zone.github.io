import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import CapacityRadar, { CAPACITIES, BASELINE_VALUES } from "./CapacityRadar";
import {
  DotNav,
  EASE_OUT,
  GlowCrossfade,
  LineReveal,
  Reveal,
  ScanDivider,
  SectionHeader,
  SegmentedPills,
  useInViewOnce,
  useReducedMotionSafe,
} from "@/components/fx";

const BG_LAYERS = CAPACITIES.map(
  (c) => `radial-gradient(ellipse 60% 50% at 50% 50%, ${c.color}08 0%, transparent 70%)`,
);
const SHADOW_LAYERS = CAPACITIES.map((c) => `0 0 60px ${c.color}15, 0 0 120px ${c.color}08`);
const PILL_ITEMS = CAPACITIES.map((c, i) => ({
  id: i,
  label: c.tag,
  color: c.color,
  colorBg: c.colorBg,
  colorBorder: c.colorBorder,
}));
const DOT_ITEMS = CAPACITIES.map((c, i) => ({ id: i, label: c.tag, color: c.color }));

/** Erster Sichtkontakt: so lange nach dem inView, bis Switching aufzieht. */
const ARM_DELAY_MS = 400;
/** Panel-Takt (Sekunden) */
const T_QUESTION = 0.1;
const T_BAR = 0.14;
const BAR_S = 0.4;
const T_DEF_TEXT = T_BAR + BAR_S;
const T_LIST = 0.22;
const LIST_STAGGER = 0.045;

const OrgSovereignty = () => {
  const reduced = useReducedMotionSafe();
  const [active, setActive] = useState(0);
  const cap = CAPACITIES[active];

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
    <section
      id="organisationen"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Divider top */}
      <ScanDivider position="top" />

      {/* Subtle background glow that follows the active capacity */}
      <GlowCrossfade layers={BG_LAYERS} active={active} duration={0.8} />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Section header */}
        <SectionHeader
          eyebrow="Digitale Souveränität von Organisationen"
          lines={["Vier Fähigkeiten bestimmen den", "organisationalen Handlungsspielraum"]}
          lead={
            <>
              Digitale Souveränität bezeichnet den Handlungsspielraum einer Organisation im Umgang
              mit kritischen digitalen Abhängigkeiten. Wir erfassen diesen Handlungsspielraum anhand
              von vier organisationalen Fähigkeiten: Switching, Internalization, Multi-Sourcing und
              Negotiation.
            </>
          }
          className="mb-16 lg:mb-20 max-w-3xl"
          leadClassName="text-base leading-relaxed"
        />

        {/* Main grid: Radar + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Radar */}
          <Reveal y={24} className="flex justify-center min-w-0">
            <div
              ref={radarRef}
              className="fx-glass-card relative p-6 lg:p-8 rounded-2xl min-w-0 max-w-full"
              style={{ border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <GlowCrossfade layers={SHADOW_LAYERS} active={active} kind="shadow" duration={0.6} />
              <div className="relative">
                <CapacityRadar
                  values={radarValues}
                  color={cap.color}
                  activeIndex={armed ? active : undefined}
                  size={560}
                />
              </div>
            </div>
          </Reveal>

          {/* Right: Capacity info */}
          <Reveal y={24}>
            {/* Capacity selector tabs */}
            <SegmentedPills
              items={PILL_ITEMS}
              value={active}
              onChange={select}
              layoutId="capacity-pill"
              panelId="capacity-panel"
              className="mb-8"
            />

            {/* Capacity content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                id="capacity-panel"
                role="tabpanel"
                aria-labelledby={`capacity-pill-tab-${active}`}
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
              >
                <motion.div
                  className="mb-2 flex items-center gap-3"
                  {...rise("translate(0px, 6px)")}
                  transition={enter(0)}
                >
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Fähigkeit 0{active + 1} · {cap.tag}
                  </span>
                </motion.div>
                <LineReveal
                  as="h3"
                  trigger="mount"
                  lines={[cap.title]}
                  delay={0.04}
                  duration={0.6}
                  className="text-3xl font-semibold text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                />
                <motion.p
                  className="text-base mb-5 italic"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                  {...rise("translate(0px, 6px)")}
                  transition={enter(T_QUESTION)}
                >
                  {cap.keyQuestion}
                </motion.p>

                {/* Definition: eigener 2-px-Balken statt borderLeft (zeichnet sich von oben;
                    sanfte Stufe: clip-path-Wipe statt scaleY) */}
                <div className="relative mb-7" style={{ paddingLeft: 18 }}>
                  <motion.span
                    aria-hidden="true"
                    className="fx-deco pointer-events-none absolute left-0 top-0 bottom-0"
                    style={{ width: 2, background: cap.color, transformOrigin: "top center" }}
                    initial={reduced ? { clipPath: "inset(0% 0% 100% 0%)" } : { transform: "scaleY(0)" }}
                    animate={reduced ? { clipPath: "inset(0% 0% 0% 0%)" } : { transform: "scaleY(1)" }}
                    transition={enter(T_BAR, BAR_S)}
                  />
                  <motion.p
                    className="text-sm font-medium leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={enter(T_DEF_TEXT, 0.15)}
                  >
                    {cap.definition}
                  </motion.p>
                </div>

                {/* Relevante Einflussfaktoren: plain list, identical form on all four cards */}
                <div className="rounded-xl p-5 mb-7" style={{ background: cap.colorBg, border: `1px solid ${cap.colorBorder}` }}>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-4"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Relevante Einflussfaktoren
                  </div>
                  <ul className="space-y-2">
                    {cap.drivers.map((d, j) => (
                      <motion.li
                        key={d}
                        className="flex gap-3 items-start text-sm"
                        style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Inter', sans-serif" }}
                        {...listItem(j)}
                      >
                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: cap.color }} />
                        {d}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Beispiele organisationaler Maßnahmen */}
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Beispiele organisationaler Maßnahmen
                  </div>
                  <ul className="space-y-2">
                    {cap.actions.map((action, j) => (
                      <motion.li
                        key={j}
                        className="flex gap-3 items-start text-sm"
                        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                        {...listItem(cap.drivers.length + j)}
                      >
                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: cap.color }} />
                        {action}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </Reveal>
        </div>

        {/* Bottom dot navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <DotNav items={DOT_ITEMS} value={active} onChange={select} />
        </motion.div>
      </div>

      {/* Divider bottom */}
      <ScanDivider position="bottom" />
    </section>
  );
};

export default OrgSovereignty;
