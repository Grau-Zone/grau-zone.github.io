// Oeffentliches Dashboard: zusammengefasste Vergleichswerte aller Teilnahmen.
//
// Liest ausschliesslich data/benchmark.json (Schnappschuss, nur Quartile und
// Spannen). Die Seite kann die Datenbank nicht lesen. Gefiltert wird nach genau
// einem Merkmal mit je zwei Gruppen; die Regeln stehen in data/benchmarkCore.ts.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";
import { BENCHMARK, hasBenchmark, fmtAsOf, isSmall } from "../data/benchmark";
import { ALL, DIMENSIONS, LABEL_LISTS, groupsOf, type DimKey } from "../data/benchmarkGroups";
import type { Lang } from "../data/instrument";
import { scoreRespondent, type Answers, type RespondentScores } from "../data/scoring";
import { LS, readLS } from "../data/storageKeys";
import { decodeResult, formatCode } from "../data/resultCode";
import ResultCodeForm from "../components/ResultCodeForm";
import ComparisonView from "../components/ComparisonView";
import { panelStyles } from "../components/panelStyles";

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
  stand: t("As of {d}", "Stand {d}"),
  emptyTitle: t("No comparison values yet", "Noch keine Vergleichswerte"),
  emptyText: t(
    "They will appear here as soon as enough participations are available. Every participation helps.",
    "Sie erscheinen hier, sobald genügend Teilnahmen vorliegen. Jede Teilnahme hilft."
  ),
  toAssessment: t("Go to the self-assessment", "Zum Self-Assessment"),
  small: t("The values can still shift with further participations.", "Die Werte können sich mit weiteren Teilnahmen noch verschieben."),
  methodHead: t("How the values are produced", "So entstehen die Werte"),
  method: [
    t(
      "All values are self-assessments of the participating organisations for one function and one provider. They are not representative.",
      "Alle Werte sind Selbsteinschätzungen der teilnehmenden Organisationen für eine Funktion und einen Anbieter. Sie sind nicht repräsentativ."
    ),
    t(
      "Published are rounded quartiles (median and middle half) and, from ten participations, the share per quadrant. No means, no minima or maxima, and no numbers of participants on this page.",
      "Veröffentlicht werden gerundete Quartile (Median und mittlere Hälfte) und ab zehn Teilnahmen der Anteil je Quadrant. Keine Mittelwerte, keine Minima oder Maxima und auf dieser Seite keine Teilnehmerzahlen."
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
  ownNote: t(
    "Your values from your self-assessment in this browser are marked as a dot. Calculated and shown only here, nothing is transmitted.",
    "Ihre Werte aus Ihrem Self-Assessment in diesem Browser sind als Punkt markiert. Nur hier berechnet und angezeigt, nichts wird übertragen."
  ),
  ownMissing: t(
    "If you complete the self-assessment in this browser, your own values will be marked here.",
    "Wenn Sie das Self-Assessment in diesem Browser ausfüllen, werden hier Ihre eigenen Werte markiert."
  ),
  ownNoteCode: t(
    "Your values from your result code are marked as a dot. The code is read only in this browser, nothing is transmitted.",
    "Ihre Werte aus Ihrem Ergebnis-Code sind als Punkt markiert. Der Code wird nur in diesem Browser gelesen, nichts wird übertragen."
  ),
  codeOpen: t("Sign in with a result code", "Mit einem Ergebnis-Code anmelden"),
  codeActive: t("Signed in with result code {c}.", "Angemeldet mit Ergebnis-Code {c}."),
  codeLogout: t("Sign out", "Abmelden"),
};

const SOURCE: Record<DimKey, keyof typeof LABEL_LISTS> = { branche: "industry", groesse: "size", funktion: "fn", sitz: "hq" };

function initialLang(): Lang {
  return readLS<string | null>(LS.lang, null) === "en" ? "en" : "de";
}

// Eigene Werte und eigene Gruppen aus dem abgeschlossenen Self-Assessment in
// diesem Browser. Wird nur lokal gelesen und gerechnet, nichts verlaesst den Browser.
type Own = { scores: RespondentScores; groups: Partial<Record<DimKey, string>> };
type OwnIntake = { size?: string; industry?: string; hq?: string; fnKey?: string };
function ownFrom(answers: Answers, i: OwnIntake): Own {
  return {
    scores: scoreRespondent(answers),
    groups: groupsOf({ size: i.size || "", industry: i.industry || "", hq: i.hq || "", fn: i.fnKey || "" }),
  };
}
function loadOwn(): Own | null {
  if (readLS<string | null>(LS.phase, null) !== "result") return null;
  const answers = readLS<Answers | null>(LS.ans, null);
  if (!answers || typeof answers !== "object") return null;
  return ownFrom(answers, readLS<OwnIntake | null>(LS.intake, null) || {});
}

// Eigene Werte aus einem Ergebnis-Code (data/resultCode.ts). Der Code enthaelt die
// Werte selbst, die Seite liest dafuer nichts aus der Datenbank.
function ownFromCode(code: string | null): Own | null {
  const d = code ? decodeResult(code) : null;
  if (!d) return null;
  const i = d.intake;
  return { scores: d.scores, groups: groupsOf({ size: i.size, industry: i.industry, hq: i.hq, fn: i.fnKey }) };
}
function loadCode(): string | null {
  const c = readLS<string | null>(LS.code, null);
  return typeof c === "string" && decodeResult(c) ? formatCode(c) : null;
}
function saveCode(c: string | null) {
  try {
    if (c) localStorage.setItem(LS.code, JSON.stringify(c));
    else localStorage.removeItem(LS.code);
  } catch { /* gesperrter Speicher: Anmeldung gilt dann nur bis zum Neuladen */ }
}

const Dashboard = () => {
  const [lang, setLang] = useState<Lang>(initialLang);
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const fill = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce((acc, [k, v]) => acc.replace("{" + k + "}", String(v)), s);

  const ready = hasBenchmark();

  // Nur lokal: /dashboard?sim zeigt eine echte Teilnahme als eigene Werte. Die Daten
  // kommen vom Dev-Server aus ~/Vergleichswerte/simulation.json (siehe vite.config.ts);
  // auf der veroeffentlichten Seite gibt es diesen Weg nicht.
  const { search } = useLocation();
  const sim = import.meta.env.DEV && new URLSearchParams(search).has("sim");
  const [simOwn, setSimOwn] = useState<Own | null>(null);
  const [simLabel, setSimLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!sim) { setSimOwn(null); setSimLabel(null); return; }
    let alive = true;
    const fail = () => { if (alive) { setSimOwn(null); setSimLabel("Simulation: keine Datei gefunden"); } };
    fetch("/__simulation.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s?.answers || typeof s.answers !== "object") return fail();
        if (!alive) return;
        setSimOwn(ownFrom(s.answers, s.intake || {}));
        setSimLabel("Simulation: " + (s.label || "ohne Bezeichnung"));
      })
      .catch(fail);
    return () => { alive = false; };
  }, [sim]);

  // Eigene Werte: Simulation (nur lokal) vor Ergebnis-Code vor dem Self-Assessment
  // in diesem Browser.
  const browserOwn = useMemo(loadOwn, []);
  const [code, setCode] = useState<string | null>(loadCode);
  const codeOwn = useMemo(() => ownFromCode(code), [code]);
  const own = sim ? simOwn : codeOwn ?? browserOwn;
  const ownFromCodeActive = !sim && !!codeOwn;
  const [codeOpen, setCodeOpen] = useState(false);
  // Nach An- und Abmelden verschwindet das bediente Element; der Fokus geht dann an
  // die neue Statuszeile bzw. an das Eingabefeld statt ins Leere.
  const activeRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"active" | "form" | null>(null);
  useEffect(() => {
    const f = focusNext.current;
    focusNext.current = null;
    if (f === "active") activeRef.current?.focus();
    else if (f === "form") (inputRef.current ?? openRef.current)?.focus();
  }, [code, codeOpen]);
  const login = (c: string) => {
    focusNext.current = "active";
    setCode(c); saveCode(c); setCodeOpen(false);
  };
  const logout = () => { focusNext.current = "form"; setCode(null); saveCode(null); };
  const openForm = () => { focusNext.current = "form"; setCodeOpen(true); };
  const mine = own?.scores ?? null;

  const { card, h2, lead } = panelStyles;
  const codeLinkBtn: React.CSSProperties = {
    fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "#8ba4ff", background: "none", border: "none", padding: 0, cursor: "pointer",
  };

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
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: "0 0 8px" }}>
            {fill(p(TXT.stand), { d: fmtAsOf(BENCHMARK.asOf, lang) })}{isSmall(BENCHMARK.groups[ALL]) ? ". " + p(TXT.small) : ""}
          </p>
        )}
        {import.meta.env.DEV && simLabel && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", color: "#1a1a1a", background: "#f2b94b", borderRadius: "6px", padding: "6px 10px", margin: "0 0 10px", display: "inline-block" }}>
            {simLabel} (nur lokal)
          </p>
        )}
        {/* Eigene Werte: immer angezeigt, nur aus diesem Browser, nichts wird uebertragen */}
        {ready && (
          <div style={{ margin: "0 0 28px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {mine ? (
                <>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
                  {p(ownFromCodeActive ? TXT.ownNoteCode : TXT.ownNote)}
                </>
              ) : (
                <span>
                  {p(TXT.ownMissing)}{" "}
                  <Link to="/assessment" style={{ color: "#8ba4ff", textDecoration: "none", whiteSpace: "nowrap" }}>{p(TXT.toAssessment)} →</Link>
                </span>
              )}
            </p>
            {/* Anmeldung mit Ergebnis-Code: wird nur hier im Browser dekodiert */}
            {ownFromCodeActive ? (
              <p ref={activeRef} tabIndex={-1} style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", outline: "none" }}>
                <span>{fill(p(TXT.codeActive), { c: code! })}</span>
                <button type="button" onClick={logout} style={codeLinkBtn}>{p(TXT.codeLogout)}</button>
              </p>
            ) : !sim && mine && !codeOpen ? (
              <p style={{ margin: "6px 0 0" }}>
                <button ref={openRef} type="button" onClick={openForm} style={codeLinkBtn}>{p(TXT.codeOpen)} →</button>
              </p>
            ) : !sim ? (
              <div style={{ marginTop: "12px" }}>
                <ResultCodeForm ref={inputRef} lang={lang} onLogin={login} />
              </div>
            ) : null}
          </div>
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
            <ComparisonView lang={lang} own={own} showTable />
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
