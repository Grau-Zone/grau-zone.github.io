// Oeffentliches Dashboard: zusammengefasste Vergleichswerte aller Teilnahmen.
//
// Liest ausschliesslich data/benchmark.json (Schnappschuss, nur Quartile). Die
// Seite kann die Datenbank nicht lesen. Keine Unterteilung nach Gruppen; die
// Regeln stehen in data/benchmarkCore.ts.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";
import ComparisonBand from "../components/ComparisonBand";
import { SovereigntyMatrix } from "../components/ResultVisuals";
import { CAPACITIES } from "../data/capacityItems";
import { BENCHMARK, ALL_SUMMARY, fmtAsOf, fmtNum, fmtPct, isSmall } from "../data/benchmark";
import type { Quant } from "../data/benchmarkCore";
import type { Lang } from "../data/instrument";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

const TXT = {
  back: t("Back to home", "Zurück zur Startseite"),
  eyebrow: t("Sovereignty Radar", "Sovereignty Radar"),
  title: t("Comparison values", "Vergleichswerte"),
  lead: t(
    "How do organisations assess their room for manoeuvre towards important digital providers? Interim results from the self-assessment across all participants: self-assessments, not representative.",
    "Wie schätzen Organisationen ihren Handlungsspielraum gegenüber wichtigen digitalen Anbietern ein? Zwischenstand aus dem Self-Assessment über alle Teilnehmenden: Selbsteinschätzungen, nicht repräsentativ."
  ),
  stand: t("As of {d} · {n} participations", "Stand {d} · {n} Teilnahmen"),
  small: t("Still few participations: the values can shift considerably.", "Noch wenige Teilnahmen: Die Werte können sich stark verschieben."),
  emptyTitle: t("No comparison values yet", "Noch keine Vergleichswerte"),
  emptyText: t(
    "They will appear here as soon as enough participations are available. Every participation helps.",
    "Sie erscheinen hier, sobald genügend Teilnahmen vorliegen. Jede Teilnahme hilft."
  ),
  toAssessment: t("Go to the self-assessment", "Zum Self-Assessment"),
  capHead: t("Four capacities", "Vier Fähigkeiten"),
  capLead: t(
    "Self-assessment on a scale from 1 to 7. Band = middle half of all participants, line = median.",
    "Selbsteinschätzung auf einer Skala von 1 bis 7. Band = mittlere Hälfte aller Teilnehmenden, Strich = Median."
  ),
  matrixHead: t("The two dimensions of sovereignty", "Die zwei Dimensionen der Souveränität"),
  matrixLead: t(
    "Reconfiguration Discretion: how freely the provider could be changed. Operational Control: how much control remains while depending on it. Diamond = median of all participants, frame = their middle half.",
    "Reconfiguration Discretion: wie frei sich der Anbieter wechseln liesse. Operational Control: wie viel Kontrolle bleibt, während man von ihm abhängt. Raute = Median aller Teilnehmenden, Rahmen = ihre mittlere Hälfte."
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
  all: t("All participants", "Alle Teilnehmenden"),
  noValue: t("not enough valid answers yet", "noch zu wenige gültige Antworten"),
  table: t("Show as table", "Als Tabelle anzeigen"),
  measure: t("Measure", "Kennzahl"),
  methodHead: t("How the values are produced", "So entstehen die Werte"),
  method: [
    t(
      "All values are self-assessments of the participating organisations for one function and one provider. They are not representative.",
      "Alle Werte sind Selbsteinschätzungen der teilnehmenden Organisationen für eine Funktion und einen Anbieter. Sie sind nicht repräsentativ."
    ),
    t(
      "Compared is always with all participants, without breakdown by industry, size, function, headquarters or provider.",
      "Verglichen wird immer mit allen Teilnehmenden, ohne Unterteilung nach Branche, Grösse, Funktion, Hauptsitz oder Anbieter."
    ),
    t(
      "Published are rounded quartiles (median and middle half), the number of participations and, from ten participations, the share per quadrant. No means, no minima or maxima.",
      "Veröffentlicht werden gerundete Quartile (Median und mittlere Hälfte), die Zahl der Teilnahmen und ab zehn Teilnahmen der Anteil je Quadrant. Keine Mittelwerte, keine Minima oder Maxima."
    ),
    t(
      "Values appear from two participations. With two or three participations, individual values can be derived from the quartiles, but not assigned to any organisation.",
      "Werte erscheinen ab zwei Teilnahmen. Bei zwei oder drei Teilnahmen lassen sich aus den Quartilen Einzelwerte ableiten, aber keiner Organisation zuordnen."
    ),
    t(
      "The values are calculated by hand from an export of the database and published with a date. This page cannot read the database.",
      "Die Werte werden von Hand aus einem Export der Datenbank berechnet und mit Datum veröffentlicht. Diese Seite kann die Datenbank nicht lesen."
    ),
  ],
  privacy: t("More on data protection", "Mehr zum Datenschutz"),
};

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
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const fill = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce((acc, [k, v]) => acc.replace("{" + k + "}", String(v)), s);
  const bis = lang === "de" ? "bis" : "to";
  const s = ALL_SUMMARY;

  const describe = (q: Quant | null, f: (v: number) => string) =>
    q ? [p(TXT.all), `${p(TXT.median)}: ${f(q.p50)}`, `${p(TXT.band)}: ${f(q.p25)} ${bis} ${f(q.p75)}`] : [p(TXT.all)];

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "22px 24px",
  };
  const h2: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "18px", color: "white", margin: "0 0 4px" };
  const lead: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)", margin: "0 0 18px" };
  const noValue = (
    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: "4px 0 6px", fontStyle: "italic" }}>
      {p(TXT.noValue)}
    </p>
  );

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
        {s && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>
            {fill(p(TXT.stand), { d: fmtAsOf(BENCHMARK.asOf, lang), n: s.n })}{isSmall(s) ? ". " + p(TXT.small) : ""}
          </p>
        )}

        {!s ? (
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
            {/* Vier Faehigkeiten */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.capHead)}</h2>
              <p style={lead}>{p(TXT.capLead)}</p>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "22px 36px" }}>
                {CAPACITIES.map((c) => {
                  const q = s.cap[c.key];
                  const name = lang === "en" ? c.label.en : c.label.de;
                  return (
                    <div key={c.key}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: c.color }} />
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.9)" }}>{name}</span>
                      </div>
                      {q ? (
                        <ComparisonBand min={1} max={7} ticks={[1, 2, 3, 4, 5, 6, 7]} q={q} color={c.color}
                          scale={["1", "7"]} label={name} describe={describe(q, (v) => fmtNum(v, lang))} />
                      ) : noValue}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.matrixHead)}</h2>
              <p style={lead}>{p(TXT.matrixLead)}{s.quad ? " " + p(TXT.shares) : ""}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <SovereigntyMatrix ftc={null} cto={null} cont={null} lang={lang} emptyHint={false}
                    quadShares={s.quad}
                    compare={s.ftc && s.cto ? [{ ftc: s.ftc, cto: s.cto }] : []}
                    ariaLabel={[
                      p(TXT.matrixHead),
                      s.ftc && s.cto ? `${p(TXT.median)}: Reconfiguration Discretion ${fmtPct(s.ftc.p50)}, Operational Control ${fmtPct(s.cto.p50)}` : p(TXT.noValue),
                    ].join(". ")} />
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
                  {s.ftc && s.cto ? (
                    <>
                      {p(TXT.median)}:<br />
                      Reconfiguration Discretion {fmtPct(s.ftc.p50)} ({p(TXT.band)} {fmtPct(s.ftc.p25)} {bis} {fmtPct(s.ftc.p75)})<br />
                      Operational Control {fmtPct(s.cto.p50)} ({p(TXT.band)} {fmtPct(s.cto.p25)} {bis} {fmtPct(s.cto.p75)})
                    </>
                  ) : p(TXT.noValue)}
                </p>
              </div>
            </div>

            {/* Kontinuitaet */}
            <div style={{ ...card, marginBottom: "20px" }}>
              <h2 style={h2}>{p(TXT.contHead)}</h2>
              <p style={lead}>{p(TXT.contLead)}</p>
              <div style={{ maxWidth: "640px" }}>
                {s.cont ? (
                  <ComparisonBand min={0} max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} q={s.cont} color={CONT_COLOR}
                    scale={["0 %", "100 %"]} label={p(TXT.contHead)} describe={describe(s.cont, fmtPct)} />
                ) : noValue}
              </div>
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
                      {[p(TXT.measure), "p25", p(TXT.median), "p75"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...CAPACITIES.map((c) => ({ name: lang === "en" ? c.label.en : c.label.de, q: s.cap[c.key], f: (v: number) => fmtNum(v, lang) })),
                      { name: "Reconfiguration Discretion", q: s.ftc, f: fmtPct },
                      { name: "Operational Control", q: s.cto, f: fmtPct },
                      { name: p(TXT.contHead), q: s.cont, f: fmtPct },
                    ].map(({ name, q, f }) => (
                      <tr key={name}>
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

        {/* Methode */}
        <div style={{ ...card, marginTop: "20px" }}>
          <h2 style={h2}>{p(TXT.methodHead)}</h2>
          <ul style={{ margin: "10px 0 14px", paddingLeft: "18px", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}>
            {TXT.method.map((m) => <li key={m.de}>{p(m)}</li>)}
          </ul>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", margin: 0 }}>
            <Link to="/impressum#vergleichswerte" style={{ color: "#8ba4ff", textDecoration: "none" }}>{p(TXT.privacy)} →</Link>
          </p>
        </div>
      </motion.div>

      <SiteFooter />
    </div>
  );
};

export default Dashboard;
