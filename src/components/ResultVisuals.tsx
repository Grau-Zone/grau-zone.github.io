// Zwei Visualisierungen für die Ergebnisseite des Self-Assessments:
//  1) Souveränitäts-Matrix: FTC (x) gegen CTO (y), Punktfarbe = Outcome
//  2) Wirkkette: die vier Modellspalten als Stufen, schwächste markiert
import { motion } from "framer-motion";
import type { Lang } from "../data/instrument";
import { UI, pick } from "../data/surveyUi";

const AXIS = "rgba(190,210,230,0.30)";
const LABEL = "rgba(214,230,245,0.55)";

// Lange Quadranten-Beschriftungen auf hoechstens zwei moeglichst gleich lange
// Zeilen umbrechen, damit sie im Quadranten bleiben.
function wrap2(label: string, maxChars = 15): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  if (words.length < 2) return [label];
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

// Farbskala: rot → gelb → grün, für 0..1
export function scoreColor(v: number): string {
  const hue = 4 + 128 * Math.max(0, Math.min(1, v)); // 4° rot bis 132° grün
  return `hsl(${hue}, 62%, 55%)`;
}

// ─── 1 · Souveränitäts-Matrix ────────────────────────────────────────────────
export function SovereigntyMatrix({
  ftc, cto, cont, lang,
}: { ftc: number | null; cto: number | null; cont: number | null; lang: Lang }) {
  const W = 420, H = 420, P = 46;           // Plotfläche
  const x = (v: number) => P + v * (W - 2 * P);
  const y = (v: number) => H - P - v * (H - 2 * P);
  const has = ftc !== null && cto !== null;

  const quads: { qx: number; qy: number; label: string; strong?: boolean }[] = [
    { qx: 0.75, qy: 0.75, label: pick(UI.quadSovereign, lang), strong: true },
    { qx: 0.75, qy: 0.25, label: pick(UI.quadExit, lang) },
    { qx: 0.25, qy: 0.75, label: pick(UI.quadSettled, lang) },
    { qx: 0.25, qy: 0.25, label: pick(UI.quadExposed, lang) },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ maxWidth: 460 }}>
      {/* Quadrantenfüllung: nur der "souveräne" leicht betont */}
      <rect x={x(0.5)} y={y(1)} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2}
        fill="rgba(108,194,181,0.07)" />
      {/* Rahmen + Mittelkreuz */}
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke={AXIS} strokeWidth="1" />
      <line x1={x(0.5)} y1={P} x2={x(0.5)} y2={H - P} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
      <line x1={P} y1={y(0.5)} x2={W - P} y2={y(0.5)} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />

      {quads.map((q) => {
        const lines = wrap2(q.label);
        const dy0 = -((lines.length - 1) * 15) / 2; // Block vertikal zentrieren
        return (
          <text key={q.label} x={x(q.qx)} y={y(q.qy) + dy0} textAnchor="middle"
            fontFamily="'Share Tech Mono', monospace" fontSize="12.5" letterSpacing="1"
            fill={q.strong ? "rgba(108,194,181,0.75)" : "rgba(214,230,245,0.32)"}
            style={{ textTransform: "uppercase" }}>
            {lines.map((ln, i) => (
              <tspan key={i} x={x(q.qx)} dy={i === 0 ? 0 : 15}>{ln}</tspan>
            ))}
          </text>
        );
      })}

      {/* Achsenbeschriftung */}
      <text x={W / 2} y={H - 12} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
        fontSize="13" fill={LABEL}>
        Reconfiguration Discretion →
      </text>
      <text x={14} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
        fontSize="13" fill={LABEL} transform={`rotate(-90 14 ${H / 2})`}>
        Operational Control →
      </text>

      {has && (
        <>
          {/* Hilfslinien zur Position */}
          <line x1={x(ftc!)} y1={H - P} x2={x(ftc!)} y2={y(cto!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          <line x1={P} y1={y(cto!)} x2={x(ftc!)} y2={y(cto!)} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
          {/* Bewusst statisch: der Datenpunkt darf nicht davon abhaengen, dass eine
              Animation laeuft (reduzierte Bewegung, gedrosselte Tabs, Druckansicht). */}
          <circle
            cx={x(ftc!)} cy={y(cto!)} r={7}
            fill={cont !== null ? scoreColor(cont) : "rgba(139,164,255,0.85)"}
            fillOpacity={0.9} stroke="#fff" strokeWidth="1.4"
          />
          <text x={x(ftc!)} y={y(cto!) - 15} textAnchor="middle"
            fontFamily="'Space Grotesk', sans-serif" fontSize="12.5" fontWeight="600" fill="#fff">
            {Math.round(ftc! * 100)}% / {Math.round(cto! * 100)}%
          </text>
        </>
      )}
      {!has && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
          fontSize="13" fontStyle="italic" fill="rgba(214,230,245,0.4)">
          {pick(UI.notAnswered, lang)}
        </text>
      )}
    </svg>
  );
}

// ─── 2 · Wirkkette ───────────────────────────────────────────────────────────
export function CausalChain({
  steps, lang,
}: {
  steps: { key: string; label: string; value: number | null; color: string }[];
  lang: Lang;
}) {
  const withValues = steps.filter((s) => s.value !== null);
  const min = withValues.length ? Math.min(...withValues.map((s) => s.value!)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {steps.map((s, i) => {
        const has = s.value !== null;
        const weakest = has && min !== null && Math.abs(s.value! - min) < 1e-9;
        return (
          <div key={s.key}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "5px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)", minWidth: "18px" }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.85)", flex: 1 }}>
                {s.label}
              </span>
              {weakest && (
                <span style={{
                  fontFamily: "Inter, sans-serif", fontSize: "10.5px", padding: "2px 8px", borderRadius: "5px",
                  background: "rgba(217,165,89,0.18)", color: "#d9a559", whiteSpace: "nowrap",
                }}>
                  {pick(UI.chainWeakest, lang)}
                </span>
              )}
              <span style={{
                fontFamily: has ? "Space Grotesk, sans-serif" : "Inter, sans-serif",
                fontSize: has ? "15px" : "12px", fontWeight: 600,
                fontStyle: has ? "normal" : "italic",
                color: has ? s.color : "rgba(255,255,255,0.4)", minWidth: "46px", textAlign: "right",
              }}>
                {has ? `${Math.round(s.value! * 100)}%` : "—"}
              </span>
            </div>
            <div style={{ height: "9px", borderRadius: "5px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {has && (
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${s.value! * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: "100%", borderRadius: "5px", background: s.color,
                    boxShadow: weakest ? "0 0 14px rgba(217,165,89,0.55)" : undefined,
                    outline: weakest ? "1px solid rgba(217,165,89,0.7)" : undefined,
                  }}
                />
              )}
            </div>
            {/* Verbindungspfeil zwischen den Stufen */}
            {i < steps.length - 1 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: "12px", lineHeight: 1, marginTop: "3px" }}>↓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
