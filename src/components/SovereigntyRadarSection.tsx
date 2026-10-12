import { useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import RadarVisual, { SCENARIOS } from "./RadarVisual";
import {
  DotNav,
  EASE_OUT,
  GlowCrossfade,
  Ping,
  Reveal,
  SectionHeader,
  SegmentedPills,
  useInViewOnce,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";

const PILL_LAYOUT_ID = "scenario-pill";
const PANEL_ID = "scenario-panel";

const AREAS = [
  "Cloud- und Infrastrukturabhängigkeiten",
  "Abhängigkeiten von KI-Modellen und -Anbietern",
  "Daten- und Schnittstellenabhängigkeiten",
];

// Ebenen fuer den Crossfade (Gradients/Schatten interpolieren nicht)
const BG_GLOWS = SCENARIOS.map(
  (s) => `radial-gradient(ellipse 60% 50% at 50% 50%, ${s.color}08 0%, transparent 70%)`,
);
const CARD_SHADOWS = SCENARIOS.map((s) => `0 0 60px ${s.color}15, 0 0 120px ${s.color}08`);
const PILL_ITEMS = SCENARIOS.map((s) => ({
  id: s.id,
  label: s.tag,
  color: s.color,
  colorBg: s.colorBg,
  colorBorder: s.colorBorder,
}));
const DOT_ITEMS = SCENARIOS.map((s) => ({ id: s.id, label: s.tag, color: s.color }));

// Inhaltswechsel: Exit 140 ms, Enter 280 ms, Kinder mit 35 ms Versatz
const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0, transform: "translateY(8px)", filter: "blur(4px)" },
  shown: {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
    transition: { duration: 0.28, ease: EASE_OUT, staggerChildren: 0.035 },
  },
  gone: {
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.14, ease: EASE_OUT },
  },
};
const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, transform: "translateY(6px)" },
  shown: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.28, ease: EASE_OUT } },
  gone: {},
};
// Sanfte Stufe (reduzierte Bewegung): gleiche Dauern und Staffelung, aber nur
// opacity (kein Versatz, kein Blur)
const PANEL_VARIANTS_REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.28, ease: EASE_OUT, staggerChildren: 0.035 } },
  gone: { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } },
};
const ITEM_VARIANTS_REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.28, ease: EASE_OUT } },
  gone: {},
};

// Zeichen rollen wie bei fx/SlotText von unten ein (450 ms, 18 ms Versatz)
const STAT_CHAR_VARIANTS: Variants = {
  hidden: { transform: "translateY(100%)" },
  shown: (delay: number) => ({
    transform: "translateY(0%)",
    transition: { duration: 0.45, ease: EASE_OUT, delay },
  }),
};
// Sanfte Stufe: wie SlotText bei reduce, Crossfade pro Zeichen statt Rollen
const STAT_CHAR_VARIANTS_REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.45, ease: EASE_OUT, delay },
  }),
};
const STAT_CHAR_BOX = { height: "1.15em", lineHeight: "1.15em" } as const;

/**
 * Schluesselzahl als Zaehlwerk (wie fx/SlotText), aber mit genau einem
 * lesbaren Textknoten: Der Wert steht einmal sr-only im DOM, die sichtbaren
 * Zeichen kommen aus ::before (attr(data-c)) und tauchen weder in textContent
 * noch in innerText auf. Woerter bleiben einzeln umbrechbar.
 */
const StatValue = ({ value, play }: { value: string; play: boolean }) => {
  const reduced = useReducedMotionSafe();
  const charVariants = reduced ? STAT_CHAR_VARIANTS_REDUCED : STAT_CHAR_VARIANTS;

  const words = value.split(" ");
  let index = 0;
  return (
    <span className="relative">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {words.map((word, w) => {
          const glyphs = Array.from(word);
          if (w < words.length - 1) glyphs.push("\u00a0");
          return (
            <span key={w} className="inline-flex">
              {glyphs.map((c, i) => {
                const delay = 0.12 + index++ * 0.018;
                return (
                  <span key={i} className="inline-block overflow-hidden align-bottom" style={STAT_CHAR_BOX}>
                    <motion.span
                      data-fx-reveal=""
                      data-c={c}
                      className="inline-block before:content-[attr(data-c)]"
                      custom={delay}
                      variants={charVariants}
                      initial="hidden"
                      animate={play ? "shown" : "hidden"}
                    />
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </span>
  );
};

const SovereigntyRadarSection = () => {
  const [{ active, changeKey }, setState] = useState({ active: 1, changeKey: 0 }); // Default: Hybrid Control
  const scenario = SCENARIOS[active];
  const reduced = useReducedMotionSafe();

  const sectionRef = useRef<HTMLElement | null>(null);
  const radarCardRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  usePauseOffscreen(sectionRef);
  const acquired = useInViewOnce(radarCardRef, { amount: 0.4 });
  const panelSeen = useInViewOnce(panelRef, { amount: 0.2 });

  const select = (id: number) =>
    setState((s) => (s.active === id ? s : { active: id, changeKey: s.changeKey + 1 }));

  const panelVariants = reduced ? PANEL_VARIANTS_REDUCED : PANEL_VARIANTS;
  const itemVariants = reduced ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;

  return (
    <section
      ref={sectionRef}
      id="radar"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Subtle background glow */}
      <GlowCrossfade layers={BG_GLOWS} active={active} />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Section header */}
        <SectionHeader
          eyebrow="Interaktiver Sovereignty Radar"
          lines={["Drei Pfade für Europa, 2030"]}
          lead={
            <>
              Die drei Szenarien zeigen, wie sich unterschiedliche technologische, marktliche und
              regulatorische Entwicklungen auf digitale Abhängigkeiten in Europa auswirken könnten.
            </>
          }
          className="mb-16 lg:mb-20"
          leadClassName="text-base max-w-xl"
        />

        {/* Main grid: Radar + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Radar */}
          <Reveal y={24} className="flex justify-center min-w-0">
            {/* Deckende Fuellung statt backdrop-filter (wie .fx-glass-card unter
                768 px): Sweep und Blips laufen dauerhaft in der Karte, ein
                Glas-Backdrop muesste sonst in jedem Frame neu weichzeichnen. */}
            <div
              ref={radarCardRef}
              className="relative p-6 lg:p-8 rounded-2xl min-w-0 max-w-full"
              style={{ background: "rgba(12,16,32,0.86)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <GlowCrossfade kind="shadow" layers={CARD_SHADOWS} active={active} />
              <RadarVisual
                activeScenario={active}
                size={420}
                showSweep
                acquired={acquired}
                changeKey={changeKey}
              />
            </div>
          </Reveal>

          {/* Right: Scenario info */}
          <Reveal y={24} className="min-w-0">
            {/* Scenario selector tabs */}
            <SegmentedPills
              items={PILL_ITEMS}
              value={active}
              onChange={select}
              layoutId={PILL_LAYOUT_ID}
              panelId={PANEL_ID}
              className="mb-8"
            />

            {/* Scenario content */}
            <div
              ref={panelRef}
              id={PANEL_ID}
              role="tabpanel"
              aria-labelledby={`${PILL_LAYOUT_ID}-tab-${active}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  variants={panelVariants}
                  initial="hidden"
                  animate="shown"
                  exit="gone"
                >
                  {/* Title */}
                  <motion.div variants={itemVariants} className="mb-2">
                    <span
                      className="text-xs font-bold tracking-widest uppercase"
                      style={{ color: scenario.color, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {scenario.tag}
                    </span>
                  </motion.div>
                  <motion.h3
                    variants={itemVariants}
                    className="text-3xl font-semibold text-white mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                  >
                    {scenario.title}
                  </motion.h3>
                  <motion.p
                    variants={itemVariants}
                    className="text-base mb-6"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {scenario.subtitle}
                  </motion.p>
                  <motion.p
                    variants={itemVariants}
                    className="text-sm leading-relaxed mb-8"
                    style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                  >
                    {scenario.description}
                  </motion.p>

                  {/* Bereiche, in denen Abhängigkeiten entstehen */}
                  <motion.div variants={itemVariants} className="mb-8">
                    <div
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Betroffene Bereiche
                    </div>
                    <div className="space-y-2.5">
                      {AREAS.map((label) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="relative w-1.5 h-1.5 shrink-0">
                            <span
                              className="block w-full h-full rounded-full"
                              style={{ background: scenario.color }}
                            />
                            <Ping play={panelSeen ? 1 : 0} color={scenario.color} size={6} />
                          </span>
                          <span
                            className="text-xs font-medium"
                            style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Key metrics */}
                  <motion.div
                    variants={itemVariants}
                    className="rounded-xl p-5"
                    style={{
                      background: scenario.colorBg,
                      border: `1px solid ${scenario.colorBorder}`,
                    }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: scenario.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                      Schlüsselzahlen
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {scenario.stats.map(({ label, value }) => (
                        <div key={label}>
                          <div
                            className="text-lg font-bold text-white mb-0.5"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            <StatValue value={value} play={panelSeen} />
                          </div>
                          <div
                            className="text-[10px] leading-tight"
                            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                          >
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>

        {/* Bottom navigation hint */}
        <Reveal y={0} delay={0.3} className="mt-16">
          <DotNav items={DOT_ITEMS} value={active} onChange={select} />
        </Reveal>
      </div>
    </section>
  );
};

export default SovereigntyRadarSection;
