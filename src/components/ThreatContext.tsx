import {
  Suspense,
  createRef,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import {
  CSS_EASE_OUT,
  DUR,
  LockOn,
  RevealGroup,
  RevealItem,
  ScanDivider,
  ScrollWords,
  SectionHeader,
  SpotlightCard,
  formatCountable,
  parseCountable,
  pingScales,
  safeAnimate,
  useCountUp,
  useFinePointer,
  useInViewOnce,
  useReducedMotionSafe,
} from "@/components/fx";

// Eigenes Chunk, wird erst nahe der Sektion geladen.
const DependencyNet = lazy(() => import("./DependencyNet"));

const threats = [
  {
    title: "Cloud-Infrastruktur",
    subtitle: "Abhängigkeit von Infrastruktur-Anbietern",
    stat: "70%",
    statLabel: "des EU-Cloud-Markts",
    color: "#4B6EFF",
    colorBg: "rgba(75,110,255,0.07)",
    colorBorder: "rgba(75,110,255,0.2)",
    points: [
      "Amazon, Microsoft und Google kontrollieren ~70% des europäischen Cloud-Markts",
      "Wechselkosten: bis zu 8,5 Mio. € pro Organisation",
      "Microsoft blockierte ICC-Mitarbeiter nach US-Sanktionen",
      "Ein AWS-Ausfall (Okt. 2025) legte 3.500 Unternehmen in 60+ Ländern lahm",
    ],
  },
  {
    title: "KI-Modelle",
    subtitle: "Abhängigkeit von Modellen und Modellanbietern",
    stat: "15%",
    statLabel: "globale KI-Nutzung",
    color: "#FF3D57",
    colorBg: "rgba(255,61,87,0.07)",
    colorBorder: "rgba(255,61,87,0.2)",
    points: [
      "DeepSeek R1: 0,10 $ / Mio. Token gegenüber OpenAI 4,40 $. Kostenvorteil 20–30×",
      "Alibaba Qwen unter Apache-2.0-Lizenz: kostenlose Nutzung und Anpassung",
      "Trainingsherkunft intransparent. Bias und Zensur sind schwer nachweisbar",
      "Open-Weight-Adoption stieg von 23% auf 67% (2025–2027)",
    ],
  },
  {
    title: "Regulatorisches Umfeld",
    subtitle: "Anforderungen an den Einsatz digitaler Technologien",
    stat: "93%",
    statLabel: "dt. Firmen digital abhängig",
    color: "#FF9F2E",
    colorBg: "rgba(255,159,46,0.07)",
    colorBorder: "rgba(255,159,46,0.2)",
    points: [
      "Data Act, AI Act, NIS2 und DORA definieren Anforderungen an den Technologieeinsatz",
      "GAIA-X: 600 Katalog-Services. Der CEO bestätigt Anbieterengpässe",
      "Hyperscaler-Investitionen 2025: 240 Mrd. $ (US) gegenüber ~15 Mrd. € (EU)",
      "»Wir haben kein Erkenntnisproblem, sondern ein Umsetzungsproblem.« (SAP)",
    ],
  },
];

type Threat = (typeof threats)[number];

// Zeitplan je Karte (Sekunden ab inView)
const COUNT_DELAY = 0.15;
const COUNT_DURATION = 1.1;
const BULLETS_AT = 0.5;
const BULLET_STAGGER = 0.045;
const BULLET_DURATION = 0.35;
const PING_STAGGER = 0.12;
const PING_DURATION = 0.6;

const isPrinting = () => typeof window !== "undefined" && !!window.matchMedia?.("print").matches;

/**
 * Zaehlende Kennzahl. Der einzige lesbare Textknoten traegt immer den
 * Endwert (innerText und Screenreader lesen nie '0%'). Waehrend des Zaehlens
 * ist er nur transparent, die Zaehlziffern zeichnet ein aria-hidden Overlay
 * per CSS-Generated-Content (attr(data-count)), das nicht in innerText landet.
 * Die Breite reserviert der lesbare Knoten selbst.
 */
function StatCount({ value, play }: { value: string; play: boolean }) {
  const reduced = useReducedMotionSafe();
  const realRef = useRef<HTMLSpanElement | null>(null);
  const overlayRef = useRef<HTMLSpanElement | null>(null);
  const countingRef = useRef(false);
  const startedRef = useRef(false);
  if (play) startedRef.current = true;

  // useCountUp schreibt textContent; hier landet es als data-count im Overlay.
  const sinkRef = useRef<HTMLElement | null>(null);
  if (sinkRef.current === null) {
    const sink = {
      set textContent(v: string) {
        if (countingRef.current) overlayRef.current?.setAttribute("data-count", v);
      },
    };
    sinkRef.current = sink as unknown as HTMLElement;
  }

  // Zaehlmodus beenden: Endwert sichtbar, Overlay leer.
  const settle = useCallback(() => {
    countingRef.current = false;
    overlayRef.current?.removeAttribute("data-count");
    if (realRef.current) realRef.current.style.color = "";
  }, []);

  // Vor dem Start den Startwert zeigen (kein Aufblitzen des Endwerts),
  // ohne den lesbaren Knoten anzufassen.
  useLayoutEffect(() => {
    const real = realRef.current;
    const overlay = overlayRef.current;
    if (!real || !overlay || startedRef.current) return;
    if (typeof IntersectionObserver === "undefined" || isPrinting()) return;
    const c = parseCountable(value);
    if (!c) return;
    countingRef.current = true;
    overlay.setAttribute("data-count", formatCountable(c, 0));
    real.style.color = "transparent";
    window.addEventListener("beforeprint", settle);
    return () => window.removeEventListener("beforeprint", settle);
    // nur beim ersten Rendern bzw. bei neuem Wert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useCountUp(sinkRef, value, {
    play,
    delay: COUNT_DELAY,
    duration: COUNT_DURATION,
    onDone: () => {
      settle();
      // Settle-Puls ist eine Skalierung: bei reduzierter Bewegung (sanfte Stufe) aus
      if (reduced) return;
      safeAnimate(realRef.current, [{ transform: "scale(1.04)" }, { transform: "scale(1)" }], {
        duration: 200,
        easing: CSS_EASE_OUT,
      });
    },
  });

  return (
    <span className="relative inline-grid">
      <span ref={realRef} className="tabular-nums print:!text-inherit" style={{ gridArea: "1 / 1" }}>
        {value}
      </span>
      <span
        ref={overlayRef}
        aria-hidden="true"
        className="fx-deco pointer-events-none tabular-nums before:content-[attr(data-count)]"
        style={{ gridArea: "1 / 1" }}
      />
    </span>
  );
}

function ThreatCard({
  threat,
  hubRef,
  tiltOn,
}: {
  threat: Threat;
  hubRef: RefObject<HTMLElement>;
  tiltOn: boolean;
}) {
  const reduced = useReducedMotionSafe();
  const inView = useInViewOnce(hubRef, { amount: 0.5 });
  const barRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const preparedRef = useRef<Animation[]>([]);
  const ratio = Math.max(0, Math.min(1, parseInt(threat.stat, 10) / 100));

  // Balken und Stichpunkte: WAAPI-Animationen vorbereiten und pausieren.
  // Der Endzustand steht im DOM, fill 'backwards' haelt nur den Startwert.
  // Sanfte Stufe (reduce): Balken per clip-path-Wipe statt scaleX-Wachstum,
  // Stichpunkte nur per opacity ohne y-Versatz.
  useLayoutEffect(() => {
    if (typeof IntersectionObserver === "undefined" || isPrinting()) return;
    const anims: Animation[] = [];
    const prep = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const a = safeAnimate(el, keyframes, { ...options, fill: "backwards" });
      if (!a) return;
      try {
        a.pause();
        anims.push(a);
      } catch {
        a.cancel();
      }
    };
    const barFrames: Keyframe[] = reduced
      ? [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }]
      : [{ transform: "scaleX(0)" }, { transform: `scaleX(${ratio})` }];
    prep(barRef.current, barFrames, {
      duration: COUNT_DURATION * 1000,
      delay: COUNT_DELAY * 1000,
      easing: CSS_EASE_OUT,
    });
    const items = listRef.current ? Array.from(listRef.current.children) : [];
    items.forEach((li, j) =>
      prep(
        li,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "translateY(0px)" },
            ],
        {
          duration: BULLET_DURATION * 1000,
          delay: (BULLETS_AT + j * BULLET_STAGGER) * 1000,
          easing: CSS_EASE_OUT,
        },
      ),
    );
    preparedRef.current = anims;
    const onPrint = () =>
      anims.forEach((a) => {
        try {
          a.finish();
        } catch {
          a.cancel();
        }
      });
    window.addEventListener("beforeprint", onPrint);
    return () => {
      window.removeEventListener("beforeprint", onPrint);
      anims.forEach((a) => a.cancel());
      preparedRef.current = [];
    };
  }, [reduced, ratio]);

  // Start beim Sichtkontakt: Balken, Stichpunkte und je Bullet ein Ping
  // (sanfte Stufe: Ring waechst hoechstens auf scale 1.15, blendet per opacity aus)
  useEffect(() => {
    if (!inView) return;
    preparedRef.current.forEach((a) => {
      try {
        a.play();
      } catch {
        a.cancel();
      }
    });
    const rings = listRef.current ? Array.from(listRef.current.querySelectorAll("[data-bullet-ping]")) : [];
    const [fromScale, toScale] = pingScales(1, 3, reduced);
    const pings = rings.map((ring, j) =>
      safeAnimate(
        ring,
        [
          { transform: `scale(${fromScale})`, opacity: 0.7 },
          { transform: `scale(${toScale})`, opacity: 0 },
        ],
        {
          duration: PING_DURATION * 1000,
          delay: (BULLETS_AT + j * PING_STAGGER) * 1000,
          easing: CSS_EASE_OUT,
          fill: "none",
        },
      ),
    );
    return () => pings.forEach((p) => p?.cancel());
  }, [inView, reduced]);

  return (
    <RevealItem ref={hubRef} y={24} duration={DUR.reveal} className="h-full">
      <SpotlightCard
        color={threat.color}
        tilt={5}
        lift={4}
        intensity={0.14}
        className={cn("rounded-2xl p-6 lg:p-8 flex flex-col h-full", tiltOn && "group/card isolation-auto")}
        style={{
          background: `linear-gradient(${threat.colorBg}, ${threat.colorBg}), rgba(5,7,15,0.55)`,
          border: `1px solid ${threat.colorBorder}`,
          ...(tiltOn ? { transformStyle: "preserve-3d" as const } : {}),
        }}
      >
        {/* Big stat */}
        <div className="mb-5" style={tiltOn ? { transformStyle: "preserve-3d" } : undefined}>
          <div
            className={cn(
              "text-5xl font-bold text-white mb-1",
              tiltOn && "transition-transform duration-300 ease-fx-out group-hover/card:[transform:translateZ(24px)]",
            )}
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
          >
            <LockOn color={threat.color} play={inView}>
              <StatCount value={threat.stat} play={inView} />
            </LockOn>
          </div>
          <div
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            {threat.statLabel}
          </div>
          {/* Fuellbalken (Endzustand im DOM) */}
          <div
            aria-hidden="true"
            className="mt-3 h-[2px] w-full overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              ref={barRef}
              className="h-full w-full rounded-full"
              style={{ background: threat.color, transform: `scaleX(${ratio})`, transformOrigin: "left center" }}
            />
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-xl font-semibold text-white mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {threat.title}
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: threat.color, fontFamily: "'Space Grotesk', sans-serif", opacity: 0.8 }}
        >
          {threat.subtitle}
        </p>

        {/* Point list */}
        <ul ref={listRef} className="space-y-3 flex-1">
          {threat.points.map((point, j) => (
            <li
              key={j}
              data-fx-reveal=""
              className="flex gap-3 items-start text-xs leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
            >
              <span
                className="relative mt-1.5 shrink-0 w-1 h-1 rounded-full"
                style={{ background: threat.color }}
              >
                <span
                  data-bullet-ping=""
                  aria-hidden="true"
                  className="fx-deco pointer-events-none absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${threat.color}`, opacity: 0 }}
                />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </SpotlightCard>
    </RevealItem>
  );
}

const ThreatContext = () => {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const tiltOn = fine && !reduced;
  const sectionRef = useRef<HTMLElement | null>(null);
  const hubRefs = useMemo(() => threats.map(() => createRef<HTMLElement>()), []);
  const netReady = useInViewOnce(sectionRef, { amount: 0, margin: "600px" });

  return (
    <section
      ref={sectionRef}
      id="scenarios"
      className="relative py-24 lg:py-32 overflow-hidden supports-[overflow:clip]:overflow-clip"
      style={{
        background: "transparent",
      }}
    >
      {/* Abhaengigkeitsnetz (dekorativ, eigener Chunk) */}
      <div aria-hidden="true" className="fx-deco pointer-events-none absolute inset-0 z-0">
        {netReady ? (
          <Suspense fallback={null}>
            <DependencyNet sectionRef={sectionRef} hubRefs={hubRefs} />
          </Suspense>
        ) : null}
      </div>

      {/* Divider line top */}
      <ScanDivider position="top" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <SectionHeader
          eyebrow="Die Ausgangslage"
          lines={["Digitale Abhängigkeiten in Europa"]}
          className="max-w-2xl mb-16 lg:mb-20"
          leadClassName="text-base leading-relaxed"
          lead={
            <>
              Europäische Organisationen sind bei Cloud-Infrastruktur, KI-Modellen und digitalen
              Technologien in hohem Mass von externen Anbietern abhängig. Gleichzeitig verändern
              regulatorische Anforderungen die Bedingungen, unter denen diese Technologien
              eingesetzt werden.
            </>
          }
        />

        {/* Threat cards */}
        <RevealGroup stagger={0.09} margin="0px 0px -12% 0px" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {threats.map((threat, i) => (
            <ThreatCard key={threat.title} threat={threat} hubRef={hubRefs[i]} tiltOn={tiltOn} />
          ))}
        </RevealGroup>

        {/* Closing statement */}
        <div className="mt-16 text-center">
          <ScrollWords
            as="p"
            text="Digitale Souveränität zeigt sich darin, welche Handlungsoptionen Organisationen im Umgang mit kritischen digitalen Abhängigkeiten tatsächlich besitzen."
            highlight={{ Handlungsoptionen: "#8BA4FF" }}
            className="text-xl lg:text-2xl font-medium text-white/60 max-w-3xl mx-auto leading-relaxed"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            scanLine
          />
        </div>
      </div>

      {/* Divider line bottom */}
      <ScanDivider position="bottom" />
    </section>
  );
};

export default ThreatContext;
