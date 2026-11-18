import { useCallback, useEffect, useId, useRef, useState } from "react";
import { animate } from "framer-motion";
import { AmbientField } from "@/rx/AmbientField";
import { SplitHeading } from "@/rx/SplitHeading";
import { AnimatedValue, CountUp, EASE_OUT, Ping, ScrollWords, useReducedMotionSafe } from "@/components/fx";
import { cn } from "@/lib/utils";
import { useSeen } from "./landing-a/useSeen";
import "./landing-a/landing-a.css";

/**
 * Die Ausgangslage (#scenarios), tiefgruen.
 *
 * Eine gepinnte Buehne (ab 62rem): eine Zielscheibe aus 100 Strichen, deren Zeiger zwischen den
 * drei Kennzahlen laeuft (70, 15, 93), waehrend rechts die drei Szenarien als Belegzeilen
 * durchscrollen. Die Zeilen zeichnen eine Minzlinie, wenn sie ins Bild kommen; einzelne Zahlen
 * laufen hoch. Darunter faerbt sich der Leitsatz Wort fuer Wort. Unter 62rem fliesst alles
 * normal, jede Kennzahl steht dann gross im eigenen Szenario.
 * Ruhige Stufe: Zaehlen, Farbe, Linien und Deckkraft bleiben, nichts wird verschoben.
 */

interface Fig {
  /** Zahl, wie sie im Satz steht (zaehlt hoch, wenn zaehlbar) */
  n: string;
  /** Einheit oder Bezug, wortgleich aus dem Satz */
  unit?: string;
}

interface Threat {
  title: string;
  subtitle: string;
  stat: string;
  statLabel: string;
  points: string[];
  /** je Satz eine grosse Zahl daneben (wortgleich aus dem Satz) oder null */
  figs: (Fig | null)[];
  /** Sätze, die als Zitat gross stehen */
  quote?: number;
}

const threats: Threat[] = [
  {
    title: "Cloud-Infrastruktur",
    subtitle: "Abhängigkeit von Infrastruktur-Anbietern",
    stat: "70%",
    statLabel: "des EU-Cloud-Markts",
    points: [
      "Amazon, Microsoft und Google kontrollieren ~70% des europäischen Cloud-Markts",
      "Wechselkosten: bis zu 8,5 Mio. € pro Organisation",
      "Microsoft blockierte ICC-Mitarbeiter nach US-Sanktionen",
      "Ein AWS-Ausfall (Okt. 2025) legte 3.500 Unternehmen in 60+ Ländern lahm",
    ],
    figs: [null, { n: "8,5", unit: "Mio. €" }, null, { n: "3.500", unit: "Unternehmen" }],
  },
  {
    title: "KI-Modelle",
    subtitle: "Abhängigkeit von Modellen und Modellanbietern",
    stat: "15%",
    statLabel: "globale KI-Nutzung",
    points: [
      "DeepSeek R1: 0,10 $ / Mio. Token gegenüber OpenAI 4,40 $. Kostenvorteil 20–30×",
      "Alibaba Qwen unter Apache-2.0-Lizenz: kostenlose Nutzung und Anpassung",
      "Trainingsherkunft intransparent. Bias und Zensur sind schwer nachweisbar",
      "Open-Weight-Adoption stieg von 23% auf 67% (2025–2027)",
    ],
    figs: [{ n: "20–30×" }, null, null, null],
  },
  {
    title: "Regulatorisches Umfeld",
    subtitle: "Anforderungen an den Einsatz digitaler Technologien",
    stat: "93%",
    statLabel: "dt. Firmen digital abhängig",
    points: [
      "Data Act, AI Act, NIS2 und DORA definieren Anforderungen an den Technologieeinsatz",
      "GAIA-X: 600 Katalog-Services. Der CEO bestätigt Anbieterengpässe",
      "Hyperscaler-Investitionen 2025: 240 Mrd. $ (US) gegenüber ~15 Mrd. € (EU)",
      "»Wir haben kein Erkenntnisproblem, sondern ein Umsetzungsproblem.« (SAP)",
    ],
    figs: [null, { n: "600", unit: "Katalog-Services" }, { n: "240", unit: "Mrd. $" }, null],
    quote: 3,
  },
];

const STAT_VALUES = threats.map((t) => parseInt(t.stat, 10));

/* ---------- Zielscheibe ---------- */

const TICKS = 100;
const R_OUT = 238;

const TICK_D = (() => {
  let d = "";
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const len = i % 10 === 0 ? 32 : i % 5 === 0 ? 22 : 14;
    const r1 = R_OUT - len;
    d += `M${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}L${(Math.cos(a) * R_OUT).toFixed(2)} ${(Math.sin(a) * R_OUT).toFixed(2)}`;
  }
  return d;
})();

/** Kreissektor von 12 Uhr im Uhrzeigersinn bis v Prozent. */
function wedge(v: number, r: number): string {
  const p = Math.max(0, Math.min(100, v));
  if (p <= 0.05) return "M0 0";
  if (p >= 99.95) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
  const a = (p / 100) * Math.PI * 2;
  return `M0 0L0 ${-r}A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}Z`;
}

/**
 * Zielscheibe mit Zeiger. Der Wert laeuft per framer animate und wird direkt ins DOM geschrieben
 * (kein React-State pro Bild). Das Zaehlen ist einmalig, keine Schleife.
 */
function Dial({ index, play }: { index: number; play: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `la-dial-${uid}`;
  const reduced = useReducedMotionSafe();
  const clipRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(0);
  const indexRef = useRef(index);
  indexRef.current = index;

  const paint = useCallback((v: number) => {
    valueRef.current = v;
    clipRef.current?.setAttribute("d", wedge(v, 250));
    fillRef.current?.setAttribute("d", wedge(v, 200));
    needleRef.current?.setAttribute("transform", `rotate(${((v / 100) * 360).toFixed(2)})`);
    if (numRef.current) numRef.current.textContent = `${Math.round(v)}%`;
  }, []);

  useEffect(() => {
    if (!play) return;
    const target = STAT_VALUES[index];
    // Reduzierte Bewegung: der Zeiger dreht sich nicht, die Scheibe steht sofort im Endwert
    if (reduced) {
      paint(target);
      return;
    }
    const from = valueRef.current;
    const ctl = animate(from, target, {
      duration: from === 0 ? 1.7 : 1.25,
      ease: EASE_OUT,
      onUpdate: paint,
      onComplete: () => paint(target),
    });
    return () => ctl.stop();
  }, [index, play, paint, reduced]);

  // Druck: Endwert des gerade gezeigten Szenarios
  useEffect(() => {
    const onPrint = () => paint(STAT_VALUES[indexRef.current]);
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, [paint]);

  return (
    <div className="la-dial" aria-hidden="true">
      <svg viewBox="-260 -260 520 520" focusable="false">
        <defs>
          <clipPath id={clipId}>
            <path ref={clipRef} d={wedge(0, 250)} />
          </clipPath>
        </defs>
        <circle className="la-dial__ring" r="252" />
        <circle className="la-dial__ring" r="172" strokeDasharray="2 7" />
        <circle className="la-dial__ring" r="128" />
        <circle className="la-dial__ring" r="84" strokeOpacity="0.6" />
        <path className="la-dial__tick" d={TICK_D} stroke="rgba(233,243,237,0.2)" />
        <path className="la-dial__tick" d={TICK_D} stroke="#6fd69a" clipPath={`url(#${clipId})`} />
        <path ref={fillRef} d={wedge(0, 200)} fill="rgba(111,214,154,0.07)" />
        <g ref={needleRef} transform="rotate(0)">
          <line x1="0" y1="-84" x2="0" y2="-206" stroke="#6fd69a" strokeWidth="1.25" />
          <circle cx="0" cy="-206" r="3.5" fill="#6fd69a" />
        </g>
        <circle r="2.5" fill="#6fd69a" />
      </svg>
      <div className="la-dial__c">
        <span ref={numRef} className="la-dial__n">
          0%
        </span>
        <span className="la-dial__ls">
          {threats.map((t, i) => (
            <span key={t.title} className="la-dial__l" data-on={i === index}>
              {t.statLabel}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/* ---------- Belegzeile ---------- */

function Point({ text, fig, quote }: { text: string; fig: Fig | null; quote: boolean }) {
  const [ref, seen] = useSeen<HTMLLIElement>({ threshold: 0.7, rootMargin: "0px 0px -6% 0px" });
  return (
    <li ref={ref} className={cn("la-pt", seen && "is-in", quote && "la-pt--quote")}>
      {quote ? null : fig ? (
        <span className="la-pt__fig" aria-hidden="true">
          <AnimatedValue value={fig.n} play={seen} delay={0.1} />
          {fig.unit ? <small className="la-pt__u">{fig.unit}</small> : null}
        </span>
      ) : (
        <span className="la-pt__mark" aria-hidden="true" />
      )}
      <p className="la-pt__t">{text}</p>
    </li>
  );
}

/* ---------- Szenario ---------- */

function Scenario({
  threat,
  blockRef,
}: {
  threat: Threat;
  blockRef: (el: HTMLElement | null) => void;
}) {
  const [figRef, figSeen] = useSeen<HTMLDivElement>({ threshold: 0.6 });
  const ratio = Math.max(0, Math.min(1, parseInt(threat.stat, 10) / 100));
  return (
    <article ref={blockRef} className="la-sc">
      {/* Kennzahl: unter 62rem gross im Szenario, darueber nur fuer Vorleser (gross in der Buehne) */}
      <div ref={figRef} className="la-sc__fig">
        <span className="la-sc__big">
          <CountUp value={threat.stat} />
        </span>
        <span className="la-sc__lab">{threat.statLabel}</span>
        <div className="la-sc__bar" aria-hidden="true" data-in={figSeen} style={{ ["--r" as string]: ratio }}>
          <i />
        </div>
      </div>
      <SplitHeading as="h3" className="la-sc__h">
        {threat.title}
      </SplitHeading>
      <p className="la-sc__sub">{threat.subtitle}</p>
      <ul className="la-pts">
        {threat.points.map((p, j) => (
          <Point key={j} text={p} fig={threat.figs[j] ?? null} quote={threat.quote === j} />
        ))}
      </ul>
    </article>
  );
}

const ThreatContext = () => {
  const blockRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [stageRef, stageSeen] = useSeen<HTMLDivElement>({ threshold: 0.25, rootMargin: "0px" });

  // Welches Szenario gerade gelesen wird: das, das die Linie bei 58 % der Fensterhoehe kreuzt.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = blockRefs.current.filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        let best = -1;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = els.indexOf(e.target as HTMLElement);
          if (i > best) best = i;
        }
        if (best >= 0) setActive(best);
      },
      { rootMargin: "-58% 0px -41% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="scenarios" className="rx-deep la-th">
      {/* feine, ruhig treibende Linien (Pause-Knopf, offscreen und reduzierte Bewegung beachtet) */}
      <div className="la-amb" aria-hidden="true">
        <AmbientField className="rx-ambient" />
      </div>

      <div className="rx-wrap la-th__in">
        <div className="la-th__intro">
          <SplitHeading as="h2" em="Abhängigkeiten" className="rx-h2 la-th__h">
            Digitale Abhängigkeiten in Europa
          </SplitHeading>
          <p className="rx-sub la-th__lead">
            Europäische Organisationen sind bei Cloud-Infrastruktur, KI-Modellen und digitalen Technologien in hohem
            Mass von externen Anbietern abhängig. Gleichzeitig verändern regulatorische Anforderungen die Bedingungen,
            unter denen diese Technologien eingesetzt werden.
          </p>
        </div>

        <div className="la-th__band">
          <div className="la-th__legend">
            <span>Die Ausgangslage</span>
            <span className="la-th__count" aria-hidden="true">
              {`0${active + 1} / 0${threats.length}`}
            </span>
          </div>

          <div className="la-th__cols">
            <div className="la-th__col-stage">
              <div ref={stageRef} className="la-stage">
                <Dial index={active} play={stageSeen} />
                <ul className="la-ledger" aria-hidden="true">
                  {threats.map((t, i) => (
                    <li key={t.title} data-on={i === active} data-done={i < active}>
                      <span className="la-ledger__dot">
                        <Ping play={i === active ? active + 1 : false} color="#6fd69a" size={10} scale={2.6} />
                      </span>
                      <span>{t.title}</span>
                      <span className="la-ledger__v">{t.stat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="la-th__scs">
              {threats.map((t, i) => (
                <Scenario
                  key={t.title}
                  threat={t}
                  blockRef={(el) => {
                    blockRefs.current[i] = el;
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Leitsatz: die Woerter hellen sich beim Scrollen auf */}
        <div className="la-th__close">
          <ScrollWords
            as="p"
            text="Digitale Souveränität zeigt sich darin, welche Handlungsoptionen Organisationen im Umgang mit kritischen digitalen Abhängigkeiten tatsächlich besitzen."
            highlight={{ Handlungsoptionen: "#6fd69a" }}
            className="la-th__statement"
            scanLine={false}
          />
        </div>
      </div>
    </section>
  );
};

export default ThreatContext;
