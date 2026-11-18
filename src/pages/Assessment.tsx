// Self-Assessment zur digitalen Souveraenitaet.
//
// Oeffentliches Modell: vier organisationale Faehigkeiten (Switching,
// Internalization, Multi-Sourcing, Negotiation) aus src/data/capacityItems.ts.
// Nur deren Items bilden die vier Faehigkeitswerte.
//
// Die Konstrukte des v13-Forschungsinstruments werden im fuenften Block als
// Kontext erhoben und exportiert. Sie werden nicht auf die vier Faehigkeiten
// abgebildet und nicht mit ihnen verrechnet. Auf der Ergebnisseite erscheinen
// FTC, CTO und CONT getrennt davon in der Matrix (seit 05.10.2026 wieder).
//
// "Weiss nicht" ist immer MISSING (99) und wird nie als 0 gewertet.
//
// Aufbau nach dem Redesign: Diese Datei haelt den Zustand und die Phasenfolge.
// Die Bildschirme liegen in pages/assessment/ (LanguageGate, Intro, Intake,
// BlockScreen, Result), gemeinsame Konstanten in assessment/model.ts.
import { useEffect, useMemo, useRef, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import { PauseToggle } from "../components/fx";
import { flushQueue, newResponseId } from "../data/submit";
import { type Lang } from "../data/instrument";
import { decodeResult, formatCode } from "../data/resultCode";
import { LS } from "../data/storageKeys";
import { UI, FUNCTION_OTHER, pick } from "../data/surveyUi";
import {
  load, save, drop, BLOCKS, EMPTY_ANSWERS, EMPTY_INTAKE,
  type Answers, type IntakeState, type Phase, type TrKey,
} from "./assessment/model";
import LanguageGate from "./assessment/LanguageGate";
import Intro from "./assessment/Intro";
import Intake from "./assessment/Intake";
import BlockScreen from "./assessment/BlockScreen";
import Result from "./assessment/Result";

export type { BlockDef } from "./assessment/model";

export default function Assessment() {
  const [lang, setLang] = useState<Lang | null>(() => load<Lang | null>(LS.lang, null));
  const [phase, setPhase] = useState<Phase>(() => load<Phase>(LS.phase, "lang"));
  const [blockIndex, setBlockIndex] = useState<number>(() => load(LS.block, 0));
  const [answers, setAnswers] = useState<Answers>(() => load<Answers>(LS.ans, {}));
  const [consent, setConsent] = useState<boolean>(() => load(LS.consent, false));
  const [responseId, setResponseId] = useState<string>(() => load(LS.rid, ""));
  const [intake, setIntake] = useState<IntakeState>(() => {
    const raw = load<Partial<IntakeState> & { fn?: string }>(LS.intake, EMPTY_INTAKE);
    // aelterer Stand mit freiem Funktionsfeld
    if (raw && raw.fn !== undefined && raw.fnKey === undefined) {
      return { ...EMPTY_INTAKE, fnKey: raw.fn ? FUNCTION_OTHER : "", fnOther: raw.fn || "", provider: raw.provider || "" };
    }
    return { ...EMPTY_INTAKE, ...raw };
  });

  useEffect(() => { save(LS.lang, lang); }, [lang]);
  useEffect(() => { save(LS.phase, phase); }, [phase]);
  useEffect(() => { save(LS.block, blockIndex); }, [blockIndex]);
  useEffect(() => { save(LS.ans, answers); }, [answers]);
  useEffect(() => { save(LS.intake, intake); }, [intake]);
  useEffect(() => { save(LS.consent, consent); }, [consent]);
  useEffect(() => { save(LS.rid, responseId); }, [responseId]);

  // Anmeldung mit Ergebnis-Code (data/resultCode.ts): zeigt die Werte aus dem Code als
  // Ergebnisseite, ohne Antworten in diesem Browser.
  // Gilt nur auf dem Intro nach der Sprachwahl; sobald ein eigener Durchgang laeuft,
  // faellt die Anmeldung hier weg.
  const [codeLogin, setCodeLogin] = useState<string | null>(() => {
    const c = load<string | null>(LS.code, null);
    return typeof c === "string" && decodeResult(c) ? formatCode(c) : null;
  });
  const codeResult = useMemo(() => (codeLogin ? decodeResult(codeLogin) : null), [codeLogin]);
  const showCode = !!codeResult && !!lang && phase === "intro";
  useEffect(() => { if (phase !== "lang" && phase !== "intro") setCodeLogin(null); }, [phase]);
  // Nach An- und Abmelden verschwindet das bediente Element; Fokus an den Hinweis
  // der Code-Ansicht bzw. zurueck ins Eingabefeld.
  const codeFocus = useRef<"note" | "form" | null>(null);
  useEffect(() => {
    const f = codeFocus.current;
    codeFocus.current = null;
    if (f) document.getElementById(f === "note" ? "result-title" : "intro-code")?.focus();
  }, [codeLogin]);
  const loginCode = (c: string) => { codeFocus.current = "note"; save(LS.code, c); setCodeLogin(c); window.scrollTo(0, 0); };
  const logoutCode = () => { codeFocus.current = "form"; drop(LS.code); setCodeLogin(null); window.scrollTo(0, 0); };

  // Liegengebliebene Uebermittlungen aus frueheren Durchlaeufen nachreichen.
  useEffect(() => { flushQueue(); }, []);

  const L = (lang || "en") as Lang;
  // ctaItems ist als einziger UI-Eintrag ein Array und wird direkt gerendert,
  // deshalb nimmt tr() nur die Schlüssel mit einfachem {en,de}-Wert.
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
    setPhase("lang"); setLang(null); setConsent(false); setResponseId(""); setCodeLogin(null);
    Object.values(LS).forEach(drop);
  };

  // Darstellung: Navigiert die Besucherin (Klick auf Weiter, Zurueck usw.), landet der Fokus
  // im neuen Schritt auf dessen Ueberschrift und die Seite scrollt nach oben. Beim ersten
  // Laden (Fortsetzen nach Reload) bleibt der Fokus, wo er ist.
  const navRef = useRef(false);
  const nav = () => { navRef.current = true; };

  return (
    <div className="as-page">
      {/* Der Inhalt traegt den Abstand selbst (tiefgruene Baender liegen bis an den Rand),
          die Fusszeile schliesst darunter an. lang="en" nur im Inhalt, nicht in der Fusszeile. */}
      <main className="as-main" lang={lang === "en" ? "en" : undefined}>
      {/* Pause-Knopf (WCAG 2.2.2) als erster Tab-Stopp. Die Ergebnisseite bringt ihren eigenen mit. */}
      {phase !== "result" && !showCode && <PauseToggle lang={lang ?? undefined} />}
      {/* Bewusst ohne AnimatePresence: mit Wrapper-Komponenten als Kindern meldet die
          Exit-Animation nie "fertig", und die naechste Phase wird nie montiert.
          Die Einblend-Animation steckt in den Screens selbst. */}
      {showCode && (
        <Result
          key={"code-" + codeLogin} lang={L} answers={EMPTY_ANSWERS} intake={{ ...EMPTY_INTAKE, ...codeResult!.intake }}
          onRestart={logoutCode} responseId="" consent={false} fromCode={codeResult} code={codeLogin}
        />
      )}
      {phase === "lang" && (
        <LanguageGate key="lang" focusOnMount={navRef.current} onPick={(l) => { nav(); setLang(l); setPhase("intro"); }} />
      )}
      {phase === "intro" && lang && !showCode && (
        <Intro
          key="intro" lang={L} tr={tr} consent={consent} setConsent={setConsent} onCode={loginCode}
          focusOnMount={navRef.current}
          onStart={() => { nav(); if (!responseId) setResponseId(newResponseId()); setPhase("intake"); }}
        />
      )}
      {phase === "intake" && lang && (
        <Intake
          key="intake" lang={L} tr={tr} intake={intake} setIntake={setIntake} focusOnMount={navRef.current}
          onBack={() => { nav(); setPhase("intro"); }} onNext={() => { nav(); setBlockIndex(0); setPhase("blocks"); }}
        />
      )}
      {phase === "blocks" && lang && (
        <BlockScreen
          key={`b-${blockIndex}`} lang={L} tr={tr} blockIndex={blockIndex} focusOnMount={navRef.current}
          answers={answers} onAnswer={answer} onToggle={toggleMulti} intake={intake}
          onBack={() => { nav(); if (blockIndex > 0) setBlockIndex(blockIndex - 1); else setPhase("intake"); }}
          onNext={() => {
            nav();
            if (blockIndex < BLOCKS.length - 1) { setBlockIndex(blockIndex + 1); return; }
            // Ein frisch abgeschlossenes Assessment ersetzt eine Anmeldung mit Ergebnis-Code
            // auf dieser Seite.
            drop(LS.code);
            setCodeLogin(null);
            setPhase("result");
          }}
        />
      )}
      {phase === "result" && lang && (
        <Result
          key="result" lang={L} answers={answers} intake={intake} responseId={responseId} consent={consent}
          focusOnMount={navRef.current} onRestart={() => { nav(); reset(); }}
        />
      )}
      </main>

      <SiteFooter />
    </div>
  );
}
