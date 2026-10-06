// Vergleich mit den anderen Teilnahmen auf der Ergebnisseite: Filter, vier Faehigkeiten,
// Matrix, Kontinuitaet (Darstellung des frueheren Dashboards, Entscheid Adrian 06.10.2026).
//
// Liest ausschliesslich data/benchmark.json. Gefiltert wird nach genau einem Merkmal mit
// je zwei Gruppen; die Regeln stehen in data/benchmarkCore.ts.
import { useState, type ReactNode } from "react";
import ComparisonBand from "./ComparisonBand";
import { SovereigntyMatrix, QUAD_VIEW } from "./ResultVisuals";
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

const dimPublished = (d: DimKey) => {
  const def = DIMENSIONS.find((x) => x.key === d)!;
  return def.groups.every((g) => !!BENCHMARK.groups[groupId(d, g.key)]);
};

export default function ComparisonView({
  lang, own, matrixSide, ownNumbers = false, capNote, afterCaps, headingLevel = "h2",
}: Props) {
  const H = headingLevel;
  const [dim, setDim] = useState<DimKey | "all">("all");
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
  const posLine = (pos: Position | null, ownValue: number | null, f: (v: number) => string) => {
    const style = { fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "2px 0 0" };
    if (ownNumbers) {
      if (ownValue === null) return <p style={{ ...style, color: "#d9a559" }}>{p(CMP_TXT.ownNone)}</p>;
      return <p style={style}>{p(CMP_TXT.own)}: {f(ownValue)}{pos ? " · " + p(CMP_TXT.posShort[pos]) : ""}</p>;
    }
    return pos ? <p style={style}>{p(CMP_TXT.pos[pos])}</p> : null;
  };

  const bandDescribe = (label: string, q: Quant | null, f: (v: number) => string, ownValue: number | null = null) => [
    ...(ownValue !== null ? [`${p(CMP_TXT.own)}: ${f(ownValue)}`] : []),
    label,
    ...(q ? [`${p(CMP_TXT.median)}: ${f(q.p50)}`, `${p(CMP_TXT.band)}: ${f(q.p25)} ${bis} ${f(q.p75)}`] : []),
  ];

  const rowHead = (r: Row) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
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
  const ownOnly = (ownValue: number | null, band: BandSpec, f: (v: number) => string, rowLabel: string) => (
    <>
      <ComparisonBand min={band.min} max={band.max} ticks={band.ticks} q={null} own={ownValue} color={band.color}
        scale={band.scale} label={band.label} describe={[...bandDescribe(rowLabel, null, f, ownValue), p(CMP_TXT.noCmp)]} />
      {posLine(null, ownValue, f)}
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
  const fmtCap = (v: number) => fmtNum(v, lang);
  const fmtOwnCap = (v: number) => fmtNum(v, lang, 1);

  if (!rows.length) return null;

  return (
    <>
      {/* Filter: genau ein Merkmal */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "22px" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{p(CMP_TXT.filter)}:</span>
        {(["all", ...DIMENSIONS.map((d) => d.key)] as (DimKey | "all")[]).map((k) => {
          const ok = k === "all" || dimPublished(k);
          const active = ok && dim === k;
          const label = k === "all" ? p(CMP_TXT.allTab) : p(DIMENSIONS.find((d) => d.key === k)!.label);
          return (
            <button key={k} type="button" disabled={!ok} aria-pressed={active} onClick={() => setDim(k)}
              title={ok ? undefined : p(CMP_TXT.notYet)}
              style={{
                fontFamily: "Inter, sans-serif", fontSize: "13px", padding: "6px 13px", borderRadius: "999px",
                border: `1px solid ${active ? "rgba(139,164,255,0.7)" : "rgba(255,255,255,0.14)"}`,
                background: active ? "rgba(75,110,255,0.16)" : "transparent",
                color: ok ? (active ? "#fff" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.32)",
                cursor: ok ? "pointer" : "not-allowed",
              }}>
              {label}{ok ? "" : ` · ${p(CMP_TXT.notYet)}`}
            </button>
          );
        })}
      </div>
      {/* Gruppen der aktuellen Ansicht, einmal oben statt in jeder Zeile */}
      <div style={{ display: "flex", gap: "8px 22px", flexWrap: "wrap", alignItems: "baseline", margin: "-8px 0 22px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}>
        {rows.map((r) => (
          <span key={r.id}>
            {r.tag ? <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{r.tag} </strong> : null}
            {r.label}
          </span>
        ))}
      </div>

      {/* Vier Faehigkeiten */}
      <div style={{ ...card, marginBottom: "20px" }}>
        <H style={h2}>{p(CMP_TXT.capHead)}</H>
        <p style={lead}>{p(CMP_TXT.capLead)}{mine ? " " + p(CMP_TXT.ownLegend) : ""}</p>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "26px 36px" }}>
          {CAPACITIES.map((c) => (
            <div key={c.key}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: c.color }} />
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
                return (
                  <div key={r.id} style={{ marginBottom: "8px" }}>
                    {rowHead(r)}
                    {q ? (
                      <>
                        <ComparisonBand min={1} max={7} ticks={[1, 2, 3, 4, 5, 6, 7]} q={q} own={ownValue} color={c.color}
                          scale={i === rows.length - 1 ? ["1", "7"] : undefined}
                          label={lang === "en" ? c.label.en : c.label.de}
                          describe={bandDescribe(r.label, q, fmtCap, ownValue)} />
                        {r.isOwn && mine && posLine(positionOf(ownValue, q, capStepOf(r.block)), ownValue, fmtOwnCap)}
                      </>
                    ) : ownNumbers && mine && r.isOwn ? (
                      <>
                        {ownOnly(ownValue, {
                          min: 1, max: 7, ticks: [1, 2, 3, 4, 5, 6, 7], color: c.color,
                          scale: i === rows.length - 1 ? ["1", "7"] : undefined, label: lang === "en" ? c.label.en : c.label.de,
                        }, fmtOwnCap, r.label)}
                        {noValue}
                      </>
                    ) : noValue}
                  </div>
                );
              })}
              {ownNumbers && mine && !ownInRows && posLine(null, mine.cap[c.key], fmtOwnCap)}
            </div>
          ))}
        </div>
      </div>
      {afterCaps}

      {/* Matrix */}
      <div style={{ ...card, marginBottom: "20px" }}>
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
              <div style={{ marginBottom: "14px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>
                {p(CMP_TXT.own)}: Reconfiguration Discretion {fmtPct(mine.ftc)} · Operational Control {fmtPct(mine.cto)}
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{p(CMP_TXT.ownMatrix)}</div>
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} style={{ marginBottom: "12px" }}>
                {rowHead(r)}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  {r.block.ftc && r.block.cto
                    ? `Reconfiguration Discretion ${fmtPct(r.block.ftc.p50)} · Operational Control ${fmtPct(r.block.cto.p50)} (${p(CMP_TXT.median)})`
                    : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kontinuitaet als Tacho: Nadel = eigener Wert, Boegen = mittlere Haelfte der Gruppen */}
      <div style={{ ...card, marginBottom: "20px" }}>
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
                {rowHead(r)}
                {r.block.cont ? (
                  <>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
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
      </div>

      {/* Transparenz-Matrix: Transparenz gegen Durchschnitt der Faehigkeiten */}
      <div style={{ ...card, marginBottom: "20px" }}>
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
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(18px,2vw,23px)", color: TRA_QUAD[ownTraQuad].color, marginBottom: "8px" }}>
                  {p(TRA_QUAD[ownTraQuad].name)}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.68)", maxWidth: "46ch", margin: 0 }}>
                  {p(TRA_QUAD[ownTraQuad].desc)}
                </p>
              </div>
            )}
            {mine && (
              <div style={{ marginBottom: "14px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>
                {traOldCode
                  ? `${p(CMP_TXT.own)}: ${p(AXIS_AVG)} ${ownAvg === null ? "–" : fmtAvg(ownAvg, lang)} · ${p(CMP_TXT.traOld)}`
                  : `${p(CMP_TXT.own)}: ${p(AXIS_TRA)} ${ownTra === null ? "–" : fmtPct(ownTra)} · ${p(AXIS_AVG)} ${ownAvg === null ? "–" : fmtAvg(ownAvg, lang)}`}
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} style={{ marginBottom: "12px" }}>
                {rowHead(r)}
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  {r.block.tra && r.block.avg
                    ? `${p(AXIS_TRA)} ${fmtPct(r.block.tra.p50)} · ${p(AXIS_AVG)} ${fmtNum(r.block.avg.p50, lang)} (${p(CMP_TXT.median)})`
                    : p(ownNumbers ? CMP_TXT.noCmp : CMP_TXT.noValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  );
}
