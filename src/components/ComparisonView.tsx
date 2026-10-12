// Vergleich mit den anderen Teilnahmen auf der Ergebnisseite: Filter, vier Faehigkeiten,
// Matrix, Kontinuitaet (Darstellung des frueheren Dashboards, Entscheid Adrian 06.10.2026).
//
// Liest ausschliesslich data/benchmark.json. Gefiltert wird nach genau einem Merkmal mit
// je zwei Gruppen; die Regeln stehen in data/benchmarkCore.ts.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import ComparisonBand from "./ComparisonBand";
import { SovereigntyMatrix, QUAD_VIEW, RESULT_VIEW, useRevealOnce } from "./ResultVisuals";
import TransparencyMatrix from "./TransparencyMatrix";
import ContinuityGauge from "./ContinuityGauge";
import { TRA_QUAD, AXIS_TRA, AXIS_AVG, fmtAvg } from "../data/transparencyView";
import { CAPACITIES, type CapacityKey } from "../data/capacityItems";
import { BENCHMARK, fmtNum, fmtPct } from "../data/benchmark";
import { ALL, DIMENSIONS, groupId, type DimKey } from "../data/benchmarkGroups";
import { positionOf, capStepOf, CTX_STEP, type GroupBlock, type Quant, type Position } from "../data/benchmarkCore";
import type { Lang } from "../data/instrument";
import { capacityAverage, transparencyQuadrant, type QuadKey, type RespondentScores } from "../data/scoring";
import { panelStyles } from "./panelStyles";
import { CSS_EASE_IN_OUT, DUR, EASE_OUT, Ping, Reveal, useReducedMotionSafe, withAlpha } from "./fx";
import { BAND_T, CountText, MATRIX_T, ResultFxStyles, playSteps, type FxStep } from "./resultfx";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

const CMP_TXT = {
  filter: t("Compare by", "Vergleichen nach"),
  all: t("All participants", "Alle Teilnehmenden"),
  allTab: t("All", "Alle"),
  notYet: t("not enough participations yet", "noch zu wenige Teilnahmen"),
  capHead: t("Four capacities", "Vier Fähigkeiten"),
  capLead: t(
    "Self-assessment on a scale from 1 to 7. Band = middle half of the group, line = median.",
    "Selbsteinschätzung auf einer Skala von 1 bis 7. Band = mittlere Hälfte der Gruppe, Strich = Median."
  ),
  matrixHead: t("The two dimensions of sovereignty", "Die zwei Dimensionen der Souveränität"),
  matrixLead: t(
    "Reconfiguration Discretion: how freely the provider could be changed. Operational Control: how much control remains while depending on it. Diamond = median of the group, frame = its middle half (A solid, B dashed).",
    "Reconfiguration Discretion: wie frei sich der Anbieter wechseln liesse. Operational Control: wie viel Kontrolle bleibt, während man von ihm abhängt. Raute = Median der Gruppe, Rahmen = ihre mittlere Hälfte (A durchgezogen, B gestrichelt)."
  ),
  shares: t(
    "Percentages = share of all participations per quadrant; a dash means fewer than two participations.",
    "Prozente = Anteil aller Teilnahmen je Quadrant; ein Strich bedeutet weniger als zwei Teilnahmen."
  ),
  contHead: t("Continuity under provider disruption", "Kontinuität bei Anbieterstörungen"),
  contLead: t(
    "How well operations continue when the provider fails or acts unilaterally. 0 % = lowest, 100 % = highest value on the scale.",
    "Wie gut der Betrieb weiterläuft, wenn der Anbieter ausfällt oder einseitig handelt. 0 % = tiefster, 100 % = höchster Wert der Skala."
  ),
  traHead: t("Transparency in your organisation", "Transparenz im eigenen Unternehmen"),
  traLead: t(
    "Across: share of questions that could be answered instead of “I don't know”; the lower, the less insight into what is happening in the organisation. Up: average of the four capacities. Diamond = median of the group, frame = its middle half.",
    "Waagrecht: Anteil der Fragen, die beantwortet werden konnten statt „Weiss ich nicht“; je tiefer, desto weniger Einblick in das, was im eigenen Unternehmen passiert. Senkrecht: Durchschnitt der vier Fähigkeiten. Raute = Median der Gruppe, Rahmen = ihre mittlere Hälfte."
  ),
  traOld: t(
    "transparency not included in older 16-character result codes",
    "Transparenz in älteren Ergebnis-Codes mit 16 Zeichen nicht enthalten"
  ),
  contGauge: t(
    "Needle = your value, thin arc = middle half of the group, diamond = median.",
    "Nadel = Ihr Wert, dünner Bogen = mittlere Hälfte der Gruppe, Raute = Median."
  ),
  median: t("Median", "Median"),
  band: t("middle half", "mittlere Hälfte"),
  noValue: t("not enough valid answers", "zu wenige gültige Antworten"),
  noCmp: t("no comparison values for this group yet", "für diese Gruppe noch keine Vergleichswerte"),
  own: t("Your value", "Ihr Wert"),
  ownGroup: t("your group", "Ihre Gruppe"),
  ownLegend: t("Dot = your value.", "Punkt = Ihr Wert."),
  ownMatrix: t("Coloured dot = your position, colour = your continuity.", "Farbiger Punkt = Ihre Position, Farbe = Ihre Kontinuität."),
  ownNone: t("Your value: not enough answers for a value", "Ihr Wert: zu wenige Antworten für einen Wert"),
  pos: {
    low: t("your value: lower quarter", "Ihr Wert: unteres Viertel"),
    mid: t("your value: middle half", "Ihr Wert: mittlere Hälfte"),
    high: t("your value: upper quarter", "Ihr Wert: oberes Viertel"),
  } as Record<Position, T>,
  posShort: {
    low: t("lower quarter", "unteres Viertel"),
    mid: t("middle half", "mittlere Hälfte"),
    high: t("upper quarter", "oberes Viertel"),
  } as Record<Position, T>,
};

// oldCode: Werte aus einem Ergebnis-Code der Version 1 (16 Zeichen), ohne Transparenz.
export type OwnValues = { scores: RespondentScores; groups: Partial<Record<DimKey, string>>; oldCode?: boolean };

type Row = { id: string; label: string; tag?: string; block: GroupBlock; isOwn: boolean };

type Props = {
  lang: Lang;
  own: OwnValues | null;
  /** Zusaetzlicher Inhalt rechts neben der Matrix, oben (Ergebnisseite: "Wo Sie stehen"). */
  matrixSide?: ReactNode;
  /** Eigene Zahl neben der Lage zeigen und fehlende eigene Werte benennen (Ergebnisseite). */
  ownNumbers?: boolean;
  /** Kleiner Zusatz neben dem Namen jeder Faehigkeit (Ergebnisseite: ausgewertete Fragen). */
  capNote?: (key: CapacityKey) => ReactNode;
  /** Inhalt direkt unter der Karte "Vier Faehigkeiten" (Ergebnisseite: Zusammenfassung der beantworteten Fragen). */
  afterCaps?: ReactNode;
  /** Ueberschriften der Karten; auf der Ergebnisseite eine Ebene tiefer als der Seitentitel. */
  headingLevel?: "h2" | "h3";
};

// ─── Gestaltung (nur Darstellung) ────────────────────────────────────────────
// Kartenhaut der Ergebnisseite: leichter Verlauf, Lichtkante oben, Tiefe. Bewusst
// ohne overflow hidden, damit die Tooltips der Baender nie abgeschnitten werden.
const CARD_SKIN: CSSProperties = {
  position: "relative", marginBottom: "24px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.034), rgba(255,255,255,0.014))",
  border: "1px solid rgba(255,255,255,0.075)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 56px -28px rgba(2,4,14,0.85)",
};

// Aktiver Schlitten der Filter-Reiter.
const SLED: CSSProperties = {
  position: "absolute", inset: "-1px", borderRadius: "999px", pointerEvents: "none",
  background: "linear-gradient(180deg, rgba(75,110,255,0.32), rgba(75,110,255,0.14))",
  border: "1px solid rgba(139,164,255,0.7)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px -4px rgba(75,110,255,0.6)",
};

// Gruppenlegende: Crossfade je Merkmal, Eintraege leicht gestaffelt (nur opacity).
const LEGEND_VARIANTS: Variants = {
  h: { opacity: 0 },
  s: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT, staggerChildren: 0.04 } },
  x: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
};
const LEGEND_ITEM: Variants = { h: { opacity: 0 }, s: { opacity: 1 } };

const dimPublished = (d: DimKey) => {
  const def = DIMENSIONS.find((x) => x.key === d)!;
  return def.groups.every((g) => !!BENCHMARK.groups[groupId(d, g.key)]);
};

export default function ComparisonView({
  lang, own, matrixSide, ownNumbers = false, capNote, afterCaps, headingLevel = "h2",
}: Props) {
  const H = headingLevel;
  const [dim, setDim] = useState<DimKey | "all">("all");
  // Nach dem ersten Filterwechsel kein Entree der Baender mehr: neue Werte nur per Crossfade.
  const [filtered, setFiltered] = useState(false);
  // Ortungs-Ping am Signalpunkt des gewaehlten Reiters (nur Deko, je Klick ein Ring).
  const [pingN, setPingN] = useState(0);
  const reduced = useReducedMotionSafe();
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const bis = lang === "de" ? "bis" : "to";
  const { card, h2, lead } = panelStyles;
  const mine = own?.scores ?? null;

  // Zeilen fuer die gewaehlte Ansicht: "Alle" oder die zwei Gruppen eines Merkmals.
  // isOwn: die Zeile, gegen die der eigene Wert eingeordnet wird ("Alle" bzw.
  // die eigene Gruppe im gewaehlten Merkmal).
  const rows: Row[] = (() => {
    if (!BENCHMARK.groups[ALL]) return [];
    if (dim === "all" || !dimPublished(dim)) return [{ id: ALL, label: p(CMP_TXT.all), block: BENCHMARK.groups[ALL], isOwn: true }];
    const def = DIMENSIONS.find((x) => x.key === dim)!;
    return def.groups.map((g, i) => ({
      id: groupId(dim, g.key), label: p(g.label), tag: i === 0 ? "A" : "B", block: BENCHMARK.groups[groupId(dim, g.key)],
      isOwn: own?.groups[dim] === g.key,
    }));
  })();

  // Lage des eigenen Werts in der eigenen Zeile; auf der Ergebnisseite mit Zahl.
  // opts.dot: Farbpunkt wie der eigene Punkt im Band darueber (nur Deko).
  // opts.count: die Zahl zaehlt beim ersten Entree synchron zum Punkt im Band hoch;
  // der Endwert steht immer im DOM, Screenreader lesen nur ihn, nach einem
  // Filterwechsel zaehlt nichts mehr.
  const posLine = (
    pos: Position | null, ownValue: number | null, f: (v: number) => string,
    opts?: { dot?: string; count?: { delayMs: number } },
  ) => {
    const style = { fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "2px 0 0" };
    if (ownNumbers) {
      if (ownValue === null) return <p style={{ ...style, color: "#d9a559" }}>{p(CMP_TXT.ownNone)}</p>;
      const dot = opts?.dot;
      const count = opts?.count;
      return (
        <p style={style}>
          {dot && (
            <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: "0 0 0 1.5px #0a0d1a", marginRight: 6, verticalAlign: "1px" }} />
          )}
          {p(CMP_TXT.own)}:{" "}
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {count ? (
              <CountText from={1} to={ownValue} format={f} final={f(ownValue)} delayMs={count.delayMs}
                durMs={BAND_T.countDur} enabled={!filtered} hostClosest="[data-rfx-row]" />
            ) : f(ownValue)}
          </span>
          {pos ? " · " + p(CMP_TXT.posShort[pos]) : ""}
        </p>
      );
    }
    return pos ? <p style={style}>{p(CMP_TXT.pos[pos])}</p> : null;
  };

  const bandDescribe = (label: string, q: Quant | null, f: (v: number) => string, ownValue: number | null = null) => [
    ...(ownValue !== null ? [`${p(CMP_TXT.own)}: ${f(ownValue)}`] : []),
    label,
    ...(q ? [`${p(CMP_TXT.median)}: ${f(q.p50)}`, `${p(CMP_TXT.band)}: ${f(q.p25)} ${bis} ${f(q.p75)}`] : []),
  ];

  // dash: Linienmuster vor dem Kennbuchstaben wie in der Grafik daneben
  // (A durchgezogen, B gestrichelt). Nur in den Seitenlisten der Grafiken und nur,
  // wenn dort beide Gruppen gezeichnet sind (bothDrawn): die Grafiken stricheln nach
  // der Reihenfolge im Vergleich, erst dann gilt sicher A = erste, B = zweite Linie.
  const bothDrawn = (has: (r: Row) => boolean) => rows.length === 2 && rows.every(has);
  const rowHead = (r: Row, dash?: boolean) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
      {dash && r.tag && (
        <svg aria-hidden="true" width="18" height="6" style={{ display: "inline-block", verticalAlign: "1px" }}>
          <line x1="1" y1="3" x2="17" y2="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4"
            strokeDasharray={r.tag === "B" ? "4 3" : undefined} />
        </svg>
      )}
      {r.tag && (
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "4px", padding: "0 5px" }}>
          {r.tag}
        </span>
      )}
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>{r.label}</span>
      {mine && r.tag && r.isOwn && (
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", color: "#a8bcff" }}>{p(CMP_TXT.ownGroup)}</span>
      )}
    </div>
  );

  // Fehlen der Gruppe Werte: ohne ownNumbers wie frueher auf dem Dashboard, mit ownNumbers als
  // Luecke im Vergleich benannt (die eigenen Antworten sind ja vollstaendig).
  const noValue = (
    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: "4px 0 6px", fontStyle: "italic" }}>
      {p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
    </p>
  );
  // Auf der Ergebnisseite bleibt der eigene Wert immer sichtbar: auch wenn der eigenen
  // Gruppe Vergleichswerte fehlen, und auch wenn man zu keiner der zwei Gruppen gehoert.
  const ownInRows = rows.some((r) => r.isOwn);
  type BandSpec = { min: number; max: number; ticks: number[]; color: string; scale?: [string, string]; label: string };
  const ownOnly = (
    ownValue: number | null, band: BandSpec, f: (v: number) => string, rowLabel: string,
    revealDelay?: number, mode?: "enter" | "remeasure",
    lineOpts?: { dot?: string; count?: { delayMs: number } },
  ) => (
    <>
      <ComparisonBand min={band.min} max={band.max} ticks={band.ticks} q={null} own={ownValue} color={band.color}
        scale={band.scale} label={band.label} describe={[...bandDescribe(rowLabel, null, f, ownValue), p(CMP_TXT.noCmp)]}
        revealDelay={revealDelay} revealMode={mode} />
      {posLine(null, ownValue, f, lineOpts)}
    </>
  );

  const quadShares = dim === "all" || !rows[0]?.tag ? BENCHMARK.groups[ALL]?.quad : undefined;

  // Transparenz-Matrix: eigener Punkt und Gruppen mit beiden Werten.
  const ownTra = mine?.tra ?? null;
  const ownAvg = mine ? capacityAverage(mine.cap) : null;
  const ownTraQuad = transparencyQuadrant(ownTra, ownAvg);
  // Aeltere Ergebnis-Codes (Version 1) enthalten keine Transparenz.
  const traOldCode = !!own?.oldCode && ownTra === null;
  const traRows = rows.filter((r) => r.block.tra && r.block.avg);
  // Linien-Symbol je Seitenliste nur, wenn die Grafik daneben beide Gruppen zeichnet.
  const dashMx = bothDrawn((r) => !!(r.block.ftc && r.block.cto));
  const dashCont = bothDrawn((r) => !!r.block.cont);
  const dashTra = bothDrawn((r) => !!(r.block.tra && r.block.avg));
  const fmtCap = (v: number) => fmtNum(v, lang);
  const fmtOwnCap = (v: number) => fmtNum(v, lang, 1);

  if (!rows.length) return null;

  const capCardStyle: CSSProperties = { ...card, ...CARD_SKIN };
  const rescanKey = filtered ? dim : undefined;

  return (
    <>
      <ResultFxStyles />
      {/* Filter: genau ein Merkmal */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "22px" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{p(CMP_TXT.filter)}:</span>
        <div className="rfx-rail">
        {(["all", ...DIMENSIONS.map((d) => d.key)] as (DimKey | "all")[]).map((k) => {
          const ok = k === "all" || dimPublished(k);
          const active = ok && dim === k;
          const label = k === "all" ? p(CMP_TXT.allTab) : p(DIMENSIONS.find((d) => d.key === k)!.label);
          return (
            <button key={k} type="button" disabled={!ok} aria-pressed={active}
              onClick={() => { if (k !== dim) { setDim(k); setFiltered(true); setPingN((n) => n + 1); } }}
              title={ok ? undefined : p(CMP_TXT.notYet)}
              className={ok ? "fx-press rfx-pill" : "rfx-pill"}
              style={{
                position: "relative",
                fontFamily: "Inter, sans-serif", fontSize: "13px", padding: "6px 13px", borderRadius: "999px",
                border: "1px solid transparent",
                background: "transparent",
                color: ok ? (active ? "#fff" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.32)",
                cursor: ok ? "pointer" : "not-allowed",
              }}>
              {/* Aktiver Schlitten gleitet zwischen den Pills (layoutId).
                  Sanfte Stufe: keine Fahrt, der Schlitten blendet am Ziel ein und am alten Platz aus. */}
              {reduced ? (
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span key="cmp-filter" aria-hidden="true"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: DUR.fade, ease: EASE_OUT }}
                      style={SLED} />
                  )}
                </AnimatePresence>
              ) : active && (
                <motion.span layoutId="cmp-filter" aria-hidden="true"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                  style={SLED} />
              )}
              <span style={{ position: "relative" }}>
                {/* Signalpunkt: leuchtet am gewaehlten Reiter, ein Ping beim Wechsel (nur Deko). */}
                <span aria-hidden="true" className="fx-deco" style={{
                  position: "relative", display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                  marginRight: 7, verticalAlign: "0.1em",
                  background: active ? "#8BA4FF" : ok ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)",
                  transition: "background-color 240ms ease",
                }}>
                  {/* Leuchten statisch, nur seine Deckkraft wechselt (kein box-shadow-Uebergang) */}
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 6px rgba(139,164,255,0.9)",
                    opacity: active ? 1 : 0, transition: "opacity 240ms ease",
                  }} />
                  <Ping play={active ? pingN : 0} color="#8BA4FF" size={5} scale={3.2} duration={0.7} />
                </span>
                {label}{ok ? "" : ` · ${p(CMP_TXT.notYet)}`}
              </span>
            </button>
          );
        })}
        </div>
      </div>
      {/* Gruppen der aktuellen Ansicht, einmal oben statt in jeder Zeile */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={dim}
          style={{ display: "flex", gap: "8px 22px", flexWrap: "wrap", alignItems: "baseline", margin: "-8px 0 22px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}
          variants={LEGEND_VARIANTS} initial="h" animate="s" exit="x">
          {rows.map((r) => (
            <motion.span key={r.id} variants={LEGEND_ITEM}>
              {r.tag ? <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{r.tag} </strong> : null}
              {r.label}
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Vier Faehigkeiten */}
      <Reveal {...RESULT_VIEW} y={16} style={capCardStyle}>
        <CardChrome index={0} rescanKey={rescanKey} />
        <H style={h2}>{p(CMP_TXT.capHead)}</H>
        <p style={lead}>{p(CMP_TXT.capLead)}{mine ? " " + p(CMP_TXT.ownLegend) : ""}</p>
        {/* Bei einem Filterwechsel nur Crossfade der Zeilen (key je Merkmal), nie Zwischenwerte */}
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={dim} className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "30px 36px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}>
          {CAPACITIES.map((c, ci) => (
            <div key={c.key} style={{ position: "relative", paddingLeft: "14px" }}>
              {/* Farbkante der Faehigkeit (nur Deko) */}
              <span aria-hidden="true" style={{
                position: "absolute", left: 0, top: 4, bottom: 4, width: 2, borderRadius: 1,
                background: `linear-gradient(180deg, ${withAlpha(c.color, 0.7)}, ${withAlpha(c.color, 0)})`,
              }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                <span style={{
                  display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: c.color,
                  boxShadow: `0 0 0 3px ${withAlpha(c.color, 0.15)}, 0 0 10px ${withAlpha(c.color, 0.5)}`,
                }} />
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.9)" }}>
                  {lang === "en" ? c.label.en : c.label.de}
                </span>
                {capNote && (
                  <span style={{ marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    {capNote(c.key)}
                  </span>
                )}
              </div>
              {rows.map((r, i) => {
                const q = r.block.cap[c.key];
                const ownValue = mine ? mine.cap[c.key] : null;
                // Entree: gestaffelt je Faehigkeit und Zeile; nach einem Filterwechsel
                // kurzes Nachmessen der neuen Gruppe (ohne Zaehlen).
                const revealDelay = filtered ? ci * 0.03 + i * 0.02 : ci * 0.09 + i * 0.06;
                const revealMode = filtered ? "remeasure" : "enter";
                const lineOpts = { dot: c.color, count: { delayMs: revealDelay * 1000 + BAND_T.dot } };
                return (
                  <div key={r.id} data-rfx-row="" style={{ marginBottom: "8px" }}>
                    {rowHead(r)}
                    {q ? (
                      <>
                        <ComparisonBand min={1} max={7} ticks={[1, 2, 3, 4, 5, 6, 7]} q={q} own={ownValue} color={c.color}
                          scale={i === rows.length - 1 ? ["1", "7"] : undefined}
                          label={lang === "en" ? c.label.en : c.label.de}
                          describe={bandDescribe(r.label, q, fmtCap, ownValue)}
                          revealDelay={revealDelay} revealMode={revealMode} />
                        {r.isOwn && mine && posLine(positionOf(ownValue, q, capStepOf(r.block)), ownValue, fmtOwnCap, lineOpts)}
                      </>
                    ) : ownNumbers && mine && r.isOwn ? (
                      <>
                        {ownOnly(ownValue, {
                          min: 1, max: 7, ticks: [1, 2, 3, 4, 5, 6, 7], color: c.color,
                          scale: i === rows.length - 1 ? ["1", "7"] : undefined, label: lang === "en" ? c.label.en : c.label.de,
                        }, fmtOwnCap, r.label, revealDelay, revealMode, lineOpts)}
                        {noValue}
                      </>
                    ) : noValue}
                  </div>
                );
              })}
              {ownNumbers && mine && !ownInRows && posLine(null, mine.cap[c.key], fmtOwnCap)}
            </div>
          ))}
        </motion.div>
        </AnimatePresence>
      </Reveal>
      {afterCaps}

      {/* Matrix */}
      <Reveal {...RESULT_VIEW} y={16} style={capCardStyle}>
        <CardChrome index={1} rescanKey={rescanKey} />
        <H style={h2}>{p(CMP_TXT.matrixHead)}</H>
        <p style={lead}>{p(CMP_TXT.matrixLead)}{quadShares ? " " + p(CMP_TXT.shares) : ""}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SovereigntyMatrix
              ftc={mine?.ftc ?? null} cto={mine?.cto ?? null} cont={mine?.cont ?? null} lang={lang} emptyHint={ownNumbers && !!mine}
              quadShares={quadShares}
              compare={rows.filter((r) => r.block.ftc && r.block.cto).map((r) => ({ ftc: r.block.ftc!, cto: r.block.cto!, tag: r.tag }))}
              ariaLabel={[
                p(CMP_TXT.matrixHead),
                ...(mine?.ftc != null && mine?.cto != null
                  ? [`${p(CMP_TXT.own)}: Reconfiguration Discretion ${fmtPct(mine.ftc)}, Operational Control ${fmtPct(mine.cto)}`]
                  : []),
                ...rows.filter((r) => r.block.ftc && r.block.cto).map((r) =>
                  `${r.label}, ${p(CMP_TXT.median)}: Reconfiguration Discretion ${fmtPct(r.block.ftc!.p50)}, Operational Control ${fmtPct(r.block.cto!.p50)}`),
                // role="img" verdeckt die Beschriftung im SVG, deshalb die Anteile je Quadrant hier.
                ...(quadShares
                  ? [(Object.keys(quadShares) as QuadKey[]).map((k) => `${p(QUAD_VIEW[k].name)} ${quadShares[k] === null ? "–" : quadShares[k] + " %"}`).join(", ")]
                  : []),
              ].join(". ")} />
          </div>
          <div>
            {matrixSide}
            {mine?.ftc != null && mine?.cto != null && (
              <div style={{ marginBottom: "14px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>
                {p(CMP_TXT.own)}: Reconfiguration Discretion {fmtPct(mine.ftc)} · Operational Control {fmtPct(mine.cto)}
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{p(CMP_TXT.ownMatrix)}</div>
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} style={{ marginBottom: "12px" }}>
                {rowHead(r, dashMx)}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {r.block.ftc && r.block.cto
                    ? `Reconfiguration Discretion ${fmtPct(r.block.ftc.p50)} · Operational Control ${fmtPct(r.block.cto.p50)} (${p(CMP_TXT.median)})`
                    : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Kontinuitaet als Tacho: Nadel = eigener Wert, Boegen = mittlere Haelfte der Gruppen */}
      <Reveal {...RESULT_VIEW} y={16} style={capCardStyle}>
        <CardChrome index={2} rescanKey={rescanKey} />
        <H style={h2}>{p(CMP_TXT.contHead)}</H>
        <p style={lead}>{p(CMP_TXT.contLead)} {p(CMP_TXT.contGauge)}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ContinuityGauge
              value={mine?.cont ?? null}
              compare={rows.filter((r) => r.block.cont).map((r) => ({ q: r.block.cont!, tag: r.tag }))}
              ariaLabel={[
                p(CMP_TXT.contHead),
                ...(mine?.cont != null ? [`${p(CMP_TXT.own)}: ${fmtPct(mine.cont)}`] : []),
                ...rows.filter((r) => r.block.cont).map((r) =>
                  `${r.label}, ${p(CMP_TXT.median)}: ${fmtPct(r.block.cont!.p50)}, ${p(CMP_TXT.band)}: ${fmtPct(r.block.cont!.p25)} ${bis} ${fmtPct(r.block.cont!.p75)}`),
              ].join(". ")} />
          </div>
          <div>
            {rows.map((r) => (
              <div key={r.id} style={{ marginBottom: "12px" }}>
                {rowHead(r, dashCont)}
                {r.block.cont ? (
                  <>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                      {p(CMP_TXT.median)} {fmtPct(r.block.cont.p50)} · {p(CMP_TXT.band)} {fmtPct(r.block.cont.p25)} {bis} {fmtPct(r.block.cont.p75)}
                    </p>
                    {r.isOwn && mine && posLine(positionOf(mine.cont, r.block.cont, CTX_STEP), mine.cont, fmtPct)}
                  </>
                ) : (
                  <>
                    {noValue}
                    {ownNumbers && mine && r.isOwn && posLine(null, mine.cont, fmtPct)}
                  </>
                )}
              </div>
            ))}
            {ownNumbers && mine && !ownInRows && posLine(null, mine.cont, fmtPct)}
          </div>
        </div>
      </Reveal>

      {/* Transparenz-Matrix: Transparenz gegen Durchschnitt der Faehigkeiten */}
      <Reveal {...RESULT_VIEW} y={16} style={capCardStyle}>
        <CardChrome index={3} rescanKey={rescanKey} />
        <H style={h2}>{p(CMP_TXT.traHead)}</H>
        <p style={lead}>{p(CMP_TXT.traLead)}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <TransparencyMatrix
              tra={ownTra} avg={ownAvg} lang={lang}
              compare={traRows.map((r) => ({ tra: r.block.tra!, avg: r.block.avg!, tag: r.tag }))}
              ariaLabel={[
                p(CMP_TXT.traHead),
                ...(ownTra !== null && ownAvg !== null
                  ? [`${p(CMP_TXT.own)}: ${p(AXIS_TRA)} ${fmtPct(ownTra)}, ${p(AXIS_AVG)} ${fmtAvg(ownAvg, lang)}`]
                  : []),
                ...traRows.map((r) => `${r.label}, ${p(CMP_TXT.median)}: ${p(AXIS_TRA)} ${fmtPct(r.block.tra!.p50)}, ${p(AXIS_AVG)} ${fmtNum(r.block.avg!.p50, lang)}`),
              ].join(". ")} />
          </div>
          <div>
            {/* Eigenes Feld in Worten, wie "Wo Sie stehen" bei der Souveraenitaets-Matrix */}
            {ownTraQuad && (
              <div style={{ marginBottom: "16px" }}>
                <QuadrantReveal name={p(TRA_QUAD[ownTraQuad].name)} desc={p(TRA_QUAD[ownTraQuad].desc)} color={TRA_QUAD[ownTraQuad].color}
                  nameStyle={{ fontSize: "clamp(18px,2vw,23px)", marginBottom: "8px", letterSpacing: "normal" }}
                  descStyle={{ fontSize: "14px", lineHeight: 1.6 }} />
              </div>
            )}
            {mine && (
              <div style={{ marginBottom: "14px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>
                {traOldCode
                  ? `${p(CMP_TXT.own)}: ${p(AXIS_AVG)} ${ownAvg === null ? "–" : fmtAvg(ownAvg, lang)} · ${p(CMP_TXT.traOld)}`
                  : `${p(CMP_TXT.own)}: ${p(AXIS_TRA)} ${ownTra === null ? "–" : fmtPct(ownTra)} · ${p(AXIS_AVG)} ${ownAvg === null ? "–" : fmtAvg(ownAvg, lang)}`}
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} style={{ marginBottom: "12px" }}>
                {rowHead(r, dashTra)}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {r.block.tra && r.block.avg
                    ? `${p(AXIS_TRA)} ${fmtPct(r.block.tra.p50)} · ${p(AXIS_AVG)} ${fmtNum(r.block.avg.p50, lang)} (${p(CMP_TXT.median)})`
                    : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

    </>
  );
}

// ─── Kartenrahmen: Messinstrument-Chrom ──────────────────────────────────────
// Rein dekorativ (aria-hidden): Kantenlicht oben, vier Messecken, beim ersten
// Sichtkontakt faehrt eine Scanlinie einmal ueber die Karte (sanfte Stufe: der
// Rand leuchtet nur kurz auf). Nach einem Filterwechsel tastet die Linie die
// Karte kurz erneut ab. Endzustand: Linie unsichtbar, Ecken bei 0.6.
const SCAN_KF: Keyframe[] = [
  { transform: "translateY(-100%)", opacity: 1 },
  { transform: "translateY(0%)", opacity: 1, offset: 0.9 },
  { transform: "translateY(0%)", opacity: 0 },
];
const RIM_KF: Keyframe[] = [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }];
const CORNER_LINE = "1px solid rgba(139,164,255,0.38)";
const CORNERS: CSSProperties[] = [
  { top: 8, left: 8, borderTop: CORNER_LINE, borderLeft: CORNER_LINE },
  { top: 8, right: 8, borderTop: CORNER_LINE, borderRight: CORNER_LINE },
  { bottom: 8, left: 8, borderBottom: CORNER_LINE, borderLeft: CORNER_LINE },
  { bottom: 8, right: 8, borderBottom: CORNER_LINE, borderRight: CORNER_LINE },
];

function CardChrome({ index, rescanKey }: { index: number; rescanKey?: string }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const cornersRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const rimRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotionSafe();

  useRevealOnce(hostRef, (_h, red): FxStep[] => red
    ? [
        { el: rimRef.current, keyframes: RIM_KF, duration: 700, delay: 150 },
        { el: cornersRef.current, keyframes: [{ opacity: 0 }, { opacity: 0.6 }], duration: 400, delay: 150 },
      ]
    : [
        { el: layerRef.current, keyframes: SCAN_KF, duration: 1100, delay: 150, easing: CSS_EASE_IN_OUT },
        { el: cornersRef.current, keyframes: [{ opacity: 0 }, { opacity: 1, offset: 0.54 }, { opacity: 0.6 }], duration: 650, delay: 1150 },
      ]);

  // Nachmessen nach einem Filterwechsel; der erste Wert (kein Filter) loest nichts aus.
  const prevKeyRef = useRef(rescanKey);
  const animsRef = useRef<Animation[]>([]);
  useEffect(() => {
    if (prevKeyRef.current === rescanKey) return;
    prevKeyRef.current = rescanKey;
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = playSteps(reduced
      ? [{ el: rimRef.current, keyframes: RIM_KF, duration: 700, delay: index * 70 }]
      : [{ el: layerRef.current, keyframes: SCAN_KF, duration: 800, delay: index * 80, easing: CSS_EASE_IN_OUT }], reduced);
  }, [rescanKey, reduced, index]);
  useEffect(() => () => {
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];
  }, []);

  return (
    <span ref={hostRef} aria-hidden="true" className="fx-deco"
      style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none" }}>
      <span style={{ position: "absolute", top: -1, left: "14%", right: "14%", height: 1, background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.45), transparent)" }} />
      <span ref={cornersRef} style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
        {CORNERS.map((c, i) => (
          <span key={i} style={{ position: "absolute", width: 10, height: 10, ...c }} />
        ))}
      </span>
      <span style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden" }}>
        <span ref={layerRef} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "100%", opacity: 0 }}>
          <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.6) 18%, rgba(139,164,255,0.6) 82%, transparent)" }} />
          <span style={{ position: "absolute", left: 0, right: 0, bottom: 1, height: 56, background: "linear-gradient(180deg, transparent, rgba(139,164,255,0.07))" }} />
        </span>
      </span>
      <span ref={rimRef} style={{ position: "absolute", inset: 0, borderRadius: "inherit", boxShadow: "inset 0 0 0 1px rgba(139,164,255,0.6)", opacity: 0 }} />
    </span>
  );
}

// ─── Feldname in Worten (Souveraenitaets- und Transparenz-Matrix) ────────────
// Der Name wird synchron zur Ortung in der Matrix (MATRIX_T.quadName) freigelegt,
// eine Farbkante waechst mit, die Beschreibung folgt. Name, Beschreibung, Farbe
// und Feldzuordnung kommen unveraendert vom Aufrufer. Ohne Animation (Druck,
// verstecktes Tab) steht alles im Endzustand; sanfte Stufe: clip-path statt scaleY.
export function QuadrantReveal({ name, desc, color, nameStyle, descStyle }: {
  name: string; desc: string; color: string; nameStyle?: CSSProperties; descStyle?: CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  useRevealOnce(hostRef, (_h, reduced): FxStep[] => [
    {
      el: nameRef.current, duration: 600, delay: MATRIX_T.quadName, easing: CSS_EASE_IN_OUT,
      keyframes: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
    },
    {
      el: barRef.current, duration: 600, delay: MATRIX_T.quadName, easing: CSS_EASE_IN_OUT,
      keyframes: reduced
        ? [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }]
        : [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
    },
    { el: descRef.current, duration: 200, delay: MATRIX_T.quadDesc, keyframes: [{ opacity: 0 }, { opacity: 1 }] },
  ], { rebuildKey: name });
  return (
    <div ref={hostRef} style={{ position: "relative", paddingLeft: "14px" }}>
      <span ref={barRef} aria-hidden="true" className="fx-deco" style={{
        position: "absolute", left: 0, top: 4, height: "1.25em", width: 3, borderRadius: 2,
        background: `linear-gradient(180deg, ${color}, ${withAlpha(color, 0.2)})`,
        boxShadow: `0 0 12px ${withAlpha(color, 0.5)}`, transformOrigin: "top",
      }} />
      <div ref={nameRef} style={{
        fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(19px,2.2vw,25px)", fontWeight: 400, color,
        letterSpacing: "-0.015em", marginBottom: "12px", textShadow: `0 0 24px ${withAlpha(color, 0.35)}`,
        ...nameStyle,
      }}>
        {name}
      </div>
      <p ref={descRef} style={{
        fontFamily: "Inter, sans-serif", fontSize: "14.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.68)",
        maxWidth: "46ch", margin: 0, ...descStyle,
      }}>
        {desc}
      </p>
    </div>
  );
}
