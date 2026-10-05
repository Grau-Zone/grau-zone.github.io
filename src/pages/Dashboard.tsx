// Oeffentliches Dashboard: zusammengefasste Vergleichswerte aller Teilnahmen.
//
// Liest ausschliesslich data/benchmark.json (Schnappschuss, nur Quartile und
// Spannen). Die Seite kann die Datenbank nicht lesen. Gefiltert wird nach genau
// einem Merkmal mit je zwei Gruppen; die Regeln stehen in data/benchmarkCore.ts.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";
import ComparisonBand from "../components/ComparisonBand";
import { SovereigntyMatrix } from "../components/ResultVisuals";
import { CAPACITIES } from "../data/capacityItems";
import { BENCHMARK, hasBenchmark, fmtAsOf, fmtNum, fmtPct, isSmall } from "../data/benchmark";
import { ALL, DIMENSIONS, LABEL_LISTS, groupId, type DimKey } from "../data/benchmarkGroups";
import type { GroupBlock, Quant } from "../data/benchmarkCore";
import type { Lang } from "../data/instrument";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

const TXT = {
  back: t("Back to home", "Zurück zur Startseite"),
  eyebrow: t("Sovereignty Radar", "Sovereignty Radar"),
  title: t("Comparison values", "Vergleichswerte"),
  lead: t(
    "How do organisations assess their room for manoeuvre towards important digital providers? Interim results from the self-assessment: self-assessments, not representative.",
    "Wie schätzen Organisationen ihren Handlungsspielraum gegenüber wichtigen digitalen Anbietern ein? Zwischenstand aus dem Self-Assessment: Selbsteinschätzungen, nicht repräsentativ."
  ),
  stand: t("As of {d} · {n} participations · groups of at least {k}", "Stand {d} · {n} Teilnahmen · Gruppen ab {k}"),
  emptyTitle: t("No comparison values yet", "Noch keine Vergleichswerte"),
  emptyText: t(
    "They will appear here as soon as enough participations are available. Every participation helps.",
    "Sie erscheinen hier, sobald genügend Teilnahmen vorliegen. Jede Teilnahme hilft."
  ),
  toAssessment: t("Go to the self-assessment", "Zum Self-Assessment"),
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
  median: t("Median", "Median"),
  band: t("middle half", "mittlere Hälfte"),
  size: t("{a} to {b} participations", "{a} bis {b} Teilnahmen"),
  sizeAll: t("{n} participations", "{n} Teilnahmen"),
  small: t("small group, values can still shift", "kleine Gruppe, Werte können sich noch verschieben"),
  noValue: t("not enough valid answers", "zu wenige gültige Antworten"),
  table: t("Show as table", "Als Tabelle anzeigen"),
  group: t("Group", "Gruppe"),
  measure: t("Measure", "Kennzahl"),
  methodHead: t("How the values are produced", "So entstehen die Werte"),
  method: [
    t(
      "All values are self-assessments of the participating organisations for one function and one provider. They are not representative.",
      "Alle Werte sind Selbsteinschätzungen der teilnehmenden Organisationen für eine Funktion und einen Anbieter. Sie sind nicht repräsentativ."
    ),
    t(
      "Published are rounded quartiles (median and middle half), the total number of participations, group sizes as ranges and, from ten participations, the share per quadrant. No means, no minima or maxima.",
      "Veröffentlicht werden gerundete Quartile (Median und mittlere Hälfte), die Gesamtzahl der Teilnahmen, Gruppengrössen als Spanne und ab zehn Teilnahmen der Anteil je Quadrant. Keine Mittelwerte, keine Minima oder Maxima."
    ),
    t(
      "A group appears from two participations. Grouping is coarse, by one characteristic at a time, never by provider. Small groups appear in only one characteristic at a time.",
      "Eine Gruppe erscheint ab zwei Teilnahmen. Gruppiert wird grob, nach jeweils einem Merkmal, nie nach Anbieter. Kleine Gruppen erscheinen nur in einem Merkmal gleichzeitig."
    ),
    t(
      "In groups of two or three participations, individual values can be derived from the quartiles. Which organisation they belong to is not apparent.",
      "In Gruppen aus zwei oder drei Teilnahmen lassen sich aus den Quartilen Einzelwerte ableiten. Welcher Organisation sie gehören, ist daraus nicht ersichtlich."
    ),
    t(
      "The values are calculated by hand from an export of the database and published with a date. This page cannot read the database.",
      "Die Werte werden von Hand aus einem Export der Datenbank berechnet und mit Datum veröffentlicht. Diese Seite kann die Datenbank nicht lesen."
    ),
  ],
  groupsHead: t("Which categories belong to which group", "Welche Kategorien zu welcher Gruppe gehören"),
  privacy: t("More on data protection", "Mehr zum Datenschutz"),
};

const SOURCE: Record<DimKey, keyof typeof LABEL_LISTS> = { branche: "industry", groesse: "size", funktion: "fn", sitz: "hq" };
const CONT_COLOR = "#6cc2b5";

function initialLang(): Lang {
  try {
    const v = JSON.parse(localStorage.getItem("cds13-lang") || "null");
    return v === "en" ? "en" : "de";
  } catch {
    return "de";
  }
}

const Dashboard = () => {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [dim, setDim] = useState<DimKey | "all">("all");
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const fill = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce((acc, [k, v]) => acc.replace("{" + k + "}", String(v)), s);
  const bis = lang === "de" ? "bis" : "to";

  const ready = hasBenchmark();
  const dimPublished = (d: DimKey) => {
    const def = DIMENSIONS.find((x) => x.key === d)!;
    return def.groups.every((g) => !!BENCHMARK.groups[groupId(d, g.key)]);
  };

  // Zeilen fuer die gewaehlte Ansicht: "Alle" oder die zwei Gruppen eines Merkmals.
  const rows: { id: string; label: string; tag?: string; block: GroupBlock }[] = (() => {
    if (!ready) return [];
    if (dim === "all" || !dimPublished(dim)) return [{ id: ALL, label: p(TXT.all), block: BENCHMARK.groups[ALL] }];
    const def = DIMENSIONS.find((x) => x.key === dim)!;
    return def.groups.map((g, i) => ({
      id: groupId(dim, g.key), label: p(g.label), tag: i === 0 ? "A" : "B", block: BENCHMARK.groups[groupId(dim, g.key)],
    }));
  })();

  const sizeText = (b: GroupBlock) =>
    b.n !== undefined ? fill(p(TXT.sizeAll), { n: b.n }) : b.nBand ? fill(p(TXT.size), { a: b.nBand[0], b: b.nBand[1] }) : "";

  const bandDescribe = (label: string, q: Quant | null, f: (v: number) => string) =>
    q ? [label, `${p(TXT.median)}: ${f(q.p50)}`, `${p(TXT.band)}: ${f(q.p25)} ${bis} ${f(q.p75)}`] : [label];

  const rowHead = (r: (typeof rows)[number]) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
      {r.tag && (
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "4px", padding: "0 5px" }}>
          {r.tag}
        </span>
      )}
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>{r.label}</span>
    </div>
  );

  // Gruppen der aktuellen Ansicht mit Groesse, einmal oben statt in jeder Zeile.
  const groupLegend = (
    <div style={{ display: "flex", gap: "8px 22px", flexWrap: "wrap", alignItems: "baseline", margin: "-8px 0 22px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}>
      {rows.map((r) => (
        <span key={r.id}>
          {r.tag ? <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{r.tag} </strong> : null}
          {r.label}: {sizeText(r.block)}
        </span>
      ))}
      {rows.some((r) => isSmall(r.block)) && <span style={{ color: "rgba(255,255,255,0.55)" }}>{p(TXT.small)}</span>}
    </div>
  );

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "22px 24px",
  };
  const h2: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "18px", color: "white", margin: "0 0 4px" };
  const lead: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: "0 0 18px" };

  const quadShares = dim === "all" || !rows[0]?.tag ? BENCHMARK.groups[ALL]?.quad : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "hsl(228 45% 4%)" }}>
      {/* Kopfzeile wie im Impressum */}
      <div className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "rgba(5,6,18,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-6 gap-4">
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
            <RadarMark size={28} />
            <span className="text-sm font-semibold text-white hidden sm:inline" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sovereignty Radar
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div role="group" aria-label="Sprache / Language" className="flex gap-1">
              {(["de", "en"] as Lang[]).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: "12px", padding: "3px 8px", borderRadius: "6px",
                    border: "1px solid " + (lang === l ? "rgba(139,164,255,0.6)" : "rgba(255,255,255,0.12)"),
                    background: lang === l ? "rgba(75,110,255,0.15)" : "transparent",
                    color: lang === l ? "#fff" : "rgba(255,255,255,0.55)", cursor: "pointer",
                  }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textDecoration: "none" }}>
              <ArrowLeft size={15} /> <span className="hidden sm:inline">{p(TXT.back)}</span>
            </Link>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto px-6" style={{ paddingTop: "120px", paddingBottom: "80px" }}>
        <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {p(TXT.eyebrow)}
        </span>
        <h1 className="text-4xl lg:text-5xl font-semibold text-white mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}>
          {p(TXT.title)}
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.65)", maxWidth: "70ch", margin: "0 0 10px" }}>
          {p(TXT.lead)}
        </p>
        {ready && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>
            {fill(p(TXT.stand), { d: fmtAsOf(BENCHMARK.asOf, lang), n: BENCHMARK.nTotal ?? 0, k: BENCHMARK.kMin })}
          </p>
        )}

        {!ready ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
            <h2 style={h2}>{p(TXT.emptyTitle)}</h2>
            <p style={{ ...lead, margin: "6px auto 22px", maxWidth: "52ch" }}>{p(TXT.emptyText)}</p>
            <Link to="/assessment" style={{
              display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 22px", borderRadius: "10px",
              background: "rgba(75,110,255,0.12)", border: "1px solid rgba(139,164,255,0.34)", color: "#a8bcff",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, textDecoration: "none",
            }}>
              {p(TXT.toAssessment)} <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            {/* Filter: genau ein Merkmal */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "22px" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{p(TXT.filter)}:</span>
              {(["all", ...DIMENSIONS.map((d) => d.key)] as (DimKey | "all")[]).map((k) => {
                const ok = k === "all" || dimPublished(k);
                const active = ok && dim === k;
                const label = k === "all" ? p(TXT.allTab) : p(DIMENSIONS.find((d) => d.key === k)!.label);
                return (
                  <button key={k} type="button" disabled={!ok} aria-pressed={active} onClick={() => setDim(k)}
                    title={ok ? undefined : p(TXT.notYet)}
                    style={{
                      fontFamily: "Inter, sans-serif", fontSize: "13px", padding: "6px 13px", borderRadius: "999px",
                      border: `1px solid ${active ? "rgba(139,164,255,0.7)" : "rgba(255,255,255,0.14)"}`,
                      background: active ? "rgba(75,110,255,0.16)" : "transparent",
                      color: ok ? (active ? "#fff" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.32)",
                      cursor: ok ? "pointer" : "not-allowed",
                    }}>
                    {label}{ok ? "" : ` · ${p(TXT.notYet)}`}
                  </button>
                );
              })}
            </div>
            {groupLegend}

            {/* Vier Faehigkeiten */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.capHead)}</h2>
              <p style={lead}>{p(TXT.capLead)}</p>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "26px 36px" }}>
                {CAPACITIES.map((c) => (
                  <div key={c.key}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: c.color }} />
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.9)" }}>
                        {lang === "en" ? c.label.en : c.label.de}
                      </span>
                    </div>
                    {rows.map((r, i) => {
                      const q = r.block.cap[c.key];
                      return (
                        <div key={r.id} style={{ marginBottom: "8px" }}>
                          {rowHead(r)}
                          {q ? (
                            <ComparisonBand min={1} max={7} ticks={[1, 2, 3, 4, 5, 6, 7]} q={q} color={c.color}
                              scale={i === rows.length - 1 ? ["1", "7"] : undefined}
                              label={lang === "en" ? c.label.en : c.label.de}
                              describe={bandDescribe(r.label, q, (v) => fmtNum(v, lang))} />
                          ) : (
                            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: "4px 0 6px", fontStyle: "italic" }}>
                              {p(TXT.noValue)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.matrixHead)}</h2>
              <p style={lead}>{p(TXT.matrixLead)}{quadShares ? " " + p(TXT.shares) : ""}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <SovereigntyMatrix ftc={null} cto={null} cont={null} lang={lang} emptyHint={false}
                    quadShares={quadShares}
                    compare={rows.filter((r) => r.block.ftc && r.block.cto).map((r) => ({ ftc: r.block.ftc!, cto: r.block.cto!, tag: r.tag }))} />
                </div>
                <div>
                  {rows.map((r) => (
                    <div key={r.id} style={{ marginBottom: "12px" }}>
                      {rowHead(r)}
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                        {r.block.ftc && r.block.cto
                          ? `Reconfiguration Discretion ${fmtPct(r.block.ftc.p50)} · Operational Control ${fmtPct(r.block.cto.p50)} (${p(TXT.median)})`
                          : p(TXT.noValue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kontinuitaet */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.contHead)}</h2>
              <p style={lead}>{p(TXT.contLead)}</p>
              {rows.map((r, i) => (
                <div key={r.id} style={{ marginBottom: "10px", maxWidth: "640px" }}>
                  {rowHead(r)}
                  {r.block.cont ? (
                    <ComparisonBand min={0} max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} q={r.block.cont} color={CONT_COLOR}
                      scale={i === rows.length - 1 ? ["0 %", "100 %"] : undefined}
                      label={p(TXT.contHead)}
                      describe={bandDescribe(r.label, r.block.cont, fmtPct)} />
                  ) : (
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: "4px 0 6px", fontStyle: "italic" }}>
                      {p(TXT.noValue)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Tabelle fuer Screenreader und zum Nachlesen */}
            <details style={{ ...card, marginBottom: "20px" }}>
              <summary style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>
                {p(TXT.table)}
              </summary>
              <div style={{ overflowX: "auto", marginTop: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.75)" }}>
                  <thead>
                    <tr>
                      {[p(TXT.group), p(TXT.measure), "p25", p(TXT.median), "p75"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.flatMap((r) => [
                      ...CAPACITIES.map((c) => ({ r, name: lang === "en" ? c.label.en : c.label.de, q: r.block.cap[c.key], f: (v: number) => fmtNum(v, lang) })),
                      { r, name: "Reconfiguration Discretion", q: r.block.ftc, f: fmtPct },
                      { r, name: "Operational Control", q: r.block.cto, f: fmtPct },
                      { r, name: p(TXT.contHead), q: r.block.cont, f: fmtPct },
                    ]).map(({ r, name, q, f }) => (
                      <tr key={r.id + name}>
                        <td style={{ padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{r.label}</td>
                        <td style={{ padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{name}</td>
                        {(q ? [q.p25, q.p50, q.p75] : [null, null, null]).map((v, i) => (
                          <td key={i} style={{ padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{v === null ? "–" : f(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}

        {/* Methode und Gruppen */}
        <div style={{ ...card, marginTop: "20px" }}>
          <h2 style={h2}>{p(TXT.methodHead)}</h2>
          <ul style={{ margin: "10px 0 18px", paddingLeft: "18px", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}>
            {TXT.method.map((m) => <li key={m.de}>{p(m)}</li>)}
          </ul>
          <h3 style={{ ...h2, fontSize: "15px", margin: "0 0 10px" }}>{p(TXT.groupsHead)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "14px 32px" }}>
            {DIMENSIONS.map((d) => (
              <div key={d.key} style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                <div style={{ color: "rgba(255,255,255,0.85)", marginBottom: "2px" }}>{p(d.label)}</div>
                {d.groups.map((g) => (
                  <div key={g.key}>
                    <strong style={{ fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{p(g.label)}:</strong>{" "}
                    {g.members
                      .map((k) => LABEL_LISTS[SOURCE[d.key]].find((x) => x.key === k))
                      .filter(Boolean)
                      .map((x) => p(x!.label))
                      .join(", ")}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", margin: "16px 0 0" }}>
            <Link to="/impressum#vergleichswerte" style={{ color: "#8ba4ff", textDecoration: "none" }}>{p(TXT.privacy)} →</Link>
          </p>
        </div>
      </motion.div>

      <SiteFooter />
    </div>
  );
};

export default Dashboard;
