// Die Fusszeile aller Seiten.
//
// Herausgeber ist das Institut fuer Wirtschaftsinformatik der Universitaet
// St.Gallen. Die Dieter Schwarz Stiftung foerdert das Institut, sie ist nicht
// Urheberin; STACKIT ist weder Traeger noch Herausgeber. Deshalb steht hier
// ausschliesslich das IWI, und deshalb erscheint diese Zeile auf jeder Seite
// und nicht nur auf der Startseite.
//
// Vorher lag das Copyright an genau einer Stelle im Projekt, in der unteren
// Leiste von Footer.tsx, und damit nur auf "/". Vier von fuenf Seiten trugen
// weder Logo noch Copyright noch einen Link auf das Institut.
//
// Gestaltung: Tinte als Grund, die Links als grosse Zeilen mit Haarlinien, darunter
// der Name des Projekts gross und leise in Mint. Ein halber Radar zeichnet sich
// beim Hineinscrollen dahinter. Alles hier laeuft einmalig oder am Scroll; es gibt
// keine Endlosschleife, deshalb braucht die Fusszeile keinen eigenen Pause-Knopf.
import { useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DUR, EASE_IN_OUT, useInViewOnce, useIsMobile, useReducedMotionSafe } from "@/components/fx";
import IwiLogo, { IWI_URL } from "./IwiLogo";
import "./frame/frame.css";

const CDET_URL = IWI_URL + "/cdet";
const KONTAKT = "mailto:adrian.bohrer@unisg.ch,andreas.hein@unisg.ch";

const extern = [
  { label: "IWI-HSG", href: IWI_URL },
  { label: "CDET", href: CDET_URL },
  { label: "Kontakt", href: KONTAKT },
];

interface SiteFooterProps {
  /** Startseite: mehr Luft ueber dem Inhalt. Sonst kompakter. Der Inhalt ist gleich. */
  breit?: boolean;
}

/* ---------- Halber Radar hinter dem Namen ---------- */

// viewBox 2200 x 1100, Mittelpunkt knapp ueber der Unterkante
const VB_W = 2200;
const VB_H = 1100;
const CX = VB_W / 2;
const CY = VB_H - 2;
const R_MAX = 1080;
const ARCS = [1, 2, 3, 4, 5].map((k) => {
  const r = (R_MAX / 5) * k;
  return `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;
});
const AXES = [0, 30, 60, 90, 120, 150, 180].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return `M ${CX} ${CY} L ${(CX + Math.cos(a) * R_MAX).toFixed(1)} ${(CY - Math.sin(a) * R_MAX).toFixed(1)}`;
});
const STROKE = "rgba(111,214,154,0.5)";

function DrawPath({ d, progress, range, width }: { d: string; progress: MotionValue<number>; range: [number, number]; width: number }) {
  const pathLength = useTransform(progress, range, [0, 1], { clamp: true });
  return <motion.path d={d} fill="none" stroke={STROKE} strokeWidth={width} style={{ pathLength }} />;
}

/** Sanfte Stufe: einmaliges, zeitgesteuertes Zeichnen statt Scroll-Kopplung. */
function DrawOnce({ d, play, delay, width }: { d: string; play: boolean; delay: number; width: number }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={STROKE}
      strokeWidth={width}
      initial={{ pathLength: 0 }}
      animate={play ? { pathLength: 1 } : undefined}
      transition={{ duration: DUR.draw * 1.4, delay, ease: EASE_IN_OUT }}
    />
  );
}

function Horizon({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const reduced = useReducedMotionSafe();
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(rootRef, { amount: 0.05, margin: "0px" });
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start end", "end end"] });
  const width = mobile ? 3 : 1.2;
  return (
    <div ref={rootRef} aria-hidden="true" className="fr-horizon fx-deco">
      <div>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax meet" fill="none">
          {reduced
            ? [...ARCS.map((d, i) => [d, 0.12 * i] as const), ...AXES.map((d, i) => [d, 0.7 + 0.06 * i] as const)].map(([d, delay]) => (
                <DrawOnce key={d} d={d} play={inView} delay={delay} width={width} />
              ))
            : [
                ...ARCS.map((d, i) => <DrawPath key={d} d={d} progress={scrollYProgress} range={[0.1 * i, 0.5 + 0.1 * i]} width={width} />),
                ...AXES.map((d, i) => <DrawPath key={d} d={d} progress={scrollYProgress} range={[0.55 + 0.03 * i, 0.8 + 0.03 * i]} width={width} />),
              ]}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Der Name, Buchstabe fuer Buchstabe aus einer Maske ---------- */

const NAME = "Sovereignty Radar";

function Wordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(ref, { amount: 0.4, margin: "0px" });
  return (
    <div ref={ref} aria-hidden="true" data-in={seen ? "true" : "false"} className="fr-big fx-deco">
      {Array.from(NAME).map((ch, i) =>
        ch === " " ? (
          <span key={i} className="fr-big__sp" />
        ) : (
          <span key={i} className="fr-big__c">
            <span style={{ transitionDelay: `${i * 45}ms` }}>{ch}</span>
          </span>
        ),
      )}
    </div>
  );
}

/* ---------- Fusszeile ---------- */

const SiteFooter = ({ breit = false }: SiteFooterProps) => {
  const footRef = useRef<HTMLElement>(null);
  return (
    // role: Auf der Startseite steht die Fusszeile in einem section-Element (#about); dort wuerde
    // <footer> sonst nicht als contentinfo gelten.
    <footer ref={footRef} role="contentinfo" className={"fr-foot fr-ink fr-scope" + (breit ? " fr-foot--wide" : "")}>
      <Horizon targetRef={footRef} />

      <div className="rx-wrap">
        <div className="fr-foot__top">
          <div className="fr-foot__brand">
            <IwiLogo height={52} />
            <div className="fr-foot__copy">© {new Date().getFullYear()} IWI-HSG, Universität St.Gallen</div>
          </div>

          <nav aria-label="Fusszeile">
            <ul className="fr-rows">
              {extern.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="fr-row">
                    <span className="fr-row__t">{label}</span>
                    <span className="fr-row__go" aria-hidden="true">
                      <ArrowRight size={18} />
                    </span>
                  </a>
                </li>
              ))}
              {/* Als Link, nicht als <a>: der Router laeuft mit basename, ein rohes
                  href wuerde ihn umgehen und die Seite komplett neu laden. */}
              <li>
                <Link to="/assessment" className="fr-row">
                  <span className="fr-row__t">Self-Assessment</span>
                  <span className="fr-row__go" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/impressum" className="fr-row">
                  <span className="fr-row__t">Impressum</span>
                  <span className="fr-row__go" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="rx-wrap">
        <Wordmark />
      </div>
    </footer>
  );
};

export default SiteFooter;
