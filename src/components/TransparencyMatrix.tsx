// Transparenz-Matrix: Transparenz (x, Anteil ohne "Weiss ich nicht") gegen den
// Durchschnitt der vier Faehigkeiten (y, 1..7). Gleicher Aufbau wie die
// Souveraenitaets-Matrix (ResultVisuals.tsx): Raute = Median der Gruppe, Rahmen =
// ihre mittlere Haelfte, Punkt = eigener Wert. Entree ueber useMatrixReveal
// (ResultVisuals.tsx); der Punkt selbst bleibt statisch.
//
// Instrumenten-Look (resultfx): Grundplatte, feines Raster, Lineale ohne Zahlen
// (x in 5-%-Schritten, y in ganzen und halben Stufen 1..7), Luenetten-Ecken,
// sich zeichnende Achsen, Fadenkreuz am eigenen Punkt und - bei alten Codes
// ohne Transparenz - eine helle Spur ueber der gestrichelten Linie. Die
// Entree-Schritte dafuer liefert instrumentSteps ueber useMatrixReveal; hier
// werden nur die Elemente mit den passenden data-mx-Namen gerendert. Alles
// Neue ist aria-hidden-Deko (fx-deco) ohne Text oder Zahl, Fadenkreuz und
// Spur enden unsichtbar. Bewusst OHNE Radar-Schleife: diese Grafik hat keine
// Dauerbewegung. Die Zahlen am Punkt zaehlen einmal ab dem Achsenursprung
// (0 % bzw. 1) und enden zeichengleich auf dem Endtext, der ohne Animation,
// im Druck und bei verstecktem Tab sofort im DOM steht. Positionen, Skalen,
// Quadrantengrenzen (0.5 bzw. 4) und Rundungen sind unveraendert.
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Lang } from "../data/instrument";
import type { Quant } from "../data/benchmarkCore";
import { TRA_QUAD, AXIS_TRA, AXIS_AVG, fmtAvg } from "../data/transparencyView";
import { transparencyQuadrant, type TraQuadKey } from "../data/scoring";
import { GROUP_FADE, GuideDraw, MatrixCross, quantKey, useMatrixReveal } from "./ResultVisuals";
import { EASE_IN_OUT, SvgPing } from "./fx";
import {
  MATRIX_T,
  MatrixAxesDraw,
  MatrixInstrument,
  MatrixPlate,
  MatrixReticle,
  TraceDraw,
  matrixRegrowSteps,
  useGroupRegrow,
  useSvgUid,
  useValueCount,
} from "./resultfx";

type T = { en: string; de: string };

const AXIS = "rgba(190,210,230,0.30)";
const LABEL = "rgba(214,230,245,0.55)";
const OWN = "#9b8cf0";
const AVG_ONLY: T = { en: "Your average", de: "Ihr Durchschnitt" };

// Lineal- und Rasterteilungen (normiert 0..1). x: Major alle 25 %, Minor alle 5 %.
// y: Major = ganze Stufen 1..7, Minor = Halbschritte. Die Quadrantengrenze bei
// 0.5 bleibt allein die eigene gestrichelte Linie (Raster laesst 0.5 aus).
const X_GRID = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];
const Y_GRID = [1 / 6, 2 / 6, 4 / 6, 5 / 6];
const X_MAJOR = [0, 0.25, 0.5, 0.75, 1];
const X_MINOR = Array.from({ length: 21 }, (_, i) => i * 5)
  .filter((n) => n % 25 !== 0)
  .map((n) => n / 100);
const Y_MAJOR = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
const Y_MINOR = [1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12, 11 / 12];

export type TraCompare = { tra: Quant; avg: Quant; tag?: string };

export default function TransparencyMatrix({
  tra, avg, lang, compare = [], ariaLabel,
}: {
  tra: number | null; avg: number | null; lang: Lang;
  compare?: TraCompare[];
  ariaLabel?: string;
}) {
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const W = 420, H = 420, P = 46;
  const x = (v: number) => P + v * (W - 2 * P);
  const yN = (v: number) => H - P - v * (H - 2 * P);   // 0..1
  const y = (v: number) => yN((v - 1) / 6);             // 1..7
  const has = tra !== null && avg !== null;
  const avgOnly = tra === null && avg !== null;

  const quads: { key: TraQuadKey; qx: number; qy: number }[] = [
    { key: "control", qx: 0.75, qy: 0.75 },
    { key: "optimistic", qx: 0.25, qy: 0.75 },
    { key: "bound", qx: 0.75, qy: 0.25 },
    { key: "blind", qx: 0.25, qy: 0.25 },
  ];

  const groupKey = (c: TraCompare) => `${c.tag ?? ""}|${quantKey(c.tra)}|${quantKey(c.avg)}`;
  const compareKey = compare.map(groupKey).join("/");
  const svgRef = useRef<SVGSVGElement>(null);
  const ping = useMatrixReveal(svgRef, { compareKey, hasPoint: has });
  useGroupRegrow(svgRef, compareKey, matrixRegrowSteps);
  const ownQuadKey = transparencyQuadrant(tra, avg);
  const ownQuad = has && ownQuadKey ? quads.find((q) => q.key === ownQuadKey) : undefined;
  const uid = useSvgUid();

  // Beschriftungen (Endtexte, zeichengleich mit vorher)
  const ts = tra !== null ? `${Math.round(tra * 100)}%` : "";
  const as = avg !== null ? fmtAvg(avg, lang) : "";

  // Zaehler: Hooks immer aufrufen, enabled steuert. Start ab Achsenursprung.
  const tRef = useRef<SVGTSpanElement>(null);
  const aRef = useRef<SVGTSpanElement>(null);
  const oldRef = useRef<SVGTSpanElement>(null);
  useValueCount(tRef, {
    hostRef: svgRef, enabled: has, from: 0, to: tra ?? 0,
    format: (v) => `${Math.round(v * 100)}%`, final: ts,
    delayMs: MATRIX_T.count, durMs: MATRIX_T.countDur, ease: EASE_IN_OUT,
  });
  useValueCount(aRef, {
    hostRef: svgRef, enabled: has, from: 1, to: avg ?? 1,
    format: (v) => fmtAvg(v, lang), final: as,
    delayMs: MATRIX_T.count, durMs: MATRIX_T.countDur, ease: EASE_IN_OUT,
  });
  useValueCount(oldRef, {
    hostRef: svgRef, enabled: avgOnly, from: 1, to: avg ?? 1,
    format: (v) => fmtAvg(v, lang), final: as,
    delayMs: MATRIX_T.trace, durMs: Math.round(MATRIX_T.traceDur * 0.625), ease: EASE_IN_OUT,
  });

  const qw = (W - 2 * P) / 2, qh = (H - 2 * P) / 2;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ maxWidth: 460 }}
      role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <MatrixPlate W={W} H={H} P={P} />
      <defs>
        {/* Blindflug: Licht aus der Ecke unten links (Ursprung) */}
        <radialGradient id={`${uid}bf`} gradientUnits="userSpaceOnUse" cx={P} cy={H - P} r={(W - 2 * P) * 0.6}>
          <stop offset="0" stopColor="rgba(207,135,165,0.13)" />
          <stop offset="1" stopColor="rgba(207,135,165,0.03)" />
        </radialGradient>
        {/* feine Warnschraffur im Blindflug */}
        <pattern id={`${uid}ht`} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(207,135,165,0.09)" strokeWidth="1.2" />
        </pattern>
        {/* Rahmen der Vergleichsgruppen: Glas, oben heller */}
        <linearGradient id={`${uid}fr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.075)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
        {/* Lichthof unter dem eigenen Punkt (gleiche Farbe, gleiche Mitte) */}
        {has && (
          <radialGradient id={`${uid}pg`}>
            <stop offset="0" stopColor={OWN} stopOpacity={0.42} />
            <stop offset="1" stopColor={OWN} stopOpacity={0} />
          </radialGradient>
        )}
        {/* eigenes Feld: Licht um den eigenen Punkt (Spitze kommt aus dem Entree) */}
        {ownQuad && (
          <radialGradient id={`${uid}og`} gradientUnits="userSpaceOnUse" cx={x(tra!)} cy={y(avg!)} r={170}>
            <stop offset="0" stopColor={TRA_QUAD[ownQuad.key].color} stopOpacity={1} />
            <stop offset="1" stopColor={TRA_QUAD[ownQuad.key].color} stopOpacity={0} />
          </radialGradient>
        )}
      </defs>

      {/* "Blindflug" leicht betont, das ist die Warnung dieses Bilds */}
      <rect data-mx="quad-fill" x={P} y={yN(0.5)} width={qw} height={qh} fill={`url(#${uid}bf)`} />
      <rect data-mx="quad-fill" aria-hidden="true" className="fx-deco" pointerEvents="none"
        x={P} y={yN(0.5)} width={qw} height={qh} fill={`url(#${uid}ht)`} />
      {/* Deko: eigenes Feld leuchtet beim Entree einmal auf (sonst unsichtbar) */}
      {ownQuad && (
        <rect data-mx="glow" aria-hidden="true" className="fx-deco" pointerEvents="none"
          x={x(ownQuad.qx - 0.25)} y={yN(ownQuad.qy + 0.25)} width={qw} height={qh}
          fill={`url(#${uid}og)`} style={{ opacity: 0 }} />
      )}
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke={AXIS} strokeWidth="1" />
      <MatrixAxesDraw W={W} H={H} P={P} />
      <MatrixInstrument W={W} H={H} P={P}
        xGrid={X_GRID} yGrid={Y_GRID}
        xMajor={X_MAJOR} xMinor={X_MINOR}
        yMajor={Y_MAJOR} yMinor={Y_MINOR} />
      <line x1={x(0.5)} y1={P} x2={x(0.5)} y2={H - P} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
      <line x1={P} y1={yN(0.5)} x2={W - P} y2={yN(0.5)} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
      <MatrixCross x={x(0.5)} y={yN(0.5)} top={P} bottom={H - P} left={P} right={W - P} />

      {quads.map((q) => (
        <text key={q.key} data-mx="quad-label" x={x(q.qx)} y={yN(q.qy)} textAnchor="middle"
          fontFamily="'Share Tech Mono', monospace" fontSize="12.5" letterSpacing="1"
          fill={q.key === "blind" ? "rgba(207,135,165,0.8)" : "rgba(214,230,245,0.32)"}
          style={{ textTransform: "uppercase" }}>
          {p(TRA_QUAD[q.key].name)}
        </text>
      ))}

      {/* Vergleichsgruppen; bei einem Filterwechsel Crossfade (key je Gruppe),
          neue Gruppen wachsen aus dem Median (useGroupRegrow) */}
      <AnimatePresence initial={false}>
        {compare.map((c, i) => {
          const cx = x(c.tra.p50), cy = y(c.avg.p50), s = 7;
          return (
            <motion.g key={groupKey(c)} data-rfx-group={groupKey(c)} {...GROUP_FADE}>
              <rect
                data-mx="frame"
                x={x(c.tra.p25)} y={y(c.avg.p75)}
                width={Math.max(2, x(c.tra.p75) - x(c.tra.p25))} height={Math.max(2, y(c.avg.p25) - y(c.avg.p75))}
                rx={3} fill={`url(#${uid}fr)`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"
                strokeDasharray={i === 1 ? "5 4" : undefined}
                style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px` }}
              />
              <polygon data-mx="diamond" points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                fill="#0a0d1a" stroke="#fff" strokeWidth="1.6"
                style={{ transformBox: "fill-box", transformOrigin: "center" }} />
              {c.tag && (
                <text data-mx="tag" x={i === 0 ? cx - s - 5 : cx + s + 5} y={cy + 4} textAnchor={i === 0 ? "end" : "start"}
                  fontFamily="'Space Grotesk', sans-serif" fontSize="12" fontWeight="600" fill="#fff"
                  stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
                  {c.tag}
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Achsen: unten 0 und 100 %, links 1 und 7 */}
      <text data-mx="axis-label" x={W / 2} y={H - 12} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="13" fill={LABEL}>
        {p(AXIS_TRA)} →
      </text>
      <text data-mx="axis-label" x={P} y={H - P + 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>0 %</text>
      <text data-mx="axis-label" x={W - P} y={H - P + 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>100 %</text>
      <text data-mx="axis-label" x={14} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="13" fill={LABEL}
        transform={`rotate(-90 14 ${H / 2})`}>
        {p(AXIS_AVG)} →
      </text>
      <text data-mx="axis-label" x={P - 8} y={H - P + 4} textAnchor="end" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>1</text>
      <text data-mx="axis-label" x={P - 8} y={P + 4} textAnchor="end" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>7</text>

      {/* Aeltere Ergebnis-Codes ohne Transparenz: eigener Durchschnitt als Linie */}
      {avgOnly && (
        <>
          <line x1={P} y1={y(avg!)} x2={W - P} y2={y(avg!)} stroke={OWN} strokeWidth="2" strokeDasharray="6 4" />
          {/* Deko: helle Spur zeichnet sich von der y-Achse ueber die Flaeche und verlischt */}
          <TraceDraw d={`M ${P} ${y(avg!)} L ${W - P} ${y(avg!)}`} color={OWN} width={2.4} />
          <text x={P + 8} y={y(avg!) - 8} textAnchor="start"
            fontFamily="'Space Grotesk', sans-serif" fontSize="12.5" fontWeight="600" fill="#fff"
            stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
            {p(AVG_ONLY)} <tspan ref={oldRef} key={as}>{as}</tspan>
          </text>
        </>
      )}

      {has && (
        <>
          <line x1={x(tra!)} y1={H - P} x2={x(tra!)} y2={y(avg!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          <line x1={P} y1={y(avg!)} x2={x(tra!)} y2={y(avg!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          <GuideDraw fromX={x(tra!)} fromY={H - P} toX={x(tra!)} toY={y(avg!)} />
          <GuideDraw fromX={P} fromY={y(avg!)} toX={x(tra!)} toY={y(avg!)} />
          {/* Deko: Fadenkreuz rastet einmal am Punkt ein und verschwindet */}
          <MatrixReticle cx={x(tra!)} cy={y(avg!)} color={OWN} />
          {/* Deko: weicher Lichthof unter dem Punkt (statisch, im Druck weg) */}
          <circle aria-hidden="true" className="fx-deco" pointerEvents="none" cx={x(tra!)} cy={y(avg!)} r={20} fill={`url(#${uid}pg)`} />
          {/* Deko-Ping am Punkt; der Punkt selbst bleibt statisch */}
          <SvgPing cx={x(tra!)} cy={y(avg!)} r={7} color={OWN} play={ping} count={2} gap={0.35} scale={4} duration={0.9} />
          <circle cx={x(tra!)} cy={y(avg!)} r={7} fill={OWN} fillOpacity={0.95} stroke="#fff" strokeWidth="1.4" />
          <text x={x(tra!)} y={y(avg!) - 15} textAnchor="middle"
            fontFamily="'Space Grotesk', sans-serif" fontSize="12.5" fontWeight="600" fill="#fff"
            stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke"
            style={{ fontVariantNumeric: "tabular-nums" }}>
            <tspan ref={tRef} key={ts}>{ts}</tspan>{" / "}<tspan ref={aRef} key={as}>{as}</tspan>
          </text>
        </>
      )}
    </svg>
  );
}
