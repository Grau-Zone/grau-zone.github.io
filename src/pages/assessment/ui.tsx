// Gemeinsame Darstellungsbausteine des Self-Assessments: Wort-fuer-Wort-Ueberschrift,
// Schrittrahmen mit Fokus und Scrollen, Fortschrittslinie, Aktionsleiste, Radar-Zeichnung.
// Keine Fachlogik, nur Darstellung.
import { useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Magnetic, RadarSweep, usePauseOffscreen, useReducedMotionSafe } from "@/components/fx";
import { useSeen } from "./hooks";
import "./assessment.css";

// ─── Woerter steigen aus einer Maske ─────────────────────────────────────────
// Wie rx/SplitHeading, aber ohne aria-label am Container: der Text bleibt echter Text
// (mehrsprachige Ueberschriften brauchen lang je Teil). em = Woerter in Gruen.
// Bei reduzierter Bewegung steht der Text sofort da.
export function RiseWords({ text, em, delay = 0, lang, view = false }: {
  text: string; em?: string[]; delay?: number; lang?: string; view?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotionSafe();
  const seen = useSeen(ref, view);
  const hot = new Set(em ?? []);
  const words = text.split(/\s+/).filter(Boolean);
  const nodes: ReactNode[] = [];
  words.forEach((w, i) => {
    const isHot = hot.has(w.replace(/[.,;:!?„“”"'«»()]+$/g, ""));
    nodes.push(
      <span key={i} className="rx-w">
        <span
          className={isHot ? "as-hot" : undefined}
          style={reduced ? undefined : {
            transform: seen ? "none" : "translateY(105%)",
            transition: seen ? `transform 1s var(--rx-ease) ${delay + (i % 14) * 38}ms` : "none",
          }}
        >{w}</span>
      </span>,
    );
    if (i < words.length - 1) nodes.push(" ");
  });
  return <span ref={ref} lang={lang}>{nodes}</span>;
}

// ─── Fortschrittslinie der Bloecke ───────────────────────────────────────────
export function Segments({ count, index, fraction, labelledBy, valueText }: {
  count: number; index: number; fraction: number; labelledBy: string; valueText: string;
}) {
  return (
    <div
      className="as-seg" role="progressbar" aria-labelledby={labelledBy}
      aria-valuemin={1} aria-valuemax={count} aria-valuenow={index + 1} aria-valuetext={valueText}
    >
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ "--f": i < index ? 1 : i === index ? fraction : 0 } as CSSProperties} />
      ))}
    </div>
  );
}

// ─── Haftende Aktionsleiste ──────────────────────────────────────────────────
// Oberkante = Fortschrittslinie ueber den ganzen Fragebogen (progress 0 bis 1).
export function ActionBar({ onBack, onNext, backLabel, nextLabel, progress, count, note }: {
  onBack: () => void; onNext: () => void; backLabel: string; nextLabel: string;
  progress: number; count?: string; note?: ReactNode;
}) {
  return (
    <div className="as-bar">
      <div className="as-bar__line" aria-hidden="true">
        <i style={{ "--p": Math.max(0, Math.min(1, progress)) } as CSSProperties} />
      </div>
      <div className="rx-wrap">
        {note && <div className="as-bar__note">{note}</div>}
        <div className="as-bar__in">
          <button type="button" className="rx-pill rx-pill--ghost" onClick={onBack}>
            <span className="as-nudge as-nudge--l" aria-hidden="true"><ArrowLeft size={18} /></span>
            {backLabel}
          </button>
          {count !== undefined && <p className="as-bar__count" role="status" aria-atomic="true">{count}</p>}
          <span className="as-bar__next">
            <Magnetic>
              <button type="button" className="rx-pill" onClick={onNext}>
                {nextLabel}
                <span className="as-nudge as-nudge--r" aria-hidden="true"><ArrowRight size={18} /></span>
              </button>
            </Magnetic>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Haken zum Zeichnen (Einwilligung) ───────────────────────────────────────
export function TickSvg() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.5 12.8l5 5L19.5 7" pathLength={1} />
    </svg>
  );
}

// ─── Radar als feine Linienzeichnung ─────────────────────────────────────────
// Ringe und Achsen zeichnen sich beim Laden, der Strahl dreht ruhig weiter und die
// Signalpunkte atmen. Alle Schleifen tragen fx-loop, stehen ausserhalb des Bildschirms,
// im Hintergrundtab und mit dem Pause-Knopf still (usePauseOffscreen).
const RINGS = [190, 142, 95, 48];
const BLIPS = [
  { x: 71, y: 28, d: 0.4 }, { x: 33, y: 63, d: 2.1 }, { x: 58, y: 76, d: 3.6 }, { x: 25, y: 35, d: 5.0 },
];
export function RadarArt({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  usePauseOffscreen(hostRef);
  return (
    <div ref={hostRef} className={"as-radar" + (className ? " " + className : "")} aria-hidden="true">
      <svg className="as-radar__svg" viewBox="0 0 400 400">
        {RINGS.map((r, i) => (
          <circle
            key={r} className="as-draw" cx={200} cy={200} r={r} pathLength={1}
            style={{ animationDelay: `${0.25 + i * 0.2}s`, strokeOpacity: i === 0 ? 0.7 : 0.4 }}
          />
        ))}
        {[[200, 10, 200, 390], [10, 200, 390, 200], [66, 66, 334, 334], [334, 66, 66, 334]].map(([x1, y1, x2, y2], i) => (
          <line
            key={i} className="as-draw" x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1}
            style={{ animationDelay: `${0.9 + i * 0.12}s`, strokeOpacity: 0.22 }}
          />
        ))}
        <circle className="as-draw" cx={200} cy={200} r={3} pathLength={1} style={{ animationDelay: "1.6s" }} />
      </svg>
      <div className="as-radar__sweep">
        <RadarSweep color="#00802f" period={9} trail={80} intensity={0.16} />
      </div>
      {BLIPS.map((b, i) => (
        <span key={i} className="as-blip fx-loop fx-soft" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s` }} />
      ))}
    </div>
  );
}
