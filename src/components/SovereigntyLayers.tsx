import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import {
  AnimatedValue,
  CSS_EASE_IN_OUT,
  CSS_EASE_OUT,
  LineReveal,
  safeAnimate,
  useReducedMotionSafe,
} from "@/components/fx";
import LayerStack3D from "@/components/LayerStack3D";
import { cn } from "@/lib/utils";
import "./landing-a/landing-a.css";

type LayerId = "infra" | "model" | "data";

interface Layer {
  id: LayerId;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  keyQuestion: string;
  actions: string[];
  indicators: { label: string; value: string }[];
}

/**
 * Bereichs-Zeichnung (feine Linie, Strichstaerke bleibt in jeder Groesse gleich). Mit play laeuft
 * einmal pro Oeffnen ein kleiner Moment: Infra-LEDs blinken einmal, die Modell-Strahlen drehen
 * per Feder um 45 Grad, die obere Daten-Ellipse setzt sich. Reduziert (sanfte Stufe): LEDs
 * blinken wie gehabt (nur opacity), Strahlen und Ellipse blenden kurz ab und wieder auf statt sich
 * zu drehen bzw. zu setzen.
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
      <svg className="la-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="6" rx="1" />
        <rect x="2" y="12" width="20" height="6" rx="1" />
        <circle ref={led1Ref} cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle ref={led2Ref} cx="6" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (id === "model") {
    return (
      <svg className="la-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
    <svg className="la-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

/** Basisverzoegerung (s), ab der die Kennzahlen zaehlen bzw. rollen. */
const VALUE_DELAY = 0.3;
const VALUE_STAGGER = 0.06;

interface LayerRowProps {
  layer: Layer;
  isOpen: boolean;
  /** zaehlt bei jedem Umschalten hoch: so zaehlen die Kennzahlen bei jedem Oeffnen neu */
  seq: number;
  onToggle: (id: LayerId) => void;
  onHover: (id: LayerId | null) => void;
}

/** Reihe, die an Ort und Stelle aufgeht (grid-template-rows 0fr nach 1fr). Geschlossen ist der Inhalt inert. */
function LayerRow({ layer, isOpen, seq, onToggle, onHover }: LayerRowProps) {
  const headerId = `layer-header-${layer.id}`;
  const titleId = `layer-title-${layer.id}`;
  const subtitleId = `layer-subtitle-${layer.id}`;
  const panelId = `layer-panel-${layer.id}`;
  const stagger = (i: number) => ({ ["--i" as string]: i });

  return (
    <div
      className={cn("la-row rx-row", isOpen && "is-open")}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onHover(layer.id);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onHover(null);
      }}
    >
      {/* h3 nur als Huelle; Laufweite wie zuvor nur am Titel */}
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
          className="la-row__btn"
        >
          <span className="la-row__num">{layer.number}</span>
          <span className="la-row__txt">
            <span id={titleId} className="la-row__title">
              {layer.title}
            </span>
            <span id={subtitleId} className="la-row__sub">
              {layer.subtitle}
            </span>
            <span className="la-row__q">{layer.keyQuestion}</span>
          </span>
          <span aria-hidden="true" className="la-row__chev">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 1v12M1 7h12" />
            </svg>
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="la-row__panel"
        {...(isOpen ? {} : ({ inert: "" } as Record<string, unknown>))}
      >
        <div className="la-row__inner">
          <div className="la-pn">
            <div className="la-pn__top">
              <p className="la-pn__desc la-st" style={stagger(0)}>
                {layer.description}
              </p>
              <div className="la-pn__icon la-st" aria-hidden="true" style={stagger(1)}>
                <LayerIcon id={layer.id} play={isOpen} />
              </div>
            </div>

            <div className="la-st" style={stagger(2)}>
              <h4 className="la-pn__h">Empfohlene Maßnahmen</h4>
              <ul className="la-pn__list">
                {layer.actions.map((action, j) => (
                  <li key={j} className="la-st" style={stagger(3 + j)}>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            <div className="la-ev la-st" style={stagger(7)}>
              <h4 className="la-ev__h">Kennzahlen</h4>
              <ul className="la-ev__list" key={isOpen ? seq : "closed"}>
                {layer.indicators.map(({ label, value }, k) => (
                  <li key={label}>
                    <span className="la-ev__v">
                      <AnimatedValue value={value} play={isOpen} delay={VALUE_DELAY + k * VALUE_STAGGER} />
                    </span>
                    <span className="la-ev__l">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SovereigntyLayers = () => {
  const [openId, setOpenId] = useState<LayerId | null>(null);
  const [hoverId, setHoverId] = useState<LayerId | null>(null);
  const [seq, setSeq] = useState(0);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const toggle = (id: LayerId) => {
    setOpenId((cur) => (cur === id ? null : id));
    setSeq((s) => s + 1);
  };
  const hover = (id: LayerId | null) => setHoverId(id);

  return (
    <section id="layers" className="la-ly bg-background">
      <div className="rx-wrap la-ly__in">
        <div className="la-ly__grid">
          <div ref={headerRef} className="la-ly__head">
            <LineReveal
              as="h2"
              className="rx-h2"
              lines={["Drei Bereiche", <>digitaler <span className="text-green">Abhängigkeit</span></>]}
            />
            <p className="rx-sub">
              Digitale Abhängigkeiten können in unterschiedlichen technologischen Bereichen entstehen. Der Sovereignty
              Radar unterscheidet drei zentrale Bereiche: Cloud-Infrastruktur, KI-Modelle sowie Daten und
              Schnittstellen.
            </p>
          </div>

          {/* Linienzeichnung des Stapels: bleibt beim Lesen der Reihen im Bild (ab 62rem) */}
          <div className="la-ly__stage">
            <div className="la-ly__sticky">
              <LayerStack3D
                layers={layers.map(({ id, number }) => ({ id, number }))}
                active={openId ?? hoverId}
                explodeTarget={headerRef}
                onSelect={(id) => toggle(id as LayerId)}
              />
              <p className="la-ly__cap">Sovereignty Radar</p>
            </div>
          </div>

          <div className="la-ly__rows">
            <div className="la-rows">
              {layers.map((layer) => (
                <LayerRow key={layer.id} layer={layer} isOpen={openId === layer.id} seq={seq} onToggle={toggle} onHover={hover} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SovereigntyLayers;
