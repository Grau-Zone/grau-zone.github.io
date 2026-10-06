// Transparenz-Matrix: Transparenz (x, Anteil ohne "Weiss ich nicht") gegen den
// Durchschnitt der vier Faehigkeiten (y, 1..7). Gleicher Aufbau wie die
// Souveraenitaets-Matrix (ResultVisuals.tsx): Raute = Median der Gruppe, Rahmen =
// ihre mittlere Haelfte, Punkt = eigener Wert.
import type { Lang } from "../data/instrument";
import type { Quant } from "../data/benchmarkCore";
import { TRA_QUAD, AXIS_TRA, AXIS_AVG, fmtAvg } from "../data/transparencyView";
import type { TraQuadKey } from "../data/scoring";

type T = { en: string; de: string };

const AXIS = "rgba(190,210,230,0.30)";
const LABEL = "rgba(214,230,245,0.55)";
const OWN = "#9b8cf0";

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

  const quads: { key: TraQuadKey; qx: number; qy: number }[] = [
    { key: "control", qx: 0.75, qy: 0.75 },
    { key: "optimistic", qx: 0.25, qy: 0.75 },
    { key: "bound", qx: 0.75, qy: 0.25 },
    { key: "blind", qx: 0.25, qy: 0.25 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ maxWidth: 460 }}
      role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      {/* "Blindflug" leicht betont, das ist die Warnung dieses Bilds */}
      <rect x={P} y={yN(0.5)} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2} fill="rgba(207,135,165,0.07)" />
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke={AXIS} strokeWidth="1" />
      <line x1={x(0.5)} y1={P} x2={x(0.5)} y2={H - P} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
      <line x1={P} y1={yN(0.5)} x2={W - P} y2={yN(0.5)} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />

      {quads.map((q) => (
        <text key={q.key} x={x(q.qx)} y={yN(q.qy)} textAnchor="middle"
          fontFamily="'Share Tech Mono', monospace" fontSize="12.5" letterSpacing="1"
          fill={q.key === "blind" ? "rgba(207,135,165,0.8)" : "rgba(214,230,245,0.32)"}
          style={{ textTransform: "uppercase" }}>
          {p(TRA_QUAD[q.key].name)}
        </text>
      ))}

      {/* Vergleichsgruppen */}
      {compare.map((c, i) => {
        const cx = x(c.tra.p50), cy = y(c.avg.p50), s = 7;
        return (
          <g key={i}>
            <rect
              x={x(c.tra.p25)} y={y(c.avg.p75)}
              width={Math.max(2, x(c.tra.p75) - x(c.tra.p25))} height={Math.max(2, y(c.avg.p25) - y(c.avg.p75))}
              rx={3} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"
              strokeDasharray={i === 1 ? "5 4" : undefined}
            />
            <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
              fill="#0a0d1a" stroke="#fff" strokeWidth="1.6" />
            {c.tag && (
              <text x={i === 0 ? cx - s - 5 : cx + s + 5} y={cy + 4} textAnchor={i === 0 ? "end" : "start"}
                fontFamily="'Space Grotesk', sans-serif" fontSize="12" fontWeight="600" fill="#fff"
                stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
                {c.tag}
              </text>
            )}
          </g>
        );
      })}

      {/* Achsen: unten 0 und 100 %, links 1 und 7 */}
      <text x={W / 2} y={H - 12} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="13" fill={LABEL}>
        {p(AXIS_TRA)} →
      </text>
      <text x={P} y={H - P + 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>0 %</text>
      <text x={W - P} y={H - P + 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>100 %</text>
      <text x={14} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="13" fill={LABEL}
        transform={`rotate(-90 14 ${H / 2})`}>
        {p(AXIS_AVG)} →
      </text>
      <text x={P - 8} y={H - P + 4} textAnchor="end" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>1</text>
      <text x={P - 8} y={P + 4} textAnchor="end" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>7</text>

      {has && (
        <>
          <line x1={x(tra!)} y1={H - P} x2={x(tra!)} y2={y(avg!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          <line x1={P} y1={y(avg!)} x2={x(tra!)} y2={y(avg!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          <circle cx={x(tra!)} cy={y(avg!)} r={7} fill={OWN} fillOpacity={0.95} stroke="#fff" strokeWidth="1.4" />
          <text x={x(tra!)} y={y(avg!) - 15} textAnchor="middle"
            fontFamily="'Space Grotesk', sans-serif" fontSize="12.5" fontWeight="600" fill="#fff"
            stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
            {Math.round(tra! * 100)}% / {fmtAvg(avg!, lang)}
          </text>
        </>
      )}
    </svg>
  );
}
