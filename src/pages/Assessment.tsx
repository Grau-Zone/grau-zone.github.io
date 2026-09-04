// Self-Assessment zur digitalen Souveraenitaet.
//
// Oeffentliches Modell: vier organisationale Faehigkeiten (Switching,
// Internalization, Multi-Sourcing, Negotiation) aus src/data/capacityItems.ts.
// Nur deren Items bilden die angezeigten Werte.
//
// Die Konstrukte des v13-Forschungsinstruments werden im fuenften Block als
// Kontext erhoben und exportiert. Sie werden weder angezeigt noch auf die vier
// Faehigkeiten abgebildet und nicht mit ihnen verrechnet.
//
// "Weiss nicht" ist immer MISSING (99) und wird nie als 0 gewertet.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Home, RotateCcw, FileJson, Info, AlertTriangle, Mail, Check } from "lucide-react";
import { submitResult, flushQueue, isEnabled, newResponseId, type SubmitState } from "../data/submit";
import { ITEMS, MISSING, INSTRUMENT_VERSION, type Item, type Lang } from "../data/instrument";
import { UI, CONTEXT_GROUPS, FUNCTIONS, FUNCTION_OTHER, FIRM_SIZE, INDUSTRY, HQ, labelOf, anchorsFor, YES_NO, pick } from "../data/surveyUi";
import { CAPACITIES, CAP_ITEMS, itemsOfCapacity, scoreCapacity, pickCap, MIN_VALID, type CapacityKey } from "../data/capacityItems";

// Mehrfachauswahl-Items (ATR-3) speichern eine Liste von Optionswerten.
// MISSING bleibt auch dort die einzelne Zahl 99 und wird nie als Null gewertet.
type Answers = Record<string, number | number[]>;
type Phase = "lang" | "intro" | "intake" | "blocks" | "result";

const LS = { lang: "cds13-lang", ans: "cds13-answers", phase: "cds13-phase", block: "cds13-block", intake: "cds13-intake", rid: "cds13-rid", consent: "cds13-consent" };
const load = <T,>(k: string, f: T): T => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
};

// Nur die in der Excel ausgewaehlten Items (Spalte "Auswahl 3")
const ACTIVE = ITEMS.filter((i) => i.selected);
const itemsOfConstruct = (c: string) => ACTIVE.filter((i) => i.construct === c);

// Fuenf Bloecke des Fragebogens. Die ersten vier sind das oeffentliche
// Capacity-Modell, der fuenfte sammelt die Items des Forschungsinstruments.
// Die Items des fuenften Blocks fliessen nicht in die Capacity-Werte ein.
export type BlockDef =
  | { kind: "cap"; key: CapacityKey }
  | { kind: "ctx"; key: "CTX" };
const BLOCKS: BlockDef[] = [
  ...CAPACITIES.map((c) => ({ kind: "cap" as const, key: c.key })),
  { kind: "ctx" as const, key: "CTX" as const },
];
const CTX_COLOR = "rgba(160,175,205,1)";
const blockColor = (b: BlockDef) =>
  b.kind === "cap" ? CAPACITIES.find((c) => c.key === b.key)!.color : CTX_COLOR;

// Items eines Blocks. Fuer den Kontextblock die im Instrument ausgewaehlten Items,
// gruppiert nach den neutralen Ueberschriften aus CONTEXT_GROUPS.
const ctxItemsOfGroup = (g: { constructs: string[] }) =>
  ACTIVE.filter((i) => g.constructs.includes(i.construct));
const itemIdsOfBlock = (b: BlockDef): string[] =>
  b.kind === "cap"
    ? itemsOfCapacity(b.key).map((i) => i.id)
    : CONTEXT_GROUPS.flatMap((g) => ctxItemsOfGroup(g).map((i) => i.id));

// Intake: gewaehlte Funktion (Schluessel) oder Freitext unter "other"
type Intake = { fnKey: string; fnOther: string; provider: string; size: string; industry: string; hq: string };
const EMPTY_INTAKE: Intake = { fnKey: "", fnOther: "", provider: "", size: "", industry: "", hq: "" };

function functionLabel(intake: Intake, lang: Lang): string {
  if (intake.fnKey === FUNCTION_OTHER) return intake.fnOther.trim();
  const f = FUNCTIONS.find((x) => x.key === intake.fnKey);
  return f ? pick(f.label, lang) : "";
}
function typicalProviders(intake: Intake, lang: Lang): string {
  const f = FUNCTIONS.find((x) => x.key === intake.fnKey);
  return f ? pick(f.providers, lang) : "";
}

export default function Assessment() {
  const [lang, setLang] = useState<Lang | null>(() => load<Lang | null>(LS.lang, null));
  const [phase, setPhase] = useState<Phase>(() => load<Phase>(LS.phase, "lang"));
  const [blockIndex, setBlockIndex] = useState<number>(() => load(LS.block, 0));
  const [answers, setAnswers] = useState<Answers>(() => load<Answers>(LS.ans, {}));
  const [consent, setConsent] = useState<boolean>(() => load(LS.consent, false));
  const [responseId, setResponseId] = useState<string>(() => load(LS.rid, ""));
  const [intake, setIntake] = useState<Intake>(() => {
    const raw = load<any>(LS.intake, EMPTY_INTAKE);
    // aelterer Stand mit freiem Funktionsfeld
    if (raw && raw.fn !== undefined && raw.fnKey === undefined) {
      return { fnKey: raw.fn ? FUNCTION_OTHER : "", fnOther: raw.fn || "", provider: raw.provider || "" };
    }
    return { ...EMPTY_INTAKE, ...raw };
  });

  useEffect(() => { localStorage.setItem(LS.lang, JSON.stringify(lang)); }, [lang]);
  useEffect(() => { localStorage.setItem(LS.phase, JSON.stringify(phase)); }, [phase]);
  useEffect(() => { localStorage.setItem(LS.block, JSON.stringify(blockIndex)); }, [blockIndex]);
  useEffect(() => { localStorage.setItem(LS.ans, JSON.stringify(answers)); }, [answers]);
  useEffect(() => { localStorage.setItem(LS.intake, JSON.stringify(intake)); }, [intake]);
  useEffect(() => { localStorage.setItem(LS.consent, JSON.stringify(consent)); }, [consent]);
  useEffect(() => { localStorage.setItem(LS.rid, JSON.stringify(responseId)); }, [responseId]);

  // Liegengebliebene Uebermittlungen aus frueheren Durchlaeufen nachreichen.
  useEffect(() => { flushQueue(); }, []);

  const L = (lang || "en") as Lang;
  // ctaItems ist als einziger UI-Eintrag ein Array und wird direkt gerendert,
  // deshalb nimmt tr() nur die Schlüssel mit einfachem {en,de}-Wert.
  type TrKey = { [K in keyof typeof UI]: (typeof UI)[K] extends { en: string } ? K : never }[keyof typeof UI];
  const tr = (k: TrKey) => pick(UI[k] as { en: string; de: string }, L);

  const answer = (id: string, v: number) => setAnswers((p) => ({ ...p, [id]: v }));

  // Mehrfachauswahl umschalten. "Keine unabhaengigen Nachweise" (Wert 1) und
  // "weiss nicht" schliessen die uebrigen Angaben aus.
  const toggleMulti = (id: string, v: number, exclusive: boolean) =>
    setAnswers((p) => {
      const alt = p[id];
      if (exclusive) return { ...p, [id]: [v] };
      const liste = Array.isArray(alt) ? alt.filter((x) => x !== 1) : [];
      const neu = liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v].sort((a, b) => a - b);
      if (!neu.length) { const kopie = { ...p }; delete kopie[id]; return kopie; }
      return { ...p, [id]: neu };
    });

  const reset = () => {
    setAnswers({}); setBlockIndex(0); setIntake(EMPTY_INTAKE);
    setPhase("lang"); setLang(null); setConsent(false); setResponseId("");
    Object.values(LS).forEach((k) => localStorage.removeItem(k));
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: "96px", paddingBottom: "64px" }}>
      {/* Bewusst ohne AnimatePresence: mit Wrapper-Komponenten als Kindern meldet die
          Exit-Animation nie "fertig", und die naechste Phase wird nie montiert.
          Die Einblend-Animation steckt in den Screens selbst. */}
      {phase === "lang" && (
        <LanguageGate key="lang" onPick={(l) => { setLang(l); setPhase("intro"); }} />
      )}
      {phase === "intro" && lang && (
        <Intro
          key="intro" lang={L} tr={tr} consent={consent} setConsent={setConsent}
          onStart={() => { if (!responseId) setResponseId(newResponseId()); setPhase("intake"); }}
        />
      )}
      {phase === "intake" && lang && (
        <Intake
          key="intake" lang={L} tr={tr} intake={intake} setIntake={setIntake}
          onBack={() => setPhase("intro")} onNext={() => { setBlockIndex(0); setPhase("blocks"); }}
        />
      )}
      {phase === "blocks" && lang && (
        <BlockScreen
          key={`b-${blockIndex}`} lang={L} tr={tr} blockIndex={blockIndex}
          answers={answers} onAnswer={answer} onToggle={toggleMulti} intake={intake}
          onBack={() => (blockIndex > 0 ? setBlockIndex(blockIndex - 1) : setPhase("intake"))}
          onNext={() => (blockIndex < BLOCKS.length - 1 ? setBlockIndex(blockIndex + 1) : setPhase("result"))}
        />
      )}
      {phase === "result" && lang && (
        <Result key="result" lang={L} tr={tr} answers={answers} intake={intake} onRestart={reset} responseId={responseId} consent={consent} />
      )}
    </div>
  );
}

// ─── Sprachauswahl ───────────────────────────────────────────────────────────
function LanguageGate({ onPick }: { onPick: (l: Lang) => void }) {
  // Beide Sprachfassungen sind gleichwertig. Eine sichtbare Empfehlung fuer
  // Englisch wuerde die deutsche Fassung abwerten.
  const btn: React.CSSProperties = {
    fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "17px",
    padding: "18px 34px", borderRadius: "11px", minWidth: "250px",
    border: "1px solid rgba(75,110,255,0.4)", background: "rgba(75,110,255,0.13)",
    color: "#8ba4ff", cursor: "pointer",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "14px" }}>
        {UI.eyebrow.de}
      </div>
      <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(26px, 4.5vw, 42px)", color: "white", marginBottom: "10px", letterSpacing: "-0.025em" }}>
        {UI.langTitle.en} · {UI.langTitle.de}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14.5px", marginBottom: "40px" }}>
        {UI.langLead.de}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={() => onPick("en")} style={btn}>{UI.langEn.en}</button>
        <button onClick={() => onPick("de")} style={btn}>{UI.langDe.de}</button>
      </div>
    </motion.div>
  );
}

// ─── Intro ───────────────────────────────────────────────────────────────────
function Intro({ lang, tr, onStart, consent, setConsent }: any) {
  const [touched, setTouched] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[70vh]"
    >
      <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "14px" }}>
        {tr("eyebrow")}
      </div>
      <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(28px, 5vw, 46px)", color: "white", marginBottom: "16px", lineHeight: 1.15, letterSpacing: "-0.025em" }}>
        {tr("introTitle")}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", lineHeight: 1.7, marginBottom: "18px" }}>
        {tr("introLead")}
      </p>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.6, marginBottom: "34px", fontStyle: "italic" }}>
        {tr("introUnit")}
      </p>

      <div className="flex flex-wrap gap-3 justify-center mb-7">
        {CAPACITIES.map((c, i) => (
          <div key={c.key} style={{
            padding: "8px 15px", borderRadius: "9px",
            background: `${c.color}14`, border: `1px solid ${c.color}40`,
            fontFamily: "Space Grotesk, sans-serif", fontSize: "12.5px", color: c.color,
          }}>
            {i + 1} · {pickCap(c.label, lang)}
          </div>
        ))}
        <div style={{
          padding: "8px 15px", borderRadius: "9px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
          fontFamily: "Space Grotesk, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.6)",
        }}>
          5 · {tr("contextTitle")}
        </div>
      </div>

      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13.5px", lineHeight: 1.65, marginBottom: "30px", maxWidth: "620px" }}>
        {tr("introStage")}
      </p>

      {/* Einwilligung vor dem ersten Item, nicht danach: wer nicht zustimmt,
          soll die Fragen gar nicht erst beantwortet haben. */}
      {isEnabled() && (
        <div style={{
          maxWidth: "620px", textAlign: "left", padding: "17px 19px", borderRadius: "11px",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${touched && !consent ? "rgba(217,165,89,0.5)" : "rgba(255,255,255,0.09)"}`,
          marginBottom: "24px",
        }}>
          <label style={{ display: "flex", gap: "11px", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox" checked={!!consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: "3px", width: "17px", height: "17px", accentColor: "#8ba4ff", flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", lineHeight: 1.55, color: "rgba(255,255,255,0.78)" }}>
              {tr("consentLabel")}
            </span>
          </label>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", lineHeight: 1.55, color: "rgba(255,255,255,0.5)", margin: "10px 0 0 28px" }}>
            {tr("consentDetail")}{" "}
            <Link to="/impressum" style={{ color: "rgba(139,164,255,0.85)" }}>Impressum und Datenschutz</Link>
          </p>
          {touched && !consent && (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "#d9a559", margin: "9px 0 0 28px" }}>
              {tr("consentRequired")}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => { setTouched(true); if (!isEnabled() || consent) onStart(); }} style={{
          fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "15px",
          padding: "14px 32px", borderRadius: "10px",
          border: "1px solid rgba(75,110,255,0.4)", background: "rgba(75,110,255,0.15)",
          color: "#8ba4ff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
        }}>
          {tr("start")} <ArrowRight size={16} />
        </button>
        <Link to="/" style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", padding: "14px 26px",
          borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
          textDecoration: "none", display: "flex", alignItems: "center", gap: "8px",
        }}>
          <Home size={16} /> {tr("toHome")}
        </Link>
      </div>

      <p style={{ marginTop: "22px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
        {CAP_ITEMS.length + ACTIVE.length} {tr("questionsCount")} · {tr("minutes")}
        {!isEnabled() && <> · {tr("minutesNoStore")}</>}
      </p>
    </motion.div>
  );
}

// ─── Intake: Funktion + Anbieter ─────────────────────────────────────────────
function Intake({ lang, tr, intake, setIntake, onBack, onNext }: any) {
  const [touched, setTouched] = useState(false);
  const chosen = intake.fnKey as string;
  // Ohne Anbieter ist die Funktion-Anbieter-Konstellation nicht vollstaendig
  // definiert, und jede Antwort bezieht sich auf genau diese Kombination.
  const valid =
    chosen &&
    (chosen !== FUNCTION_OTHER || intake.fnOther.trim().length > 0) &&
    intake.provider.trim().length > 0;

  // Kompakte Auswahlreihe; erneutes Klicken hebt die Auswahl wieder auf,
  // damit eine freiwillige Angabe auch zurueckgenommen werden kann.
  const chips = (title: string, list: { key: string; label: any }[], field: string) => (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.72)", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {list.map((o) => {
          const on = intake[field] === o.key;   // nur Darstellung
          return (
            <button key={o.key}
              onClick={() => setIntake((p: any) => ({ ...p, [field]: p[field] === o.key ? "" : o.key }))}
              style={{
                padding: "8px 13px", borderRadius: "8px", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: "13px",
                border: `1px solid ${on ? "#8ba4ff" : "rgba(255,255,255,0.1)"}`,
                background: on ? "rgba(139,164,255,0.15)" : "rgba(255,255,255,0.03)",
                color: on ? "#fff" : "rgba(255,255,255,0.72)",
                fontWeight: on ? 600 : 400, transition: "all 0.15s",
              }}>
              {pick(o.label, lang)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const option = (key: string, label: string, providers?: string) => {
    const active = chosen === key;
    return (
      <button
        key={key}
        onClick={() => setIntake((p: any) => ({ ...p, fnKey: key }))}
        style={{
          textAlign: "left", padding: "12px 15px", borderRadius: "10px", cursor: "pointer",
          border: `1px solid ${active ? "#8ba4ff" : "rgba(255,255,255,0.1)"}`,
          background: active ? "rgba(139,164,255,0.15)" : "rgba(255,255,255,0.03)",
          transition: "all 0.15s", width: "100%",
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: active ? "#fff" : "rgba(255,255,255,0.8)", fontWeight: active ? 600 : 400 }}>
          {label}
        </div>
        {providers && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", color: "rgba(255,255,255,0.42)", marginTop: "3px" }}>
            {tr("intakeTypical")}: {providers}
          </div>
        )}
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto px-4" style={{ paddingTop: "40px" }}>
      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(24px,4vw,34px)", color: "white", marginBottom: "8px" }}>
        {tr("intakeTitle")}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.6, marginBottom: "22px" }}>
        {tr("intakeLead")}
      </p>

      {/* Ablauf in drei Schritten. Ohne diese Einordnung ist auf dieser Seite
          nicht erkennbar, was nach der Auswahl passiert und was am Ende steht. */}
      <div style={{ padding: "20px 22px", borderRadius: "12px", background: "rgba(139,164,255,0.06)", border: "1px solid rgba(139,164,255,0.22)", marginBottom: "28px" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(139,164,255,0.85)", marginBottom: "14px" }}>
          {tr("intakeHowHead")}
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "11px" }}>
          {[tr("intakeStep1"), tr("intakeStep2"), tr("intakeStep3")].map((txt, i) => (
            <li key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%",
                background: "rgba(139,164,255,0.18)", border: "1px solid rgba(139,164,255,0.4)",
                color: "#a8bcff", fontFamily: "Space Grotesk, sans-serif", fontSize: "12px",
                display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px",
              }}>{i + 1}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
                {txt}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Firmenprofil: Stichprobenbeschreibung, bewusst nicht erzwungen ── */}
      <div style={{ padding: "20px 22px", borderRadius: "12px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "28px" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
          {tr("firmHead")}
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.5)", margin: "6px 0 16px" }}>
          {tr("firmLead")}
        </p>
        {chips(tr("firmSize"), FIRM_SIZE, "size")}
        {chips(tr("firmIndustry"), INDUSTRY, "industry")}
        {chips(tr("firmHq"), HQ, "hq")}
      </div>

      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "10px" }}>
        {tr("intakeChoose")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {FUNCTIONS.map((f) => option(f.key, pick(f.label, lang), pick(f.providers, lang)))}
        {option(FUNCTION_OTHER, tr("intakeOther"))}
      </div>

      {chosen === FUNCTION_OTHER && (
        <input
          autoFocus value={intake.fnOther}
          onChange={(e) => setIntake((p: any) => ({ ...p, fnOther: e.target.value }))}
          placeholder={tr("intakeOtherPh")}
          style={{
            width: "100%", marginTop: "10px", padding: "12px 15px", borderRadius: "10px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,164,255,0.4)",
            color: "white", fontFamily: "Inter, sans-serif", fontSize: "15px", outline: "none",
          }}
        />
      )}

      {touched && !valid && (
        <div style={{ marginTop: "10px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "#d9a559" }}>
          {tr("intakeMissingFn")}
        </div>
      )}

      <div style={{ marginTop: "26px" }}>
        <label style={{ display: "block", fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "7px" }}>
          {tr("intakeProvider")}
        </label>
        <input
          value={intake.provider}
          onChange={(e) => setIntake((p: any) => ({ ...p, provider: e.target.value }))}
          placeholder={typicalProviders(intake, lang) || tr("intakeProviderPh")}
          style={{
            width: "100%", padding: "13px 16px", borderRadius: "10px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            color: "white", fontFamily: "Inter, sans-serif", fontSize: "15px", outline: "none",
          }}
        />
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", lineHeight: 1.55, color: "rgba(255,255,255,0.5)", marginTop: "7px" }}>
          {tr("intakeProviderNote")}
        </p>
      </div>

      <Nav tr={tr} onBack={onBack} color="#8ba4ff" nextLabel={tr("next")}
        onNext={() => { setTouched(true); if (valid) onNext(); }} />
    </motion.div>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function Nav({ tr, onBack, onNext, nextLabel, color }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "26px", paddingBottom: "40px" }}>
      <button onClick={onBack} style={{
        fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", padding: "12px 20px", borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
        color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
      }}>
        <ArrowLeft size={14} /> {tr("back")}
      </button>
      <button onClick={onNext} style={{
        fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 500,
        padding: "12px 24px", borderRadius: "8px",
        border: `1px solid ${color}55`, background: `${color}18`, color,
        cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
      }}>
        {nextLabel} <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Fragenblock ─────────────────────────────────────────────────────────────
// Bloecke 1 bis 4 erheben je eine der vier Faehigkeiten. Block 5 sammelt die
// Items des Forschungsinstruments unter neutralen Ueberschriften. Konstruktnamen,
// Konstruktcodes und Item-IDs bleiben unsichtbar: sie wuerden Teilnehmende primen
// und neben den vier Faehigkeiten ein zweites Modell aufmachen.
function BlockScreen({ lang, tr, blockIndex, answers, onAnswer, onToggle, onBack, onNext, intake }: any) {
  const block = BLOCKS[blockIndex];
  const cap = block.kind === "cap" ? CAPACITIES.find((c) => c.key === block.key)! : null;
  const color = blockColor(block);
  const ids = itemIdsOfBlock(block);
  const answered = ids.filter((id) => answers[id] !== undefined).length;
  const vollstaendig = answered === ids.length;
  const [touched, setTouched] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); setTouched(false); }, [blockIndex]);

  const fnLabel = functionLabel(intake, lang);
  const fill = (x: string) =>
    x.replace(/\[FUNCTION\]|<FUNCTION>/g, fnLabel || (lang === "en" ? "this function" : "diese Funktion"))
     .replace(/\[PROVIDER\]|<PROVIDER>/g, intake.provider || (lang === "en" ? "this provider" : "diesem Anbieter"));

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto px-4">
      <div ref={topRef} />
      <div style={{ display: "flex", gap: "4px", marginBottom: "26px" }}>
        {BLOCKS.map((b, i) => (
          <div key={b.key} style={{
            height: "3px", flex: 1, borderRadius: "2px",
            background: i < blockIndex ? "#6b9bd8" : i === blockIndex ? color : "rgba(255,255,255,0.09)",
          }} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.2em", color, textTransform: "uppercase" }}>
          {tr("block")} {blockIndex + 1} {tr("of")} {BLOCKS.length}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>
          {answered}/{ids.length} {tr("answered")}
        </span>
      </div>

      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(22px,4vw,32px)", color: "white", marginBottom: "4px", letterSpacing: "-0.02em" }}>
        {cap ? pickCap(cap.label, lang) : tr("contextTitle")}
      </h2>
      {cap && (
        <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", letterSpacing: "0.14em", color: `${color}cc`, textTransform: "uppercase", marginBottom: "10px" }}>
          {cap.term}
        </div>
      )}
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.65, marginBottom: "22px", maxWidth: "68ch" }}>
        {cap ? pickCap(cap.definition, lang) : tr("contextSub")}
      </p>

      {!cap && (
        <div style={{ padding: "14px 17px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: 0 }}>
            {tr("contextLead")}
          </p>
        </div>
      )}

      {(fnLabel || intake.provider) && (
        <div style={{ padding: "12px 16px", borderRadius: "9px", background: `${color}0d`, border: `1px solid ${color}26`, marginBottom: "24px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Info size={15} style={{ color, marginTop: "2px", flexShrink: 0 }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            {fnLabel} {tr("atProvider")} {intake.provider}
          </span>
        </div>
      )}

      {cap ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
          {itemsOfCapacity(cap.key).map((it) => (
            <QuestionCard key={it.id} lang={lang} tr={tr} color={color} fill={fill}
              id={it.id} text={pickCap(it.text, lang)} scale={it.scale}
              value={answers[it.id]} onAnswer={onAnswer} />
          ))}
        </div>
      ) : (
        CONTEXT_GROUPS.map((g) => {
          const items = ctxItemsOfGroup(g);
          if (!items.length) return null;
          return (
            <div key={g.key} style={{ marginBottom: "30px" }}>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "14.5px", color: "rgba(255,255,255,0.75)", marginBottom: "12px" }}>
                {pick(g.label, lang)}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                {items.map((it) => (
                  <QuestionCard key={it.id} lang={lang} tr={tr} color={color} fill={fill}
                    id={it.id} text={lang === "en" ? it.en : it.de} scale={it.scale || 7}
                    options={it.type === "fact" || it.type === "multi" ? it.options : undefined}
                    multi={it.type === "multi"}
                    value={answers[it.id]} onAnswer={onAnswer} onToggle={onToggle} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {touched && !vollstaendig && (
        <div style={{ marginTop: "18px", fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#d9a559" }}>
          {tr("incompleteHint")}
        </div>
      )}

      <Nav tr={tr} onBack={onBack} color={color}
        onNext={() => { setTouched(true); if (vollstaendig) onNext(); }}
        nextLabel={blockIndex === BLOCKS.length - 1 ? tr("showResult") : tr("next")} />
    </motion.div>
  );
}

// ─── Einzelfrage ─────────────────────────────────────────────────────────────
// Eine Frage. Ohne Item-ID und ohne Konstruktcode. Bei Faktenfragen wird nur der
// Antworttext gezeigt: sichtbare Zahlen suggerieren eine Rangfolge und beeinflussen
// die Antwort. Die numerischen Werte bleiben allein im Datensatz.
function QuestionCard({ id, text, scale, options, multi, lang, tr, color, value, onAnswer, onToggle, fill }: {
  id: string; text: string; scale: number; options?: { value: number; en: string; de: string }[];
  multi?: boolean;
  lang: Lang; tr: (k: any) => string; color: string;
  value: number | number[] | undefined;
  onAnswer: (itemId: string, v: number) => void;
  onToggle?: (itemId: string, v: number, exclusive: boolean) => void;
  fill: (s: string) => string;
}) {
  const frage = fill(text);
  const answered = value !== undefined;
  const gewaehlt = Array.isArray(value) ? value : [];
  const aktiv = (v: number) => (multi ? gewaehlt.includes(v) : value === v);
  const btn = (active: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
    fontFamily: "Inter, sans-serif", fontSize: "12.5px", padding: "8px 13px", borderRadius: "8px",
    border: `1px solid ${active ? color : "rgba(255,255,255,0.09)"}`,
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    color: active ? "#fff" : "rgba(255,255,255,0.55)",
    cursor: "pointer", transition: "all 0.15s", fontWeight: active ? 600 : 400, ...extra,
  });

  return (
    <div style={{
      padding: "15px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.025)",
      border: `1px solid ${answered ? `${color}33` : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.2s",
    }}>
      <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "14px", lineHeight: 1.55, margin: "0 0 12px" }}>
        {frage}
      </p>

      {options ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {multi && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", color: "rgba(255,255,255,0.5)", marginBottom: "3px" }}>
              {tr("multiHint")}
            </div>
          )}
          {options.map((o) => (
            <button key={o.value}
              onClick={() => (multi && onToggle ? onToggle(id, o.value, o.value === 1) : onAnswer(id, o.value))}
              style={btn(aktiv(o.value), { textAlign: "left", fontSize: "13px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" })}>
              {multi && (
                <span style={{
                  width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                  border: `1px solid ${aktiv(o.value) ? color : "rgba(255,255,255,0.28)"}`,
                  background: aktiv(o.value) ? color : "transparent",
                }} />
              )}
              {pick(o, lang)}
            </button>
          ))}
          <button onClick={() => onAnswer(id, MISSING)}
            style={btn(value === MISSING, { textAlign: "left", fontStyle: "italic", fontSize: "13px", padding: "10px 14px" })}>
            {tr("dontKnow")}
          </button>
        </div>
      ) : scale === 2 ? (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={() => onAnswer(id, 2)} style={btn(value === 2, { padding: "9px 22px" })}>
            {pick(YES_NO.yes, lang)}
          </button>
          <button onClick={() => onAnswer(id, 1)} style={btn(value === 1, { padding: "9px 22px" })}>
            {pick(YES_NO.no, lang)}
          </button>
          <button onClick={() => onAnswer(id, MISSING)}
            style={btn(value === MISSING, { fontStyle: "italic", marginLeft: "6px" })}>
            {tr("dontKnow")}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
            {Array.from({ length: scale }, (_, k) => k + 1).map((n) => (
              <button key={n} onClick={() => onAnswer(id, n)}
                style={btn(value === n, { minWidth: "36px", textAlign: "center", fontWeight: 600 })}>
                {n}
              </button>
            ))}
            <button onClick={() => onAnswer(id, MISSING)}
              style={btn(value === MISSING, { fontStyle: "italic", marginLeft: "6px" })}>
              {tr("dontKnow")}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "Inter, sans-serif", fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>
            <span>1 = {pick(anchorsFor(scale).low, lang)}</span>
            <span>{scale} = {pick(anchorsFor(scale).high, lang)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Ergebnis ────────────────────────────────────────────────────────────────
// Zeigt ausschliesslich die vier Faehigkeiten des oeffentlichen Modells. Die
// Konstrukte des Forschungsinstruments werden erhoben und exportiert, aber weder
// angezeigt noch auf die Faehigkeiten abgebildet. Keine Prozentwerte: die
// siebenstufige Selbsteinschaetzung wird so berichtet, wie gefragt wurde.
function Result({ lang: surveyLang, answers, intake, onRestart, responseId, consent }: any) {
  const lang: Lang = surveyLang;
  const tr = (k: string) => pick((UI as any)[k], lang);
  const fmt = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce((acc, [k, v]) => acc.replace("{" + k + "}", String(v)), s);

  const caps = useMemo(
    () => CAPACITIES.map((c) => ({ cap: c, score: scoreCapacity(c.key, answers, MISSING) })),
    [answers]
  );
  const ohneWert = caps.filter((c) => c.score.mean === null).length;
  const alleIds = [...CAP_ITEMS.map((i) => i.id), ...ACTIVE.map((i) => i.id)];
  const beantwortet = alleIds.filter((id) => answers[id] !== undefined).length;

  // Datensatz: Fragen und Antworten. Die Herkunft jedes Items bleibt erhalten,
  // damit die Forschungskonstrukte spaeter getrennt ausgewertet werden koennen.
  const buildRecord = () => ({
    responseId,
    zeitpunkt: new Date().toISOString(),
    instrument: "capacity-v1 + " + INSTRUMENT_VERSION + "_research",
    erhebungssprache: surveyLang,
    intake: {
      funktion: functionLabel(intake, surveyLang),
      anbieter: intake.provider,
      mitarbeiterzahl: labelOf(FIRM_SIZE, intake.size, surveyLang),
      branche: labelOf(INDUSTRY, intake.industry, surveyLang),
      hauptsitz: labelOf(HQ, intake.hq, surveyLang),
    },
    antworten: [
      ...CAP_ITEMS.map((i) => {
        const v = answers[i.id];
        return {
          id: i.id,
          publicBlock: i.publicBlock,
          researchConstruct: null,
          includeInPublicScore: true,
          frage: pickCap(i.text, surveyLang),
          antwort: v === undefined || v === MISSING ? null : v,
          skala: "1-" + i.scale,
          status: v === MISSING ? "weiss nicht" : v === undefined ? "nicht beantwortet" : undefined,
        };
      }),
      ...ACTIVE.map((i) => {
        const v = answers[i.id];
        const mehrfach = Array.isArray(v);
        const beantw = v !== undefined && v !== MISSING;
        const werte = (i.options || []).map((o) => o.value);
        const opt = i.type === "fact" && beantw && !mehrfach
          ? i.options?.find((o) => o.value === v)
          : undefined;
        return {
          id: i.id,
          typ: i.type,
          publicBlock: "Context",
          researchConstruct: i.construct,
          includeInPublicScore: false,
          frage: surveyLang === "en" ? i.en : i.de,
          antwort: beantw ? v : null,
          antworttext: mehrfach
            ? (v as number[])
                .map((x) => i.options?.find((o) => o.value === x))
                .filter(Boolean)
                .map((o) => pick(o as any, surveyLang))
            : opt ? pick(opt, surveyLang) : undefined,
          skala: i.type === "fact" && werte.length
            ? Math.min(...werte) + "-" + Math.max(...werte)
            : "1-" + (i.scale || 7),
          umgekehrt: i.reverse ? true : undefined,
          status: v === MISSING ? "weiss nicht" : beantw ? undefined : "nicht beantwortet",
        };
      }),
    ],
  });

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(buildRecord(), null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sovereignty-assessment-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const ctaMail = (() => {
    const to = "adrian.bohrer@unisg.ch,andreas.hein@unisg.ch";
    const fn = functionLabel(intake, lang);
    const de = lang === "de";
    const lines = [
      de ? "Guten Tag" : "Dear colleagues",
      "",
      de
        ? "wir haben das Self-Assessment zur digitalen Souveränität durchgeführt und möchten die Ergebnisse in einer vertiefenden Analyse einordnen."
        : "we completed the self-assessment on digital sovereignty and would like to discuss the results in a more detailed analysis.",
      "",
      fn ? (de ? "Betrachtete Funktion: " : "Function under review: ") + fn : null,
      intake.provider ? (de ? "Anbieter: " : "Provider: ") + intake.provider : null,
      responseId ? (de ? "Antwort-Kennung: " : "Response ID: ") + responseId : null,
      "",
      de ? "Über einen Terminvorschlag freuen wir uns." : "We would appreciate a proposed date.",
      "",
      de ? "Freundliche Grüsse" : "Kind regards",
      "",
    ].filter((l) => l !== null) as string[];
    return "mailto:" + to
      + "?subject=" + encodeURIComponent(tr("ctaMailSubject"))
      + "&body=" + encodeURIComponent(lines.join("\n"));
  })();

  // Uebermittlung, einmal je abgeschlossenem Durchlauf.
  const [submitState, setSubmitState] = useState<SubmitState>(isEnabled() ? "pending" : "off");
  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current || !isEnabled() || !consent || !responseId) return;
    let done: string[] = [];
    try { done = JSON.parse(localStorage.getItem("cds13-sent") || "[]"); } catch { done = []; }
    if (done.includes(responseId)) { sentRef.current = true; setSubmitState("ok"); return; }
    sentRef.current = true;
    const payload = {
      _subject: "Self-Assessment · " + (functionLabel(intake, surveyLang) || "ohne Funktion")
        + (intake.provider ? " · " + intake.provider : ""),
      ...buildRecord(),
    };
    submitResult(payload).then((st) => {
      setSubmitState(st);
      if (st === "ok") {
        try { localStorage.setItem("cds13-sent", JSON.stringify([...done, responseId].slice(-50))); } catch { /* voll */ }
      }
    });
  }, [consent, responseId]);

  const antwortText = (i: Item): string => {
    const v = answers[i.id];
    if (v === undefined) return tr("notAnswered");
    if (Array.isArray(v)) {
      // Mehrfachauswahl wird als Menge berichtet, nie als Mittelwert.
      return v
        .map((x) => i.options?.find((o) => o.value === x))
        .filter(Boolean)
        .map((o) => pick(o as any, lang))
        .join(", ");
    }
    if (v === MISSING) return tr("dontKnow");
    if (i.type === "fact" || i.type === "multi") {
      const o = i.options?.find((x) => x.value === v);
      return o ? pick(o, lang) : String(v);
    }
    if ((i.scale || 7) === 2) return v === 2 ? pick(YES_NO.yes, lang) : pick(YES_NO.no, lang);
    return v + " / " + (i.scale || 7);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="max-w-[1100px] mx-auto px-6 lg:px-10">
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
        <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "10px" }}>
          {tr("resultEyebrow")}
        </div>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(24px,4vw,38px)", color: "white", letterSpacing: "-0.025em" }}>
          {tr("resultTitle")}
        </h2>
        {(functionLabel(intake, lang) || intake.provider) && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
            {functionLabel(intake, lang)} {intake.provider ? tr("atProvider") + " " + intake.provider : ""}
          </p>
        )}
      </div>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: 1.7, color: "rgba(255,255,255,0.62)", maxWidth: "80ch", margin: "0 auto 24px", textAlign: "center" }}>
        {tr("resultLead")}
      </p>

      <div style={{ padding: "15px 19px", borderRadius: "11px", background: "rgba(217,165,89,0.09)", border: "1px solid rgba(217,165,89,0.28)", marginBottom: "30px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <AlertTriangle size={17} style={{ color: "#d9a559", marginTop: "1px", flexShrink: 0 }} />
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
          {tr("weakHint")}
        </p>
      </div>

      <div style={{ marginBottom: "34px" }}>
        {caps.map(({ cap, score }) => (
          <div key={cap.key} style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "7px" }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "16px", color: "rgba(255,255,255,0.9)" }}>
                {pickCap(cap.label, lang)}
              </span>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10.5px", letterSpacing: "0.12em", color: cap.color + "cc", textTransform: "uppercase" }}>
                {cap.term}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}>
                {fmt(tr("itemsScored"), { a: score.valid, b: score.total })}
              </span>
            </div>

            <div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {score.mean !== null && (
                <div style={{ height: "100%", width: (score.mean / 7) * 100 + "%", borderRadius: "5px", background: cap.color }} />
              )}
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: score.mean === null ? "#d9a559" : "rgba(255,255,255,0.7)", marginTop: "6px" }}>
              {score.mean === null
                ? tr("notEnough")
                : fmt(tr("selfRating"), { v: score.mean.toFixed(1).replace(".", lang === "de" ? "," : ".") })}
            </div>
          </div>
        ))}

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
          {fmt(tr("answeredSummary"), { a: beantwortet, b: alleIds.length })}
          {ohneWert === 1 ? " " + tr("notEnoughArea") : ohneWert > 1 ? " " + fmt(tr("notEnoughAreas"), { n: ohneWert }) : ""}
        </p>

        {/* Derselbe Mailto-Link wie im Abschluss-Kasten, hier direkt unter den
            vier Werten. Bewusst leichter gestaltet und ohne Verdikt: der Kasten
            unten bleibt der Abschluss, und ein automatisch bestimmter Hebel
            darf laut Vorgabe nirgends mehr stehen. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "26px" }}>
          <a href={ctaMail} style={{
            fontFamily: "Space Grotesk, sans-serif", fontSize: "17px", fontWeight: 600,
            padding: "17px 34px", borderRadius: "11px",
            border: "1px solid rgba(139,164,255,0.34)", background: "rgba(75,110,255,0.08)",
            color: "#a8bcff", textDecoration: "none",
            display: "flex", alignItems: "center", gap: "9px",
          }}>
            <Mail size={18} /> {tr("ctaButton")} <ArrowRight size={18} />
          </a>
        </div>
      </div>

      <div style={{ marginBottom: "34px", padding: "22px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "17px", color: "white", marginBottom: "5px" }}>
          {tr("contextTitle")}
        </h3>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)", maxWidth: "78ch" }}>
          {tr("contextNotScored")}
        </p>
        {CONTEXT_GROUPS.map((g) => {
          const items = ACTIVE.filter((i) => g.constructs.includes(i.construct));
          if (!items.length) return null;
          return (
            <div key={g.key} style={{ marginTop: "18px" }}>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13.5px", color: "rgba(255,255,255,0.75)", marginBottom: "8px" }}>
                {pick(g.label, lang)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {items.map((i) => (
                  <div key={i.id} style={{ display: "flex", gap: "14px", alignItems: "baseline", flexWrap: "wrap", fontFamily: "Inter, sans-serif", fontSize: "12.5px" }}>
                    <span style={{ color: "rgba(255,255,255,0.55)", flex: 1, minWidth: "260px", lineHeight: 1.5 }}>
                      {lang === "en" ? i.en : i.de}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>{antwortText(i)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginBottom: "30px", padding: "30px 32px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(75,110,255,0.10), rgba(108,194,181,0.06))",
        border: "1px solid rgba(139,164,255,0.28)",
      }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.75)", textTransform: "uppercase", marginBottom: "12px" }}>
          {tr("ctaEyebrow")}
        </div>
        <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 400, fontSize: "clamp(20px,2.6vw,28px)", color: "white", letterSpacing: "-0.02em", margin: 0 }}>
          {tr("ctaHead")}
        </h3>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.65)", maxWidth: "78ch", marginTop: "12px" }}>
          {tr("ctaLead")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px", marginTop: "22px" }}>
          {UI.ctaItems.map((it) => (
            <div key={it.en} style={{
              display: "flex", gap: "9px", alignItems: "flex-start",
              padding: "13px 15px", borderRadius: "10px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Check size={15} style={{ color: "#6cc2b5", marginTop: "2px", flexShrink: 0 }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.45, color: "rgba(255,255,255,0.78)" }}>
                {pick(it, lang)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "24px" }}>
          <a href={ctaMail} style={{
            fontFamily: "Space Grotesk, sans-serif", fontSize: "17px", fontWeight: 600,
            padding: "17px 34px", borderRadius: "11px", border: "1px solid rgba(139,164,255,0.45)",
            background: "rgba(75,110,255,0.18)", color: "#a8bcff", textDecoration: "none",
            display: "flex", alignItems: "center", gap: "9px",
          }}>
            <Mail size={18} /> {tr("ctaButton")} <ArrowRight size={18} />
          </a>
        </div>
      </div>

      {submitState !== "off" && (
        <div style={{ textAlign: "center", marginBottom: "16px", fontFamily: "Inter, sans-serif", fontSize: "12.5px", lineHeight: 1.6 }}>
          <span style={{ color: submitState === "failed" ? "#d9a559" : "rgba(255,255,255,0.55)" }}>
            {submitState === "ok" ? tr("submitOk") : submitState === "failed" ? tr("submitFailed") : tr("submitPending")}
          </span>
          {responseId && (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "4px", fontFamily: "Share Tech Mono, monospace" }}>
              {tr("responseIdLabel")}: {responseId}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "11px", flexWrap: "wrap", justifyContent: "center", paddingBottom: "30px" }}>
        <button onClick={exportJson} style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px",
          border: "1px solid rgba(139,164,255,0.3)", background: "rgba(139,164,255,0.08)",
          color: "rgba(139,164,255,0.85)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <FileJson size={14} /> {tr("downloadJson")}
        </button>
        <button onClick={onRestart} style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <RotateCcw size={14} /> {tr("restart")}
        </button>
        <Link to="/" style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <Home size={14} /> {tr("toHome")}
        </Link>
      </div>
    </motion.div>
  );
}
