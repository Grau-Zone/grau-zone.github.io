import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, animate, type Variants } from "framer-motion";
import {
  AnimatedValue,
  CSS_EASE_IN_OUT,
  CSS_EASE_OUT,
  DUR,
  EASE_IN_OUT,
  EASE_OUT,
  RevealGroup,
  RevealItem,
  ScanDivider,
  SectionHeader,
  SpotlightCard,
  safeAnimate,
  useFinePointer,
  useReducedMotionSafe,
} from "@/components/fx";
import LayerStack3D from "@/components/LayerStack3D";

type LayerId = "infra" | "model" | "data";

interface Layer {
  id: LayerId;
  number: string;
  title: string;
  subtitle: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  icon: ReactNode;
  description: string;
  keyQuestion: string;
  actions: string[];
  indicators: { label: string; value: string }[];
}

/**
 * Bereichs-Icon. Mit play laeuft einmal pro Oeffnen ein kleiner Moment:
 * Infra-LEDs blinken einmal, die Modell-Strahlen drehen per Feder um 45 Grad,
 * die obere Daten-Ellipse setzt sich. Reduziert (sanfte Stufe): LEDs blinken
 * wie gehabt (nur opacity), Strahlen und Ellipse blenden kurz ab und wieder
 * auf statt sich zu drehen bzw. zu setzen.
 */
function LayerIcon({ id, play = false }: { id: LayerId; play?: boolean }) {
  const reduced = useReducedMotionSafe();
  const led1Ref = useRef<SVGCircleElement | null>(null);
  const led2Ref = useRef<SVGCircleElement | null>(null);
  const raysRef = useRef<SVGPathElement | null>(null);
  const topRef = useRef<SVGEllipseElement | null>(null);

  useEffect(() => {
    if (!play) return;
    if (id === "infra") {
      const anims = [led1Ref.current, led2Ref.current].map((el) =>
        safeAnimate(el, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 300, easing: CSS_EASE_IN_OUT }),
      );
      return () => anims.forEach((a) => a?.cancel());
    }
    if (reduced) {
      // Sanfte Stufe: kein Drehen/Setzen, nur ein kurzes Abblenden und Aufleuchten
      const el = id === "model" ? raysRef.current : topRef.current;
      const a = safeAnimate(el, [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], {
        duration: 600,
        easing: CSS_EASE_IN_OUT,
      });
      return () => a?.cancel();
    }
    if (id === "model") {
      const el = raysRef.current;
      if (!el) return;
      const controls = animate(0, 45, {
        type: "spring",
        duration: 0.6,
        bounce: 0.3,
        onUpdate: (v) => {
          el.style.transform = `rotate(${v}deg)`;
        },
      });
      return () => {
        controls.stop();
        // 45 Grad sind bei acht Strahlen deckungsgleich mit 0 Grad
        el.style.transform = "";
      };
    }
    const a = safeAnimate(topRef.current, [{ transform: "translateY(-2px)" }, { transform: "translateY(0px)" }], {
      duration: 300,
      easing: CSS_EASE_OUT,
    });
    return () => a?.cancel();
  }, [play, reduced, id]);

  if (id === "infra") {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="6" rx="1" />
        <rect x="2" y="12" width="20" height="6" rx="1" />
        <circle ref={led1Ref} cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle ref={led2Ref} cx="6" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (id === "model") {
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path
          ref={raysRef}
          style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
          d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse ref={topRef} cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

const layers: Layer[] = [
  {
    id: "infra",
    number: "01",
    title: "Cloud und Infrastruktur",
    subtitle:
      "Wie stark ist die Organisation technisch und vertraglich an bestimmte Infrastruktur-Anbieter gebunden?",
    color: "#4B6EFF",
    colorBg: "rgba(75,110,255,0.08)",
    colorBorder: "rgba(75,110,255,0.2)",
    icon: <LayerIcon id="infra" />,
    description:
      "Abhängigkeiten entstehen hier durch Anbieter, Standorte und Rechtsordnungen. Der europäische Cloud-Markt wird von US-Hyperscalern geprägt: Amazon, Microsoft und Google halten rund 70% des Markts. Je enger eine Organisation an einen Anbieter gebunden ist, desto kleiner ist ihr Handlungsspielraum.",
    keyQuestion: "Wie hoch sind die Wechselkosten?",
    actions: [
      "Europäische Cloud-Anbieter evaluieren: STACKIT, OVHcloud, SAP BTP",
      "Datenlokalisierung vertraglich sichern (DORA, Data Act)",
      "Exit-Strategie und Wechselkosten berechnen",
      "Hybrid-Cloud-Architektur als Übergangsmodell",
    ],
    indicators: [
      { label: "Cloud-Marktanteil EU-Anbieter", value: "15%" },
      { label: "Avg. Wechselkosten", value: "8,5 Mio. €" },
      { label: "Zeit für Migration", value: "18 Mon." },
    ],
  },
  {
    id: "model",
    number: "02",
    title: "KI-Modelle und Services",
    subtitle:
      "Welche Abhängigkeiten entstehen durch Modelle, APIs und Anbieterökosysteme?",
    color: "#A855F7",
    colorBg: "rgba(168,85,247,0.08)",
    colorBorder: "rgba(168,85,247,0.2)",
    icon: <LayerIcon id="model" />,
    description:
      "Abhängigkeiten entstehen hier durch Modelle, APIs und die Ökosysteme der Anbieter. Wer ein Modell trainiert hat und wer seine weitere Entwicklung kontrolliert, bestimmt die Bindung an diesen Anbieter. Chinesische Open-Source-Modelle wie DeepSeek und Qwen bieten deutliche Kostenvorteile. Ihre Trainingsprovenienz bleibt intransparent.",
    keyQuestion: "Wie austauschbar sind Modelle und APIs?",
    actions: [
      "Europäische KI-Modelle priorisieren: Mistral, Aleph Alpha / PhariaAI",
      "Open-Source-Modelle auf Bias und Zensur auditieren (EuroHPC AI Factories)",
      "SAP Joule für Enterprise-Workflows als europäische Alternative prüfen",
      "Fine-Tuning auf eigenen Daten auf europäischer Infrastruktur",
    ],
    indicators: [
      { label: "Mistral AI Bewertung", value: "13,8 Mrd. $" },
      { label: "Kostenvorteil DeepSeek", value: "20–30×" },
      { label: "Open-Weight-Adoption", value: "+67%" },
    ],
  },
  {
    id: "data",
    number: "03",
    title: "Daten und Schnittstellen",
    subtitle:
      "Welche Abhängigkeiten entstehen durch Speicherung, Zugriff, Übertragung und Portabilität von Daten?",
    color: "#00C4A0",
    colorBg: "rgba(0,196,160,0.08)",
    colorBorder: "rgba(0,196,160,0.2)",
    icon: <LayerIcon id="data" />,
    description:
      "Abhängigkeiten entstehen hier durch Speicherorte, Zugriffsrechte, Formate und Schnittstellen. Sie bestimmen, wie leicht Daten zu einem anderen Anbieter verlagert werden können. Catena-X zeigt mit 190+ Mitgliedern, dass geregelter Datenaustausch zwischen Organisationen in der Praxis funktioniert.",
    keyQuestion: "Wie portabel sind die Daten?",
    actions: [
      "Data-Governance-Framework einführen (EU Data Act, DORA-konform)",
      "Datenflüsse kartieren: intern, mit Partnern, mit Clouds",
      "Datentreuhänder-Modelle evaluieren (Gaia-X, Catena-X)",
      "Technische Kontrolle: Verschlüsselung, Zero-Trust-Architektur",
    ],
    indicators: [
      { label: "Catena-X Mitglieder", value: "190+" },
      { label: "DORA Compliance Frist", value: "Jan. 2025" },
      { label: "EU Data Act seit", value: "Sep. 2025" },
    ],
  },
];

const FONT_GROTESK = "'Space Grotesk', sans-serif";
const FONT_INTER = "'Inter', sans-serif";

// Inhalt im offenen Panel: Beschreibung, Ueberschrift, vier Punkte (gestaffelt)
const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, transform: "translateY(6px)" },
  shown: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.26, ease: EASE_OUT } },
};
const BOX_VARIANTS: Variants = {
  hidden: { opacity: 0, transform: "translateX(12px)" },
  shown: { opacity: 1, transform: "translateX(0px)", transition: { duration: 0.32, ease: EASE_OUT } },
};
// Sanfte Stufe (reduzierte Bewegung): gleiche Dauern, nur opacity, kein Versatz
const ITEM_VARIANTS_SOFT: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.26, ease: EASE_OUT } },
};
const BOX_VARIANTS_SOFT: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.32, ease: EASE_OUT } },
};

/** Basisverzoegerung (s), ab der die Kennzahlen zaehlen bzw. rollen. */
const VALUE_DELAY = 0.3;
const VALUE_STAGGER = 0.06;

interface LayerCardProps {
  layer: Layer;
  isOpen: boolean;
  onToggle: (id: LayerId) => void;
  onHover: (id: LayerId | null) => void;
}

function LayerCard({ layer, isOpen, onToggle, onHover }: LayerCardProps) {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  // Hover-Flaeche ist nur opacity (bleibt bei reduce), der Zahl-Versatz ist Bewegung (aus)
  const hoverFx = fine;
  const hoverShift = fine && !reduced;

  const headerId = `layer-header-${layer.id}`;
  const titleId = `layer-title-${layer.id}`;
  const subtitleId = `layer-subtitle-${layer.id}`;
  const panelId = `layer-panel-${layer.id}`;

  const panelVariants: Variants = {
    hidden: { height: 0, opacity: 0 },
    shown: {
      height: "auto",
      opacity: 1,
      // reduce: Hoehe springt (kein Schieben), Einblenden und Staffelung laufen normal
      transition: reduced
        ? {
            height: { duration: 0 },
            opacity: { duration: 0.2, ease: EASE_OUT },
            delayChildren: 0.08,
            staggerChildren: 0.04,
          }
        : {
            height: { duration: 0.32, ease: EASE_OUT },
            opacity: { duration: 0.2, delay: 0.08, ease: EASE_OUT },
            delayChildren: 0.08,
            staggerChildren: 0.04,
          },
    },
  };
  // reduce: nur ausblenden, ohne height. framer (reducedMotion="user") setzt Positionswerte wie
  // height sofort und verwirft dabei jedes delay; so entfernt AnimatePresence das Panel erst
  // nach dem Fade, die Hoehe springt danach.
  const panelExit = reduced
    ? { opacity: 0, transition: { opacity: { duration: 0.12, ease: EASE_OUT } } }
    : {
        height: 0,
        opacity: 0,
        transition: { height: { duration: 0.22, ease: EASE_OUT }, opacity: { duration: 0.12, ease: EASE_OUT } },
      };
  const itemVariants = reduced ? ITEM_VARIANTS_SOFT : ITEM_VARIANTS;
  const boxVariants = reduced ? BOX_VARIANTS_SOFT : BOX_VARIANTS;

  return (
    <SpotlightCard
      color={layer.color}
      intensity={0.08}
      tilt={0}
      className="group rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${isOpen ? layer.colorBorder : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.3s",
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onHover(layer.id);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onHover(null);
      }}
    >
      {/* Flaechen als gestapelte Ebenen (nur opacity): offen und Hover */}
      <div
        aria-hidden="true"
        className="fx-deco pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ zIndex: -2, background: layer.colorBg, opacity: isOpen ? 1 : 0, transition: "opacity 0.3s" }}
      />
      {hoverFx ? (
        <div
          aria-hidden="true"
          className="fx-deco pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{ zIndex: -2, background: "rgba(255,255,255,0.02)" }}
        />
      ) : null}

      {/* Akzentkante links; zIndex -1 (in der isolierten Karte), damit sie unter
          dem nach innen versetzten Fokusring des Buttons liegt statt darueber */}
      <motion.span
        aria-hidden="true"
        className="fx-deco pointer-events-none absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ zIndex: -1, background: layer.color, transformOrigin: "50% 0%" }}
        initial={false}
        // reduce: clip-path-Wipe von oben statt scaleY (deckt auf, ohne zu skalieren)
        animate={
          reduced
            ? { transform: "scaleY(1)", clipPath: isOpen ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }
            : { transform: isOpen ? "scaleY(1)" : "scaleY(0)", clipPath: "inset(0% 0% 0% 0%)" }
        }
        transition={
          reduced
            ? { transform: { duration: 0 }, clipPath: { duration: isOpen ? 0.35 : 0.2, ease: EASE_OUT } }
            : { duration: isOpen ? 0.35 : 0.2, ease: EASE_OUT }
        }
      />

      {/* Header row (h3 nur als Huelle; Laufweite wie zuvor nur am Titel) */}
      <h3 style={{ letterSpacing: "normal" }}>
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-labelledby={titleId}
          aria-describedby={subtitleId}
          onClick={() => onToggle(layer.id)}
          onFocus={() => onHover(layer.id)}
          onBlur={() => onHover(null)}
          className="w-full text-left flex items-center gap-6 p-6 lg:p-8 rounded-2xl cursor-pointer focus-visible:[outline-offset:-3px]"
        >
          {/* Number */}
          <span
            className={[
              "relative text-4xl font-bold shrink-0 w-12",
              hoverShift ? "transition-transform duration-150 ease-fx-out group-hover:translate-x-[2px]" : "",
            ].join(" ")}
            style={{
              color: "rgba(255,255,255,0.5)",
              fontFamily: FONT_GROTESK,
            }}
          >
            {layer.number}
            <motion.span
              aria-hidden="true"
              className="absolute inset-0"
              style={{ color: layer.color }}
              initial={false}
              animate={{ clipPath: isOpen ? "inset(0% 0% 0% 0%)" : "inset(0% 100% 0% 0%)" }}
              transition={{ duration: isOpen ? 0.38 : 0.2, ease: EASE_IN_OUT }}
            >
              {layer.number}
            </motion.span>
          </span>

          {/* Icon */}
          <span
            className="block shrink-0 p-3 rounded-xl"
            style={{
              background: isOpen ? `${layer.color}20` : "rgba(255,255,255,0.04)",
              color: isOpen ? layer.color : "rgba(255,255,255,0.5)",
              transition: "color 0.3s, background-color 0.3s",
            }}
          >
            <LayerIcon id={layer.id} play={isOpen} />
          </span>

          {/* Text */}
          <span className="block flex-1 min-w-0">
            <span
              id={titleId}
              className="block text-xl font-semibold text-white"
              style={{ fontFamily: FONT_GROTESK, letterSpacing: "-0.025em" }}
            >
              {layer.title}
            </span>
            <span
              id={subtitleId}
              className="block text-sm mt-0.5"
              style={{
                color: isOpen ? layer.color : "rgba(255,255,255,0.5)",
                fontFamily: FONT_GROTESK,
                transition: "color 0.3s",
              }}
            >
              {layer.subtitle}
            </span>
          </span>

          {/* Key question badge */}
          <span className="hidden lg:block text-right shrink-0">
            <span
              className="text-xs italic"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONT_INTER }}
            >
              {layer.keyQuestion}
            </span>
          </span>

          {/* Chevron */}
          <span
            aria-hidden="true"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: isOpen ? layer.colorBg : "rgba(255,255,255,0.04)",
              border: `1px solid ${isOpen ? layer.colorBorder : "rgba(255,255,255,0.08)"}`,
              // reduce: keine Drehung; der Pfeil wechselt per Crossfade (siehe unten)
              transform: !reduced && isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: reduced
                ? "background-color 0.3s, border-color 0.3s"
                : `transform 250ms ${CSS_EASE_IN_OUT}, background-color 0.3s, border-color 0.3s`,
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke={isOpen ? layer.color : "rgba(255,255,255,0.5)"} strokeWidth="1.5">
              {reduced ? (
                <>
                  <path
                    d="M4 6l4 4 4-4"
                    style={{ opacity: isOpen ? 0 : 1, transition: `opacity ${DUR.fade}s ${CSS_EASE_OUT}` }}
                  />
                  {/* derselbe Pfeil um 180 Grad gedreht, als fester Pfad */}
                  <path
                    d="M12 10l-4-4-4 4"
                    style={{ opacity: isOpen ? 1 : 0, transition: `opacity ${DUR.fade}s ${CSS_EASE_OUT}` }}
                  />
                </>
              ) : (
                <path d="M4 6l4 4 4-4" />
              )}
            </svg>
          </span>
        </button>
      </h3>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            variants={panelVariants}
            initial="hidden"
            animate="shown"
            exit={panelExit}
            style={{ overflow: "hidden" }}
          >
            <div className="px-6 lg:px-8 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Description + actions */}
              <div className="lg:col-span-2">
                <motion.p
                  variants={itemVariants}
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "rgba(255,255,255,0.55)", fontFamily: FONT_INTER }}
                >
                  {layer.description}
                </motion.p>
                <div>
                  <motion.div
                    variants={itemVariants}
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: layer.color, fontFamily: FONT_GROTESK }}
                  >
                    Empfohlene Maßnahmen
                  </motion.div>
                  <ul className="space-y-2">
                    {layer.actions.map((action, j) => (
                      <motion.li
                        key={j}
                        variants={itemVariants}
                        className="flex gap-3 items-start text-sm"
                        style={{ color: "rgba(255,255,255,0.55)", fontFamily: FONT_INTER }}
                      >
                        <span
                          className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: layer.color }}
                        />
                        {action}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Indicators */}
              <motion.div
                variants={boxVariants}
                className="rounded-xl p-5"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${layer.colorBorder}` }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-5"
                  style={{ color: layer.color, fontFamily: FONT_GROTESK }}
                >
                  Kennzahlen
                </div>
                <div className="space-y-5">
                  {layer.indicators.map(({ label, value }, k) => (
                    <div key={label}>
                      <div
                        className="text-2xl font-bold text-white mb-0.5"
                        style={{ fontFamily: FONT_GROTESK }}
                      >
                        <AnimatedValue value={value} play={isOpen} delay={VALUE_DELAY + k * VALUE_STAGGER} />
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONT_INTER }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
}

const SovereigntyLayers = () => {
  const [openId, setOpenId] = useState<LayerId | null>(null);
  const [hoverId, setHoverId] = useState<LayerId | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const toggle = (id: LayerId) => setOpenId((cur) => (cur === id ? null : id));
  const hover = (id: LayerId | null) => setHoverId(id);

  return (
    <section
      id="layers"
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "transparent" }}
    >
      <ScanDivider position="top" alpha={0.12} />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div
          ref={headerRef}
          className="mb-16 lg:mb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-12"
        >
          <SectionHeader
            eyebrow="Sovereignty Radar"
            lines={["Drei Bereiche", "digitaler Abhängigkeit"]}
            lead="Digitale Abhängigkeiten können in unterschiedlichen technologischen Bereichen entstehen. Der Sovereignty Radar unterscheidet drei zentrale Bereiche: Cloud-Infrastruktur, KI-Modelle sowie Daten und Schnittstellen."
            leadClassName="text-base max-w-xl"
          />
          <LayerStack3D
            className="mt-10 lg:mt-0"
            layers={layers.map(({ id, number, color, icon }) => ({ id, number, color, icon }))}
            active={openId ?? hoverId}
            explodeTarget={headerRef}
            onSelect={(id) => toggle(id as LayerId)}
          />
        </div>

        {/* Layer cards */}
        <RevealGroup className="space-y-4" stagger={0.1}>
          {layers.map((layer) => (
            <RevealItem key={layer.id} y={20}>
              <LayerCard
                layer={layer}
                isOpen={openId === layer.id}
                onToggle={toggle}
                onHover={hover}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      <ScanDivider position="bottom" alpha={0.12} />
    </section>
  );
};

export default SovereigntyLayers;
