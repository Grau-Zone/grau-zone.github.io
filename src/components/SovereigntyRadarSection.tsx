// Abschnitt "Drei Pfade für Europa, 2030" (#radar), weisser Grund.
//
// Links steht das Radar (ab 900 px klebt es beim Lesen), rechts Pfad-Reiter und das
// Dossier des gewaehlten Pfads. Beim Hineinscrollen baut der Scroll-Fortschritt das Radar
// auf: Skala, Ringe, Speichen, dann wachsen die drei Pfade nacheinander aus der Mitte.
// Unter 900 px und bei reduzierter Bewegung laeuft der Aufbau einmalig zeitgesteuert.
// Faehrt der Zeiger ueber einen "Betroffenen Bereich", leuchtet seine Achse im Radar auf.
import { useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useScroll, type Variants } from "framer-motion";
import RadarVisual, { SCENARIOS, TRACE_DASH } from "./RadarVisual";
import {
  EASE_OUT,
  Ping,
  Reveal,
  useFinePointer,
  useInViewOnce,
  useMediaQuery,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";
import { SplitHeading } from "@/rx";

const PILL_LAYOUT_ID = "scenario-pill";
const PANEL_ID = "scenario-panel";
const GREEN = "#00802f";

const AREAS = [
  "Cloud- und Infrastrukturabhängigkeiten",
  "Abhängigkeiten von KI-Modellen und -Anbietern",
  "Daten- und Schnittstellenabhängigkeiten",
];

// Inhaltswechsel: Exit 140 ms, Enter 280 ms, Kinder mit 35 ms Versatz
const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.28, ease: EASE_OUT, staggerChildren: 0.05 } },
  gone: { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } },
};
const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, transform: "translateY(10px)" },
  shown: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.5, ease: EASE_OUT } },
  gone: {},
};
// Sanfte Stufe (reduzierte Bewegung): nur opacity, kein Versatz
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
          if (w < words.length - 1) glyphs.push(" ");
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

/** Linienprobe eines Pfads: dieselbe Linienart wie seine Kontur im Radar. */
const TraceSample = ({ index }: { index: number }) => (
  <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden="true" className="flex-none">
    <line
      x1="2"
      y1="4"
      x2="24"
      y2="4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap={index === 0 ? "round" : "butt"}
      strokeDasharray={TRACE_DASH[index]}
    />
  </svg>
);

const SovereigntyRadarSection = () => {
  const [{ active, changeKey }, setState] = useState({ active: 1, changeKey: 0 }); // Default: Hybrid Control
  const [focusAxis, setFocusAxis] = useState<number | null>(null);
  const scenario = SCENARIOS[active];
  const reduced = useReducedMotionSafe();
  const wide = useMediaQuery("(min-width: 900px)");
  const fine = useFinePointer();
  const scrub = wide && !reduced;

  const sectionRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const radarCardRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  usePauseOffscreen(sectionRef);
  const acquired = useInViewOnce(radarCardRef, { amount: 0.35 });
  const panelSeen = useInViewOnce(panelRef, { amount: 0.2 });

  // Aufbau des Radars beim Hineinscrollen: von 92 % bis 22 % der Fensterhoehe.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start 0.92", "start 0.22"] as unknown as NonNullable<Parameters<typeof useScroll>[0]>["offset"],
  });

  const select = (id: number) => {
    setState((s) => (s.active === id ? s : { active: id, changeKey: s.changeKey + 1 }));
  };

  // Reiter: Pfeil links/rechts, Home und End, Roving Tabindex
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = SCENARIOS.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % n;
    else if (e.key === "ArrowLeft") next = (idx - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    select(SCENARIOS[next].id);
    tabRefs.current[next]?.focus();
  };

  const itemVariants = reduced ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;
  const areaHover = (i: number | null) => (fine ? () => setFocusAxis(i) : undefined);

  return (
    <section ref={sectionRef} id="radar" className="rx-sec bg-background">
      {/* Kopf: Titel links, Lead rechts unten */}
      <div className="rx-wrap">
        <div className="grid gap-6 min-[900px]:grid-cols-12 min-[900px]:items-end min-[900px]:gap-x-10">
          <div className="min-w-0 min-[900px]:col-span-7">
            <SplitHeading as="h2" className="rx-h2" em="Pfade">
              Drei Pfade für Europa, 2030
            </SplitHeading>
          </div>
          <Reveal as="p" className="rx-sub !mt-0 min-w-0 min-[900px]:col-span-5">
            Die drei Szenarien zeigen, wie sich unterschiedliche technologische, marktliche und
            regulatorische Entwicklungen auf digitale Abhängigkeiten in Europa auswirken könnten.
          </Reveal>
        </div>
      </div>

      {/* Bühne: Radar (klebt ab 900 px) und Dossier */}
      <div ref={gridRef} className="rx-wrap mt-[clamp(3rem,6vw,5.5rem)]">
        <div className="grid items-start gap-12 min-[900px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] min-[900px]:gap-x-10 lg:gap-x-16">
          <div className="min-w-0 min-[900px]:sticky min-[900px]:top-24">
            <figure ref={radarCardRef} className="m-0">
              <RadarVisual
                activeScenario={active}
                size={780}
                showSweep
                acquired={acquired}
                changeKey={changeKey}
                progress={scrub ? scrollYProgress : undefined}
                focusAxis={focusAxis}
                onFocusAxis={fine ? setFocusAxis : undefined}
              />
              <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-border pt-3 min-[900px]:border-t">
                <span className="text-[0.9375rem] font-semibold text-ink">Interaktiver Sovereignty Radar</span>
                {/* Punktnavigation */}
                <div className="relative flex items-center">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-border" />
                  {SCENARIOS.map((s) => {
                    const on = s.id === active;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-label={s.tag}
                        aria-pressed={on}
                        onClick={() => select(s.id)}
                        className="fx-press relative flex h-11 w-11 items-center justify-center rounded-full focus-visible:z-10"
                      >
                        <span
                          aria-hidden="true"
                          className="block h-2.5 w-2.5 rounded-full bg-background ring-1 ring-green"
                          style={{
                            background: on ? GREEN : undefined,
                            boxShadow: on ? `0 0 0 4px rgba(0,128,47,0.14)` : undefined,
                            transition: "background-color 0.3s, box-shadow 0.3s",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </figcaption>
            </figure>
          </div>

          <div className="min-w-0">
            {/* Pfad-Reiter */}
            <div role="tablist" className="flex flex-wrap gap-2.5">
              {SCENARIOS.map((s, i) => {
                const on = s.id === active;
                return (
                  <button
                    key={s.id}
                    ref={(n) => {
                      tabRefs.current[i] = n;
                    }}
                    type="button"
                    role="tab"
                    id={`${PILL_LAYOUT_ID}-tab-${s.id}`}
                    aria-selected={on}
                    aria-controls={PANEL_ID}
                    tabIndex={on ? 0 : -1}
                    onClick={() => select(s.id)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                    className={`fx-press relative inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[0.9375rem] sm:px-3.5 font-semibold transition-colors duration-200 ${
                      on ? "border-transparent text-green-ink" : "border-border text-ink hover:border-green"
                    }`}
                    style={{ isolation: "isolate" }}
                  >
                    {on ? (
                      reduced ? (
                        <motion.span
                          aria-hidden="true"
                          className="pointer-events-none absolute -inset-px -z-10 rounded-full border border-green bg-green-soft"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, ease: EASE_OUT }}
                        />
                      ) : (
                        <motion.span
                          layoutId={PILL_LAYOUT_ID}
                          aria-hidden="true"
                          className="pointer-events-none absolute -inset-px -z-10 rounded-full border border-green bg-green-soft"
                          transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                        />
                      )
                    ) : null}
                    <TraceSample index={i} />
                    <span className="relative">{s.tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Dossier des gewählten Pfads */}
            <div
              ref={panelRef}
              id={PANEL_ID}
              role="tabpanel"
              aria-labelledby={`${PILL_LAYOUT_ID}-tab-${active}`}
              className="mt-10 min-[900px]:min-h-[44rem]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={active} variants={PANEL_VARIANTS} initial="hidden" animate="shown" exit="gone">
                  <SplitHeading
                    as="h3"
                    className="text-[clamp(1.9rem,3.3vw,2.9rem)] font-medium leading-[1.04] tracking-[-0.03em] text-ink"
                  >
                    {scenario.title}
                  </SplitHeading>
                  <motion.p
                    variants={itemVariants}
                    data-fx-reveal=""
                    className="mt-4 flex items-baseline gap-3 text-[1.125rem] leading-snug text-muted-foreground"
                  >
                    <span className="flex-none rounded-full bg-green-soft px-3 py-1 text-[0.875rem] font-semibold text-green-ink">
                      {scenario.tag}
                    </span>
                    <span>{scenario.subtitle}</span>
                  </motion.p>
                  <motion.p
                    variants={itemVariants}
                    data-fx-reveal=""
                    className="mt-6 max-w-[52ch] text-[1.0625rem] leading-[1.6] text-ink/85"
                  >
                    {scenario.description}
                  </motion.p>

                  {/* Bereiche, in denen Abhängigkeiten entstehen */}
                  <motion.div variants={itemVariants} data-fx-reveal="" className="mt-10">
                    <div className="mb-3 text-[0.875rem] font-semibold text-ink">Betroffene Bereiche</div>
                    <ul className="rx-rows m-0 list-none p-0">
                      {AREAS.map((label, i) => (
                        <li
                          key={label}
                          className="rx-row flex items-center gap-3.5 py-3.5"
                          onMouseEnter={areaHover(i)}
                          onMouseLeave={areaHover(null)}
                        >
                          <span className="relative h-2 w-2 flex-none">
                            <span className="block h-full w-full rounded-full bg-green" />
                            <Ping play={panelSeen ? 1 : 0} color={GREEN} size={8} />
                          </span>
                          <span className="text-[1rem] font-medium leading-snug text-ink">{label}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Schlüsselzahlen */}
                  <motion.div variants={itemVariants} data-fx-reveal="" className="mt-10">
                    <div className="mb-3 text-[0.875rem] font-semibold text-ink">Schlüsselzahlen</div>
                    <dl className="rx-rows m-0">
                      {scenario.stats.map(({ label, value }, k) => (
                        <div
                          key={label}
                          className="rx-row relative grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 py-4"
                        >
                          <dd className="order-first m-0 text-[clamp(1.6rem,2.5vw,2.3rem)] font-medium leading-none tracking-[-0.03em] tabular-nums text-ink">
                            <StatValue value={value} play={panelSeen} />
                          </dd>
                          <dt className="relative -top-[0.35rem] text-[0.9375rem] leading-snug text-muted-foreground">{label}</dt>
                          {/* Linie zeichnet sich unter der Zeile */}
                          <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-px left-0 h-px w-full origin-left bg-green"
                            initial={reduced ? { opacity: 0 } : { scaleX: 0 }}
                            animate={panelSeen ? (reduced ? { opacity: 1 } : { scaleX: 1 }) : undefined}
                            transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.25 + k * 0.12 }}
                          />
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SovereigntyRadarSection;
