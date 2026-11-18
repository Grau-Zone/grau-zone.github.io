// Vergleich mit den anderen Teilnahmen auf der Ergebnisseite: Filter, vier Faehigkeiten,
// Matrix, Kontinuitaet (Darstellung des frueheren Dashboards, Entscheid Adrian 06.10.2026).
//
// Liest ausschliesslich data/benchmark.json. Gefiltert wird nach genau einem Merkmal mit
// je zwei Gruppen; die Regeln stehen in data/benchmarkCore.ts.
//
// Redesign: Die vier Auswertungen sind ein Beweisabschnitt auf dem tiefen Gruen (rv-panel,
// mit leise treibenden Linien im Kopf), keine Kartenreihe. Jede Auswertung ist ein Block mit
// Haarlinie, die sich beim ersten Sichtkontakt in Mint zeichnet, einer Ueberschrift, deren
// Woerter einzeln aufsteigen, und Diagrammen in feiner Linienzeichnung. Die Faehigkeiten sind
// eine Tabelle mit Haarlinien (Name links, Baender rechts), die drei Diagramme stehen
// abwechselnd rechts und links neben ihrem Text. Steht die Ansicht schon in einem Abschnitt
// mit rx-deep, entfallen Flaeche und Rand (CSS), die Inhalte bleiben gleich.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import ComparisonBand from "./ComparisonBand";
import { SovereigntyMatrix, QUAD_VIEW, useRevealOnce } from "./ResultVisuals";
import TransparencyMatrix from "./TransparencyMatrix";
import ContinuityGauge from "./ContinuityGauge";
import { TRA_QUAD, AXIS_TRA, AXIS_AVG, fmtAvg } from "../data/transparencyView";
import { CAPACITIES, type CapacityKey } from "../data/capacityItems";
import { BENCHMARK, fmtNum, fmtPct } from "../data/benchmark";
import { ALL, DIMENSIONS, groupId, type DimKey } from "../data/benchmarkGroups";
import { positionOf, capStepOf, CTX_STEP, type GroupBlock, type Quant, type Position } from "../data/benchmarkCore";
import type { Lang } from "../data/instrument";
import { capacityAverage, transparencyQuadrant, type QuadKey, type RespondentScores } from "../data/scoring";
import { AmbientField } from "@/rx/AmbientField";
import { CSS_EASE_OUT, DUR, EASE_OUT, Ping, useReducedMotionSafe } from "./fx";
import { BAND_T, CountText, MATRIX_T, ResultFxStyles, RiseWords, V, playSteps, type FxStep } from "./resultfx";

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

/** Hervorgehobenes Wort je Ueberschrift (ein Wort in Mint, siehe RiseWords). */
const CMP_EM = {
  capHead: t("capacities", "Fähigkeiten"),
  matrixHead: t("sovereignty", "Souveränität"),
  contHead: t("disruption", "Anbieterstörungen"),
  traHead: t("Transparency", "Transparenz"),
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
  /** Inhalt direkt unter der Tabelle "Vier Faehigkeiten" (Ergebnisseite: Zusammenfassung der beantworteten Fragen). */
  afterCaps?: ReactNode;
  /** Ueberschriften der Bloecke; auf der Ergebnisseite eine Ebene tiefer als der Seitentitel. */
  headingLevel?: "h2" | "h3";
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
  const mine = own?.scores ?? null;

  // Treibende Linien im Kopf des Abschnitts, nur wenn er selbst die tiefgruene Flaeche stellt
  // (steht er in einem rx-deep der Seite, liegt dort schon ein Feld).
  const panelRef = useRef<HTMLDivElement>(null);
  const [ambient, setAmbient] = useState(false);
  useEffect(() => {
    if (!panelRef.current?.parentElement?.closest(".rx-deep")) setAmbient(true);
  }, []);

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
  // opts.dot: Marke wie der eigene Punkt im Band darueber (nur Deko).
  // opts.count: die Zahl zaehlt beim ersten Entree synchron zum Punkt im Band hoch;
  // der Endwert steht immer im DOM, Screenreader lesen nur ihn, nach einem
  // Filterwechsel zaehlt nichts mehr.
  const posLine = (
    pos: Position | null, ownValue: number | null, f: (v: number) => string,
    opts?: { dot?: boolean; count?: { delayMs: number } },
  ) => {
    if (ownNumbers) {
      if (ownValue === null) return <p className="rv-warn">{p(CMP_TXT.ownNone)}</p>;
      const count = opts?.count;
      return (
        <p className="rv-pos">
          {opts?.dot && <span aria-hidden="true" className="rv-dot" />}
          <span>{p(CMP_TXT.own)}:</span>{" "}
          <span className="rv-fig">
            {count ? (
              <CountText from={1} to={ownValue} format={f} final={f(ownValue)} delayMs={count.delayMs}
                durMs={BAND_T.countDur} enabled={!filtered} hostClosest="[data-rfx-row]" />
            ) : f(ownValue)}
          </span>
          {pos ? <>{" "}<span>{"· " + p(CMP_TXT.posShort[pos])}</span></> : null}
        </p>
      );
    }
    return pos ? <p className="rv-pos">{p(CMP_TXT.pos[pos])}</p> : null;
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
    <div className="rv-rowhead">
      {dash && r.tag && (
        <svg aria-hidden="true" width="20" height="6" style={{ display: "inline-block", verticalAlign: "1px" }}>
          <line x1="1" y1="3" x2="19" y2="3" stroke={V.ink} strokeWidth="1.4"
            strokeDasharray={r.tag === "B" ? "4 3" : undefined} />
        </svg>
      )}
      {r.tag && <span className="rv-tag">{r.tag}</span>}
      <span className="rv-rowlabel">{r.label}</span>
      {mine && r.tag && r.isOwn && <span className="rv-chip">{p(CMP_TXT.ownGroup)}</span>}
    </div>
  );

  // Fehlen der Gruppe Werte: ohne ownNumbers wie frueher auf dem Dashboard, mit ownNumbers als
  // Luecke im Vergleich benannt (die eigenen Antworten sind ja vollstaendig).
  const noValue = <p className="rv-note">{p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}</p>;
  // Auf der Ergebnisseite bleibt der eigene Wert immer sichtbar: auch wenn der eigenen
  // Gruppe Vergleichswerte fehlen, und auch wenn man zu keiner der zwei Gruppen gehoert.
  const ownInRows = rows.some((r) => r.isOwn);
  type BandSpec = { min: number; max: number; ticks: number[]; color: string; scale?: [string, string]; label: string };
  const ownOnly = (
    ownValue: number | null, band: BandSpec, f: (v: number) => string, rowLabel: string,
    revealDelay?: number, mode?: "enter" | "remeasure",
    lineOpts?: { dot?: boolean; count?: { delayMs: number } },
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

  const rescanKey = filtered ? dim : undefined;
  const title = (head: T, em: T) => (
    <H className="rv-h"><RiseWords text={p(head)} em={p(em)} /></H>
  );
  const num = (s: string) => <span className="rv-num">{s}</span>;

  return (
    <>
      <ResultFxStyles />
      <div ref={panelRef} className="rv-panel rv-deep">
        {ambient && (
          <div aria-hidden="true" className="rv-ambient fx-deco">
            <AmbientField />
          </div>
        )}
        <div className="rv-inner">
          {/* Filter: genau ein Merkmal */}
          <div className="rv-controls">
            <span className="rv-flabel">{p(CMP_TXT.filter)}:</span>
            <div className="rfx-rail">
              {(["all", ...DIMENSIONS.map((d) => d.key)] as (DimKey | "all")[]).map((k) => {
                const ok = k === "all" || dimPublished(k);
                const active = ok && dim === k;
                const label = k === "all" ? p(CMP_TXT.allTab) : p(DIMENSIONS.find((d) => d.key === k)!.label);
                return (
                  <button key={k} type="button" disabled={!ok} aria-pressed={active}
                    onClick={() => { if (k !== dim) { setDim(k); setFiltered(true); setPingN((n) => n + 1); } }}
                    title={ok ? undefined : p(CMP_TXT.notYet)}
                    className={ok ? "fx-press rfx-pill" : "rfx-pill"}>
                    {/* Aktiver Schlitten gleitet zwischen den Pillen (layoutId).
                        Sanfte Stufe: keine Fahrt, der Schlitten blendet am Ziel ein und am alten Platz aus. */}
                    {reduced ? (
                      <AnimatePresence initial={false}>
                        {active && (
                          <motion.span key="cmp-filter" aria-hidden="true" className="rfx-sled"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: DUR.fade, ease: EASE_OUT }} />
                        )}
                      </AnimatePresence>
                    ) : active && (
                      <motion.span layoutId="cmp-filter" aria-hidden="true" className="rfx-sled"
                        transition={{ type: "spring", duration: 0.35, bounce: 0.1 }} />
                    )}
                    <span className="rfx-pill-in">
                      {/* Signalpunkt: Marke am gewaehlten Reiter, ein Ping beim Wechsel (nur Deko). */}
                      <span aria-hidden="true" className="fx-deco rfx-dot">
                        <Ping play={active ? pingN : 0} color={V.accent} size={6} scale={3.2} duration={0.7} />
                      </span>
                      <span>{label}{ok ? "" : ` · ${p(CMP_TXT.notYet)}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Gruppen der aktuellen Ansicht, einmal oben statt in jeder Zeile */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={dim} className="rv-legend" variants={LEGEND_VARIANTS} initial="h" animate="s" exit="x">
              {rows.map((r) => (
                <motion.span key={r.id} variants={LEGEND_ITEM}>
                  {r.tag ? <span className="rv-tag">{r.tag}</span> : null}
                  {r.tag ? " " : null}
                  {r.label}
                </motion.span>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="rv-blocks">
            {/* Vier Faehigkeiten: Tabelle mit Haarlinien, Name links, Baender rechts */}
            <div className="rv-block">
              <BlockRule index={0} rescanKey={rescanKey} />
              <div className="rv-head2">
                {title(CMP_TXT.capHead, CMP_EM.capHead)}
                <p className="rv-lead">{p(CMP_TXT.capLead)}{mine ? " " + p(CMP_TXT.ownLegend) : ""}</p>
              </div>
              {/* Bei einem Filterwechsel nur Crossfade der Zeilen (key je Merkmal), nie Zwischenwerte */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={dim} className="rv-caps"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } }}
                  exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}>
                  {CAPACITIES.map((c, ci) => {
                    const capLabel = lang === "en" ? c.label.en : c.label.de;
                    return (
                      <div key={c.key} className="rv-cap">
                        <div className="rv-cap-name">
                          <span className="rv-cap-title">
                            <span aria-hidden="true" className="rv-dot" />
                            <span>{capLabel}</span>
                          </span>
                          {capNote && <span className="rv-cap-note">{capNote(c.key)}</span>}
                        </div>
                        <div>
                          {rows.map((r, i) => {
                            const q = r.block.cap[c.key];
                            const ownValue = mine ? mine.cap[c.key] : null;
                            // Entree: gestaffelt je Faehigkeit und Zeile; nach einem Filterwechsel
                            // kurzes Nachmessen der neuen Gruppe (ohne Zaehlen).
                            const revealDelay = filtered ? ci * 0.03 + i * 0.02 : ci * 0.09 + i * 0.06;
                            const revealMode = filtered ? "remeasure" : "enter";
                            const lineOpts = { dot: true, count: { delayMs: revealDelay * 1000 + BAND_T.dot } };
                            return (
                              <div key={r.id} data-rfx-row="" style={{ marginBottom: "1.1rem" }}>
                                {rowHead(r)}
                                {q ? (
                                  <>
                                    <ComparisonBand min={1} max={7} ticks={[1, 2, 3, 4, 5, 6, 7]} q={q} own={ownValue} color={V.accent}
                                      scale={i === rows.length - 1 ? ["1", "7"] : undefined}
                                      label={capLabel}
                                      describe={bandDescribe(r.label, q, fmtCap, ownValue)}
                                      revealDelay={revealDelay} revealMode={revealMode} />
                                    {r.isOwn && mine && posLine(positionOf(ownValue, q, capStepOf(r.block)), ownValue, fmtOwnCap, lineOpts)}
                                  </>
                                ) : ownNumbers && mine && r.isOwn ? (
                                  <>
                                    {ownOnly(ownValue, {
                                      min: 1, max: 7, ticks: [1, 2, 3, 4, 5, 6, 7], color: V.accent,
                                      scale: i === rows.length - 1 ? ["1", "7"] : undefined, label: capLabel,
                                    }, fmtOwnCap, r.label, revealDelay, revealMode, lineOpts)}
                                    {noValue}
                                  </>
                                ) : noValue}
                              </div>
                            );
                          })}
                          {ownNumbers && mine && !ownInRows && posLine(null, mine.cap[c.key], fmtOwnCap)}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
              {afterCaps && <div className="rv-after">{afterCaps}</div>}
            </div>

            {/* Matrix: Text links, Diagramm rechts */}
            <div className="rv-block">
              <BlockRule index={1} rescanKey={rescanKey} />
              <div className="rv-split">
                <div className="rv-text">
                  {title(CMP_TXT.matrixHead, CMP_EM.matrixHead)}
                  <p className="rv-lead">{p(CMP_TXT.matrixLead)}{quadShares ? " " + p(CMP_TXT.shares) : ""}</p>
                  <div style={{ marginTop: "1.75rem" }}>
                    {matrixSide}
                    {mine?.ftc != null && mine?.cto != null && (
                      <p className="rv-own">
                        {p(CMP_TXT.own)}: Reconfiguration Discretion {num(fmtPct(mine.ftc))} · Operational Control {num(fmtPct(mine.cto))}
                        <small>{p(CMP_TXT.ownMatrix)}</small>
                      </p>
                    )}
                    <div>
                      {rows.map((r) => (
                        <div key={r.id} className="rv-group">
                          {rowHead(r, dashMx)}
                          <p className="rv-data">
                            {r.block.ftc && r.block.cto
                              ? `Reconfiguration Discretion ${fmtPct(r.block.ftc.p50)} · Operational Control ${fmtPct(r.block.cto.p50)} (${p(CMP_TXT.median)})`
                              : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rv-chart">
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
              </div>
            </div>

            {/* Kontinuitaet als Tacho: Nadel = eigener Wert, Boegen = mittlere Haelfte der Gruppen */}
            <div className="rv-block">
              <BlockRule index={2} rescanKey={rescanKey} />
              <div className="rv-split rv-split--flip">
                <div className="rv-text">
                  {title(CMP_TXT.contHead, CMP_EM.contHead)}
                  <p className="rv-lead">{p(CMP_TXT.contLead)} {p(CMP_TXT.contGauge)}</p>
                  <div style={{ marginTop: "1.75rem" }}>
                    <div>
                      {rows.map((r) => (
                        <div key={r.id} className="rv-group">
                          {rowHead(r, dashCont)}
                          {r.block.cont ? (
                            <>
                              <p className="rv-data">
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
                    </div>
                    {ownNumbers && mine && !ownInRows && posLine(null, mine.cont, fmtPct)}
                  </div>
                </div>
                <div className="rv-chart">
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
              </div>
            </div>

            {/* Transparenz-Matrix: Transparenz gegen Durchschnitt der Faehigkeiten */}
            <div className="rv-block">
              <BlockRule index={3} rescanKey={rescanKey} />
              <div className="rv-split">
                <div className="rv-text">
                  {title(CMP_TXT.traHead, CMP_EM.traHead)}
                  <p className="rv-lead">{p(CMP_TXT.traLead)}</p>
                  <div style={{ marginTop: "1.75rem" }}>
                    {/* Eigenes Feld in Worten, wie "Wo Sie stehen" bei der Souveraenitaets-Matrix */}
                    {ownTraQuad && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <QuadrantReveal name={p(TRA_QUAD[ownTraQuad].name)} desc={p(TRA_QUAD[ownTraQuad].desc)} color={TRA_QUAD[ownTraQuad].color} />
                      </div>
                    )}
                    {mine && (
                      <p className="rv-own">
                        {traOldCode ? (
                          <>{p(CMP_TXT.own)}: {p(AXIS_AVG)} {ownAvg === null ? "–" : num(fmtAvg(ownAvg, lang))} · {p(CMP_TXT.traOld)}</>
                        ) : (
                          <>{p(CMP_TXT.own)}: {p(AXIS_TRA)} {ownTra === null ? "–" : num(fmtPct(ownTra))} · {p(AXIS_AVG)} {ownAvg === null ? "–" : num(fmtAvg(ownAvg, lang))}</>
                        )}
                      </p>
                    )}
                    <div>
                      {rows.map((r) => (
                        <div key={r.id} className="rv-group">
                          {rowHead(r, dashTra)}
                          <p className="rv-data">
                            {r.block.tra && r.block.avg
                              ? `${p(AXIS_TRA)} ${fmtPct(r.block.tra.p50)} · ${p(AXIS_AVG)} ${fmtNum(r.block.avg.p50, lang)} (${p(CMP_TXT.median)})`
                              : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rv-chart">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Haarlinie am Kopf jedes Blocks ──────────────────────────────────────────
// Rein dekorativ (aria-hidden): Beim ersten Sichtkontakt zeichnet sich eine Mint-Linie von
// links ueber die Haarlinie des Blocks und bleibt stehen (Endzustand: Linie voll gezogen).
// Sanfte Stufe: clip-path-Wipe statt scaleX. Nach einem Filterwechsel zeichnet sich die Linie
// kurz erneut (je Block leicht versetzt). Im Druck bleibt nur die Haarlinie des Blocks.
const RULE_KF: Keyframe[] = [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }];
const RULE_KF_SOFT: Keyframe[] = [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }];

function BlockRule({ index, rescanKey }: { index: number; rescanKey?: string }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();

  useRevealOnce(hostRef, (_h, red): FxStep[] => [
    { el: lineRef.current, keyframes: red ? RULE_KF_SOFT : RULE_KF, duration: 1300, delay: 120 + index * 40, easing: CSS_EASE_OUT },
  ]);

  // Nachzeichnen nach einem Filterwechsel; der erste Wert (kein Filter) loest nichts aus.
  const prevKeyRef = useRef(rescanKey);
  const animsRef = useRef<Animation[]>([]);
  useEffect(() => {
    if (prevKeyRef.current === rescanKey) return;
    prevKeyRef.current = rescanKey;
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = playSteps([
      { el: lineRef.current, keyframes: reduced ? RULE_KF_SOFT : RULE_KF, duration: 900, delay: index * 80, easing: CSS_EASE_OUT },
    ], reduced);
  }, [rescanKey, reduced, index]);
  useEffect(() => () => {
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];
  }, []);

  return (
    <span ref={hostRef} aria-hidden="true" className="fx-deco rv-rule">
      <i ref={lineRef} />
    </span>
  );
}

// ─── Feldname in Worten (Souveraenitaets- und Transparenz-Matrix) ────────────
// Der Name wird synchron zur Ortung in der Matrix (MATRIX_T.quadName) freigelegt,
// eine Farbmarke wachsen mit (die Farbe des Feldes, nur als schmaler Balken), die Beschreibung
// folgt. Name, Beschreibung, Farbe und Feldzuordnung kommen unveraendert vom Aufrufer. Der Name
// steht in der Schriftfarbe des Grundes, die Feldfarbe nur im Balken (sie waere als Text auf
// Weiss nicht lesbar). Ohne Animation (Druck, verstecktes Tab) steht alles im Endzustand;
// sanfte Stufe: clip-path statt scaleY.
export function QuadrantReveal({ name, desc, color, nameStyle, descStyle }: {
  name: string; desc: string; color: string; nameStyle?: CSSProperties; descStyle?: CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  useRevealOnce(hostRef, (_h, reduced): FxStep[] => [
    {
      el: nameRef.current, duration: 600, delay: MATRIX_T.quadName, easing: CSS_EASE_OUT,
      keyframes: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
    },
    {
      el: barRef.current, duration: 600, delay: MATRIX_T.quadName, easing: CSS_EASE_OUT,
      keyframes: reduced
        ? [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }]
        : [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
    },
    { el: descRef.current, duration: 200, delay: MATRIX_T.quadDesc, keyframes: [{ opacity: 0 }, { opacity: 1 }] },
  ], { rebuildKey: name });
  return (
    <div ref={hostRef} className="rv-quad">
      <span ref={barRef} aria-hidden="true" className="fx-deco rv-quad-bar" style={{ background: color }} />
      <div ref={nameRef} className="rv-quad-name" style={nameStyle}>
        {name}
      </div>
      <p ref={descRef} className="rv-quad-desc" style={descStyle}>
        {desc}
      </p>
    </div>
  );
}
