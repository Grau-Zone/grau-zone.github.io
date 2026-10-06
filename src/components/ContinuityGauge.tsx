// Tacho fuer "Kontinuitaet bei Anbieterstoerungen" (0..1): Halbkreis mit drei
// Zonen, Nadel = eigener Wert, duenne Boegen = mittlere Haelfte der Vergleichsgruppen
// (A durchgezogen, B gestrichelt), Raute = ihr Median.
import type { Quant } from "../data/benchmarkCore";

const W = 320, H = 206, CX = 160, CY = 172, R = 128;
const ZONES = [
  { from: 0, to: 1 / 3, color: "rgba(207,107,107,0.55)" },
  { from: 1 / 3, to: 2 / 3, color: "rgba(217,165,89,0.55)" },
  { from: 2 / 3, to: 1, color: "rgba(108,194,181,0.6)" },
];
const LABEL = "rgba(214,230,245,0.55)";

// Wert 0..1 auf den Halbkreis: 0 links, 1 rechts, ueber oben.
const point = (v: number, r: number) => {
  const a = Math.PI * (1 - Math.max(0, Math.min(1, v)));
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};
const arc = (from: number, to: number, r: number) => {
  const a = point(from, r), b = point(to, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
};

export type GaugeCompare = { q: Quant; tag?: string };

export default function ContinuityGauge({
  value, compare = [], ariaLabel,
}: {
  value: number | null;
  compare?: GaugeCompare[];
  ariaLabel?: string;
}) {
  const needle = value !== null ? point(value, R - 10) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ maxWidth: 420 }}
      role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      {ZONES.map((z) => (
        <path key={z.from} d={arc(z.from, z.to, R)} fill="none" stroke={z.color} strokeWidth="18" />
      ))}

      {/* Skala */}
      <text x={CX - R} y={CY + 22} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>0 %</text>
      <text x={CX} y={CY - R - 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>50 %</text>
      <text x={CX + R} y={CY + 22} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>100 %</text>

      {/* Nadel = eigener Wert */}
      {needle && (
        <>
          <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={7} fill="#fff" />
          <text x={CX} y={CY + 28} textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="17"
            fontWeight="600" fill="#fff">
            {Math.round(value! * 100)} %
          </text>
        </>
      )}
      {/* Vergleichsgruppen innen, nach der Nadel gezeichnet: Bogen = mittlere Haelfte, Raute = Median */}
      {compare.map((c, i) => {
        const r = R - 26 - i * 12;
        const m = point(c.q.p50, r), s = 6;
        const lab = point(c.q.p25, r);
        return (
          <g key={i}>
            <path d={arc(c.q.p25, Math.max(c.q.p75, c.q.p25 + 0.005), r)} fill="none" stroke="rgba(255,255,255,0.75)"
              strokeWidth="4" strokeLinecap="round" strokeDasharray={i === 1 ? "6 5" : undefined} />
            {/* Raute wie in den Matrizen; nach der Nadel gezeichnet und dunkel gefuellt,
                damit sie auch sichtbar bleibt, wenn die Nadel genau auf dem Median steht */}
            <polygon points={`${m.x},${m.y - s} ${m.x + s},${m.y} ${m.x},${m.y + s} ${m.x - s},${m.y}`}
              fill="#0a0d1a" stroke="#fff" strokeWidth="1.6" />
            {c.tag && (
              <text x={lab.x - 8} y={lab.y + 4} textAnchor="end" fontFamily="'Space Grotesk', sans-serif" fontSize="11"
                fontWeight="600" fill="#fff" stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
                {c.tag}
              </text>
            )}
          </g>
        );
      })}

    </svg>
  );
}
