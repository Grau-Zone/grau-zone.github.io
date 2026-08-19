// Organisation Self-Assessment auf Basis des v13-Instruments
// (Refined Digital Sovereignty Model: Response Capabilities → Mechanisms →
// Digital Sovereignty → Outcome).
//
// Zwei Fragetypen: Likert (5-/7-stufig, teils reverse) und Faktenfragen mit
// festen Stufen. "Weiß nicht" ist immer MISSING (99) und wird NIE als 0 gewertet.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Home, RotateCcw, FileJson, Info, AlertTriangle, Mail, Check } from "lucide-react";
import ConstructionStamp from "../components/ConstructionStamp"; // TEMP
import SovereigntyModelDiagram, { type NodeScores } from "../components/SovereigntyModelDiagram";
import { SovereigntyMatrix, CausalChain } from "../components/ResultVisuals";
import { CONSTRUCTS, ITEMS, MISSING, type Item, type Lang } from "../data/instrument";
import { UI, STEPS, CONSTRUCT_NAMES, CONSTRUCT_SUFFIX, FUNCTIONS, FUNCTION_OTHER, FIRM_SIZE, INDUSTRY, HQ, labelOf, anchorsFor, YES_NO, pick } from "../data/surveyUi";

type Answers = Record<string, number>;
type Phase = "lang" | "intro" | "intake" | "blocks" | "result";

const LS = { lang: "cds13-lang", ans: "cds13-answers", phase: "cds13-phase", block: "cds13-block", intake: "cds13-intake" };
const load = <T,>(k: string, f: T): T => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
};

// ─── Farben je Modellspalte ──────────────────────────────────────────────────
const STEP_COLOR: Record<string, string> = {
  "1 Response Capabilities": "#6b9bd8",
  "2 Mechanisms": "#d9a559",
  "3 Digital Sovereignty": "#cf87a5",
  "4 Outcome": "#6cc2b5",
};
// Nur die in der Excel ausgewaehlten Items (Spalte "Auswahl 3")
const ACTIVE = ITEMS.filter((i) => i.selected);
const itemsOfConstruct = (c: string) => ACTIVE.filter((i) => i.construct === c);
const constructsOfStep = (s: string) => CONSTRUCTS.filter((c) => c.step === s);

// ─── Auswertung ──────────────────────────────────────────────────────────────
// Likert je Konstrukt: Mittel der beantworteten Items, reverse gedreht, auf 0..1.
function likertScore(constructKey: string, a: Answers): { value: number | null; answered: number; total: number } {
  const items = itemsOfConstruct(constructKey).filter((i) => i.type === "likert");
  const vals: number[] = [];
  items.forEach((i) => {
    const v = a[i.id];
    if (v === undefined || v === MISSING) return;
    const max = i.scale || 7;
    const corrected = i.reverse ? max + 1 - v : v;
    vals.push((corrected - 1) / (max - 1)); // 0..1
  });
  return {
    value: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null,
    answered: vals.length,
    total: items.length,
  };
}

// Faktenindizes bleiben Stufen — formatives Composite, kein Mittelwert.
function factRows(constructKey: string, a: Answers) {
  return itemsOfConstruct(constructKey)
    .filter((i) => i.type === "fact")
    .map((i) => {
      const v = a[i.id];
      const answered = v !== undefined && v !== MISSING;
      const opt = answered ? i.options?.find((o) => o.value === v) : undefined;
      const maxV = Math.max(...(i.options || []).map((o) => o.value));
      const independent = i.independentFrom !== undefined && answered ? v >= i.independentFrom : null;
      return { item: i, value: answered ? v : null, opt, maxV, independent };
    });
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

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

  const L = (lang || "en") as Lang;
  // ctaItems ist als einziger UI-Eintrag ein Array und wird direkt gerendert,
  // deshalb nimmt tr() nur die Schlüssel mit einfachem {en,de}-Wert.
  type TrKey = { [K in keyof typeof UI]: (typeof UI)[K] extends { en: string } ? K : never }[keyof typeof UI];
  const tr = (k: TrKey) => pick(UI[k] as { en: string; de: string }, L);

  const answer = (id: string, v: number) => setAnswers((p) => ({ ...p, [id]: v }));

  const reset = () => {
    setAnswers({}); setBlockIndex(0); setIntake(EMPTY_INTAKE);
    setPhase("lang"); setLang(null);
    Object.values(LS).forEach((k) => localStorage.removeItem(k));
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: "96px", paddingBottom: "64px" }}>
      <ConstructionStamp />
      {/* Bewusst ohne AnimatePresence: mit Wrapper-Komponenten als Kindern meldet die
          Exit-Animation nie "fertig", und die naechste Phase wird nie montiert.
          Die Einblend-Animation steckt in den Screens selbst. */}
      {phase === "lang" && (
        <LanguageGate key="lang" onPick={(l) => { setLang(l); setPhase("intro"); }} />
      )}
      {phase === "intro" && lang && (
        <Intro key="intro" lang={L} tr={tr} onStart={() => setPhase("intake")} />
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
          answers={answers} onAnswer={answer} intake={intake}
          onBack={() => (blockIndex > 0 ? setBlockIndex(blockIndex - 1) : setPhase("intake"))}
          onNext={() => (blockIndex < STEPS.length - 1 ? setBlockIndex(blockIndex + 1) : setPhase("result"))}
        />
      )}
      {phase === "result" && lang && (
        <Result key="result" lang={L} tr={tr} answers={answers} intake={intake} onRestart={reset} />
      )}
    </div>
  );
}

// ─── Sprachauswahl ───────────────────────────────────────────────────────────
function LanguageGate({ onPick }: { onPick: (l: Lang) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "14px" }}>
        {UI.eyebrow.en}
      </div>
      <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(26px, 4.5vw, 42px)", color: "white", marginBottom: "10px", letterSpacing: "-0.025em" }}>
        {UI.langTitle.en} · {UI.langTitle.de}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14.5px", marginBottom: "40px" }}>
        {UI.langLead.en}
      </p>

      <div className="flex flex-col items-center gap-4">
        {/* Empfehlung: Englisch — bewusst groesser */}
        <button
          onClick={() => onPick("en")}
          style={{
            fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "21px",
            padding: "22px 56px", borderRadius: "14px",
            border: "1px solid rgba(75,110,255,0.55)", background: "rgba(75,110,255,0.22)",
            color: "#ffffff", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "12px",
            boxShadow: "0 0 50px rgba(75,110,255,0.25)",
          }}
        >
          {UI.langEn.en} <ArrowRight size={20} />
        </button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(139,164,255,0.85)", marginTop: "-6px" }}>
          ★ {UI.langEnHint.en}
        </div>

        <button
          onClick={() => onPick("de")}
          style={{
            fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "14px",
            padding: "11px 26px", borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.7)", cursor: "pointer", marginTop: "10px",
          }}
        >
          {UI.langDe.de}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Intro ───────────────────────────────────────────────────────────────────
function Intro({ lang, tr, onStart }: { lang: Lang; tr: (k: any) => string; onStart: () => void }) {
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

      <div className="flex flex-wrap gap-3 justify-center mb-9">
        {STEPS.map((s, i) => (
          <div key={s.key} style={{
            padding: "8px 15px", borderRadius: "9px",
            background: `${STEP_COLOR[s.key]}14`, border: `1px solid ${STEP_COLOR[s.key]}40`,
            fontFamily: "Space Grotesk, sans-serif", fontSize: "12.5px", color: STEP_COLOR[s.key],
          }}>
            {i + 1} · {pick(s.label, lang)}
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={onStart} style={{
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
        {ACTIVE.length} {tr("questionsCount")} · {tr("minutes")}
      </p>
    </motion.div>
  );
}

// ─── Intake: Funktion + Anbieter ─────────────────────────────────────────────
function Intake({ lang, tr, intake, setIntake, onBack, onNext }: any) {
  const [touched, setTouched] = useState(false);
  const chosen = intake.fnKey as string;
  const valid = chosen && (chosen !== FUNCTION_OTHER || intake.fnOther.trim().length > 0);

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

// ─── Fragenblock (eine Modellspalte) ─────────────────────────────────────────
function BlockScreen({ lang, tr, blockIndex, answers, onAnswer, onBack, onNext, intake }: any) {
  const step = STEPS[blockIndex];
  const color = STEP_COLOR[step.key];
  const constructs = constructsOfStep(step.key);
  const all = constructs.flatMap((c) => itemsOfConstruct(c.key));
  const answered = all.filter((i) => answers[i.id] !== undefined).length;
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [blockIndex]);

  // Platzhalter der Items durch die Angaben aus dem Intake ersetzen
  const fnLabel = functionLabel(intake, lang);
  const fill = (s: string) =>
    s.replace(/\[FUNCTION\]|<FUNCTION>/g, fnLabel || (lang === "en" ? "this function" : "diese Funktion"))
     .replace(/\[PROVIDER\]|<PROVIDER>/g, intake.provider || (lang === "en" ? "this provider" : "diesem Anbieter"));

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      className="max-w-3xl mx-auto px-4">
      <div ref={topRef} />
      <div style={{ display: "flex", gap: "4px", marginBottom: "26px" }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{
            height: "3px", flex: 1, borderRadius: "2px",
            background: i < blockIndex ? "#6b9bd8" : i === blockIndex ? color : "rgba(255,255,255,0.09)",
          }} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.2em", color, textTransform: "uppercase" }}>
          {tr("block")} {blockIndex + 1} {tr("of")} {STEPS.length}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>
          {answered}/{all.length} {tr("answered")}
        </span>
      </div>
      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(22px,4vw,32px)", color: "white", marginBottom: "6px", letterSpacing: "-0.02em" }}>
        {pick(step.label, lang)}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "26px" }}>{pick(step.sub, lang)}</p>

      {(fnLabel || intake.provider) && (
        <div style={{ padding: "12px 16px", borderRadius: "9px", background: `${color}0d`, border: `1px solid ${color}26`, marginBottom: "26px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Info size={15} style={{ color, marginTop: "2px", flexShrink: 0 }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
            {fnLabel || "—"} {tr("atProvider")} {intake.provider || "—"}
          </span>
        </div>
      )}

      {constructs.map((c) => (
        <div key={c.key} style={{ marginBottom: "30px" }}>
          <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "14.5px", color: "rgba(255,255,255,0.75)", marginBottom: "2px" }}>
            {pick(CONSTRUCT_NAMES[c.key], lang)}
            {CONSTRUCT_SUFFIX[c.key] && (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}> · {pick(CONSTRUCT_SUFFIX[c.key], lang)}</span>
            )}
          </h3>
          <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10.5px", letterSpacing: "0.12em", color: `${color}cc`, textTransform: "uppercase", marginBottom: "12px" }}>
            {c.key}{c.fact ? " · " + tr("factHead") : ""}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            {itemsOfConstruct(c.key).map((it) => (
              <QuestionCard key={it.id} item={it} lang={lang} tr={tr} color={color}
                value={answers[it.id]} onAnswer={onAnswer} fill={fill} />
            ))}
          </div>
        </div>
      ))}

      <Nav tr={tr} onBack={onBack} onNext={onNext} color={color}
        nextLabel={blockIndex === STEPS.length - 1 ? tr("showResult") : tr("next")} />
    </motion.div>
  );
}

// ─── Einzelfrage ─────────────────────────────────────────────────────────────
function QuestionCard({ item, lang, tr, color, value, onAnswer, fill }: {
  item: Item; lang: Lang; tr: (k: any) => string; color: string;
  value: number | undefined; onAnswer: (id: string, v: number) => void; fill: (s: string) => string;
}) {
  const text = fill(lang === "en" ? item.en : item.de);
  const answered = value !== undefined;
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
      <div style={{ display: "flex", gap: "10px", marginBottom: "11px" }}>
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: `${color}99`, paddingTop: "3px", flexShrink: 0 }}>
          {item.id}
        </span>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 1.55, margin: 0 }}>{text}</p>
      </div>

      {item.type === "likert" ? (
        (item.scale || 7) === 2 ? (
          // 2-stufiges Item (C2-4): als Ja/Nein statt als Zustimmungsskala
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button onClick={() => onAnswer(item.id, 2)} style={btn(value === 2, { padding: "9px 22px" })}>
              {pick(YES_NO.yes, lang)}
            </button>
            <button onClick={() => onAnswer(item.id, 1)} style={btn(value === 1, { padding: "9px 22px" })}>
              {pick(YES_NO.no, lang)}
            </button>
            <button onClick={() => onAnswer(item.id, MISSING)}
              style={btn(value === MISSING, { fontStyle: "italic", marginLeft: "6px" })}>
              {tr("dontKnow")}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
              {Array.from({ length: item.scale || 7 }, (_, k) => k + 1).map((n) => (
                <button key={n} onClick={() => onAnswer(item.id, n)}
                  style={btn(value === n, { minWidth: "36px", textAlign: "center", fontWeight: 600 })}>
                  {n}
                </button>
              ))}
              <button onClick={() => onAnswer(item.id, MISSING)}
                style={btn(value === MISSING, { fontStyle: "italic", marginLeft: "6px" })}>
                {tr("dontKnow")}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "Inter, sans-serif", fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>
              <span>1 = {pick(anchorsFor(item.scale || 7).low, lang)}</span>
              <span>{item.scale || 7} = {pick(anchorsFor(item.scale || 7).high, lang)}</span>
            </div>
          </>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {item.options?.map((o) => (
            <button key={o.value} onClick={() => onAnswer(item.id, o.value)}
              style={btn(value === o.value, { textAlign: "left", fontSize: "13px", padding: "10px 14px" })}>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", opacity: 0.65, marginRight: "9px" }}>
                {o.value}
              </span>
              {pick(o, lang)}
            </button>
          ))}
          <button onClick={() => onAnswer(item.id, MISSING)}
            style={btn(value === MISSING, { textAlign: "left", fontStyle: "italic", fontSize: "13px", padding: "10px 14px" })}>
            {tr("dontKnow")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ergebnis ────────────────────────────────────────────────────────────────
function Result({ lang: surveyLang, answers, intake, onRestart }: any) {
  // Die Ergebnisseite ist bewusst deutsch, unabhaengig davon, in welcher Sprache
  // der Fragebogen ausgefuellt wurde: gelesen und weitergereicht wird sie im
  // deutschsprachigen Haus. Die Fachbegriffe des Modells bleiben englisch, weil
  // sie so im Instrument, im Diagramm und in der Publikation heissen.
  const lang: Lang = "de";
  const TERM: Lang = "en";
  const tr = (k: string) => pick((UI as any)[k], lang);
  const scores = useMemo(() => {
    const s: Record<string, ReturnType<typeof likertScore>> = {};
    CONSTRUCTS.forEach((c) => { s[c.key] = likertScore(c.key, answers); });
    return s;
  }, [answers]);

  const exportJson = () => {
    const data = {
      timestamp: new Date().toISOString(), instrument: "v13_Instrument_final", lang: surveyLang,
      intake: {
        ...intake,
        functionLabel: functionLabel(intake, surveyLang),
        sizeLabel: labelOf(FIRM_SIZE, intake.size, surveyLang),
        industryLabel: labelOf(INDUSTRY, intake.industry, surveyLang),
        hqLabel: labelOf(HQ, intake.hq, surveyLang),
      },
      constructs: Object.fromEntries(CONSTRUCTS.map((c) => [c.key, {
        name: c.name, step: c.step,
        likert: scores[c.key].value === null ? null : Math.round(scores[c.key].value! * 100),
        answered: scores[c.key].answered, total: scores[c.key].total,
      }])),
      factIndices: Object.fromEntries(CONSTRUCTS.filter((c) => itemsOfConstruct(c.key).some((i) => i.type === "fact")).map((c) => c.key).map((k) => [k, factRows(k, answers).map((r) => ({
        id: r.item.id, level: r.value, max: r.maxV, providerIndependent: r.independent,
      }))])),
      rawAnswers: answers,
      note: "MISSING=99 is 'do not know' and is never scored as zero.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `sovereignty-assessment-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const section = (title: string, sub?: string) => (
    <div style={{ marginBottom: "14px" }}>
      <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "16px", color: "white", marginBottom: sub ? "3px" : 0 }}>{title}</h3>
      {sub && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", color: "rgba(255,255,255,0.45)" }}>{sub}</p>}
    </div>
  );

  // Balken nur fuer Konstrukte mit Likert-Items (C2 und T3 sind reine Faktenindizes)
  // Zuordnung Diagramm-Knoten -> Instrument. Nur namensgleiche Konstrukte werden
  // eingefaerbt; PSC/IOC/MPM/ORB/AAR erhebt dieses Instrument nicht und bleiben grau.
  const nodeScores: NodeScores = useMemo(() => {
    const m: NodeScores = {
      ALT: scores["ALT"].value, ROC: scores["ROC"].value,
      FTC: scores["FTC"].value, CTO: scores["CTO"].value, CONT: scores["CONT"].value,
    };
    // Faktenindizes: Anteil der erreichten Stufen (nur zur Darstellung im Diagramm)
    const factShare = (ck: string): number | null => {
      const rows = factRows(ck, answers).filter((r) => r.value !== null);
      if (!rows.length) return null;
      const got = rows.reduce((a, r) => a + (r.value! - Math.min(...r.item.options!.map((o) => o.value))), 0);
      const max = rows.reduce((a, r) => a + (r.maxV - Math.min(...r.item.options!.map((o) => o.value))), 0);
      return max > 0 ? got / max : null;
    };
    m["ATR"] = factShare("C2");   // Audit and Transparency Rights
    m["DKC"] = factShare("T3");   // Data and Key Control
    return m;
  }, [answers, scores]);

  // Groesster Hebel = die SCHWAECHERE der beiden Souveraenitaetsdimensionen.
  // Begruendung aus dem Modell: FTC und CTO treiben Kontinuitaet gemeinsam
  // (Interaktionsknoten), also deckelt die schwaechere, was die staerkere
  // leisten kann. Bewusst NICHT die global schwaechste Response Capability:
  // an einer Capability zu arbeiten, die nicht auf die eigene Schwachstelle
  // einzahlt, hebt nichts.
  const lever = useMemo(() => {
    const f = scores["FTC"].value, c = scores["CTO"].value;
    if (f === null && c === null) return null;
    if (f === null) return { keys: ["CTO"], value: c as number, tie: false };
    if (c === null) return { keys: ["FTC"], value: f, tie: false };
    if (Math.abs(f - c) < 1e-9) return { keys: ["FTC", "CTO"], value: f, tie: true };
    return f < c
      ? { keys: ["FTC"], value: f, tie: false }
      : { keys: ["CTO"], value: c, tie: false };
  }, [scores]);

  const leverNames = lever ? lever.keys.map((k) => pick(CONSTRUCT_SUFFIX[k], TERM)).join(" + ") : null;
  const leverLong  = lever ? lever.keys.map((k) => pick(CONSTRUCT_NAMES[k], TERM)).join(" · ") : null;

  // Quadrant der Matrix in Worten: Schwelle ist die Mitte der Skala.
  const quadrant = useMemo(() => {
    const f = scores["FTC"].value, c = scores["CTO"].value;
    if (f === null || c === null) return null;
    // Streng groesser: der Skalenmittelpunkt ist Unentschiedenheit, keine Zustimmung.
    // Bei genau 0.5 waere "souveraen" eine Behauptung, die die Antwort nicht hergibt.
    const hiF = f > 0.5, hiC = c > 0.5;
    if (hiF && hiC)  return { name: UI.quadSovereign, desc: UI.quadDesc.sovereign, color: "#6cc2b5" };
    if (hiF && !hiC) return { name: UI.quadExit,      desc: UI.quadDesc.exit,      color: "#6b9bd8" };
    if (!hiF && hiC) return { name: UI.quadSettled,   desc: UI.quadDesc.settled,   color: "#d9a559" };
    return { name: UI.quadExposed, desc: UI.quadDesc.exposed, color: "#cf87a5" };
  }, [scores]);

  // Eine Kennzahl im Verdikt-Streifen
  const figure = (key: string, color: string, binding: boolean) => {
    const sc = scores[key];
    const label = CONSTRUCT_SUFFIX[key] ? pick(CONSTRUCT_SUFFIX[key], TERM) : pick(CONSTRUCT_NAMES[key], TERM);
    return (
      <div style={{ textAlign: "center", minWidth: "150px" }}>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif", fontWeight: 300,
          fontSize: "clamp(34px,5vw,52px)", lineHeight: 1.05, letterSpacing: "-0.03em",
          color: sc.value === null ? "rgba(255,255,255,0.28)" : color,
        }}>
          {sc.value === null ? "—" : `${Math.round(sc.value * 100)}%`}
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.72)", marginTop: "7px", lineHeight: 1.35 }}>
          {label}
        </div>
        {sc.answered < sc.total && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
            {sc.answered}/{sc.total} {tr("answered")}
          </div>
        )}
        {binding && (
          <div style={{
            display: "inline-block", marginTop: "8px", padding: "3px 10px", borderRadius: "5px",
            fontFamily: "Inter, sans-serif", fontSize: "10.5px", letterSpacing: "0.04em",
            background: "rgba(217,165,89,0.18)", color: "#d9a559", border: "1px solid rgba(217,165,89,0.32)",
          }}>
            {lever?.tie ? tr("verdictBoth") : tr("verdictBinding")}
          </div>
        )}
      </div>
    );
  };

  const ctaMail = (() => {
    const to = "adrian.bohrer@unisg.ch,andreas.hein@unisg.ch";
    const fn = functionLabel(intake, lang);
    const lines = [
      "Kontext aus dem Self-Assessment:",
      fn ? `Funktion: ${fn}` : "",
      intake.provider ? `Anbieter: ${intake.provider}` : "",
      leverLong ? `${tr("ctaLever")}: ${leverLong} (${Math.round(lever!.value * 100)}%)` : "",
      "",
    ].filter(Boolean);
    return `mailto:${to}?subject=${encodeURIComponent(tr("ctaMailSubject"))}&body=${encodeURIComponent(lines.join("\n"))}`;
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="max-w-[1600px] mx-auto px-6 lg:px-10">
      {/* Kopf */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "10px" }}>
          {tr("resultEyebrow")}
        </div>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(24px,4vw,38px)", color: "white", letterSpacing: "-0.025em" }}>
          {tr("resultTitle")}
        </h2>
        {(functionLabel(intake, lang) || intake.provider) && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13.5px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
            {functionLabel(intake, lang)} {intake.provider ? `${tr("atProvider")} ${intake.provider}` : ""}
          </p>
        )}
      </div>

      {/* Warnung: nicht validiert */}
      <div style={{ padding: "15px 19px", borderRadius: "11px", background: "rgba(217,165,89,0.09)", border: "1px solid rgba(217,165,89,0.28)", marginBottom: "34px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <AlertTriangle size={17} style={{ color: "#d9a559", marginTop: "1px", flexShrink: 0 }} />
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
          {tr("weakHint")}
        </p>
      </div>

      {/* ── Verdikt: welche Dimension begrenzt heute? ── */}
      {(scores["FTC"].value !== null || scores["CTO"].value !== null) && (
        <div style={{
          marginBottom: "40px", padding: "26px 28px", borderRadius: "14px",
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.09)",
        }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: "20px" }}>
            {tr("verdictHead")}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(14px,3vw,44px)", flexWrap: "wrap" }}>
            {figure("FTC", "#6b9bd8", lever?.keys.includes("FTC") ?? false)}
            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "26px", color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>×</span>
            {figure("CTO", "#5cbf8a", lever?.keys.includes("CTO") ?? false)}
            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>&rarr;</span>
            {figure("CONT", "#6cc2b5", false)}
          </div>

          {/* Gleicher Mailto-Link wie im Abschluss-CTA, hier bewusst leichter
              gestaltet: der Kasten unten bleibt der primaere Abschluss. */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "26px" }}>
            <a href={ctaMail} style={{
              fontFamily: "Space Grotesk, sans-serif", fontSize: "13.5px", fontWeight: 500,
              padding: "11px 21px", borderRadius: "9px",
              border: "1px solid rgba(139,164,255,0.34)", background: "rgba(75,110,255,0.08)",
              color: "#a8bcff", textDecoration: "none",
              display: "flex", alignItems: "center", gap: "9px",
            }}>
              <Mail size={14} /> {tr("ctaButton")} <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}

      {/* ── Visualisierung 1: Souveränitaets-Matrix ── */}
      <div style={{ marginBottom: "40px" }}>
        {section(tr("matrixHead"), tr("matrixLead"))}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SovereigntyMatrix
              ftc={scores["FTC"].value} cto={scores["CTO"].value} cont={scores["CONT"].value} lang={lang}
            />
          </div>
          <div>
            {quadrant ? (
              <>
                <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "9px" }}>
                  {tr("quadHead")}
                </div>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(19px,2.2vw,25px)", fontWeight: 400, color: quadrant.color, letterSpacing: "-0.015em", marginBottom: "12px" }}>
                  {pick(quadrant.name, lang)}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.68)", maxWidth: "46ch", margin: 0 }}>
                  {pick(quadrant.desc, lang)}
                </p>
              </>
            ) : (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.5)", fontStyle: "italic", margin: 0 }}>
                {tr("notAnswered")}
              </p>
            )}
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
              {pick(UI.outcomeDot, lang)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Visualisierung 2: Wirkkette ── */}
      <div style={{ marginBottom: "40px", padding: "22px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {section(tr("chainHead"), tr("chainLead"))}
        <CausalChain lang={lang} steps={STEPS.map((st) => {
          const keys = constructsOfStep(st.key)
            .filter((c) => itemsOfConstruct(c.key).some((i) => i.type === "likert"))
            .map((c) => c.key);
          const vals = keys.map((k) => scores[k].value).filter((v): v is number => v !== null);
          return {
            key: st.key, label: pick(st.label, TERM), color: STEP_COLOR[st.key],
            value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
          };
        })} />
      </div>

      {/* ── Visualisierung 3: eigene Werte im Modell ── */}
      <div style={{ marginBottom: "44px" }}>
        {section(tr("diagramHead"), tr("diagramLead"))}
        <SovereigntyModelDiagram scores={nodeScores} />
      </div>

      {/* ── Call to Action ── */}
      <div style={{
        marginBottom: "34px", padding: "30px 32px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(75,110,255,0.10), rgba(108,194,181,0.06))",
        border: "1px solid rgba(139,164,255,0.28)",
      }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.75)", textTransform: "uppercase", marginBottom: "12px" }}>
          {tr("ctaEyebrow")}
        </div>
        <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 400, fontSize: "clamp(20px,2.6vw,29px)", color: "white", letterSpacing: "-0.02em", margin: 0 }}>
          {leverNames ? `${tr("ctaLever")}: ` : ""}
          <span style={{ color: leverNames ? "#8ba4ff" : "white" }}>{leverNames ?? tr("ctaLeverNone")}</span>
        </h3>
        {leverLong && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", marginTop: "7px" }}>
            {leverLong} · {Math.round(lever!.value * 100)}%
          </div>
        )}
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.65)", maxWidth: "68ch", marginTop: "12px" }}>
          {tr("ctaLead")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "12px", marginTop: "22px" }}>
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

        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", marginTop: "24px" }}>
          <a href={ctaMail} style={{
            fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 500,
            padding: "13px 24px", borderRadius: "9px", border: "1px solid rgba(139,164,255,0.45)",
            background: "rgba(75,110,255,0.18)", color: "#a8bcff", textDecoration: "none",
            display: "flex", alignItems: "center", gap: "9px",
          }}>
            <Mail size={15} /> {tr("ctaButton")} <ArrowRight size={15} />
          </a>
          {leverNames && (
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11.5px", color: "rgba(255,255,255,0.5)", maxWidth: "46ch", lineHeight: 1.5 }}>
              {tr("ctaLeverNote")}
            </span>
          )}
        </div>
      </div>

      {/* Aktionen */}
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
        <Link to="/#modell" style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px",
          border: "1px solid rgba(75,110,255,0.3)", background: "rgba(75,110,255,0.1)",
          color: "#8ba4ff", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px",
        }}>
          {tr("toModel")} <ArrowRight size={14} />
        </Link>
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
