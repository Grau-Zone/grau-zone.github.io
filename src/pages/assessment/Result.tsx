// Ergebnisseite des Self-Assessments (eigener Lauf oder Ansicht aus einem Ergebnis-Code).
// Die Logik ist unveraendert aus pages/Assessment.tsx uebernommen; neu ist nur die Darstellung.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Home, RotateCcw, FileJson, Mail, Check, Copy } from "lucide-react";
import { submitResult, isEnabled, type SubmitState } from "../../data/submit";
import { MISSING, INSTRUMENT_VERSION, type Item, type Lang } from "../../data/instrument";
import { ACTIVE, constructScores, quadrantKey, scoreRespondent, type QuadKey } from "../../data/scoring";
import { encodeResult, type DecodedResult } from "../../data/resultCode";
import ComparisonView, { QuadrantReveal } from "../../components/ComparisonView";
import { SovereigntyMatrix, QUAD_VIEW } from "../../components/ResultVisuals";
import { RESULT_VIEW, useRevealOnce } from "../../components/ResultVisuals";
import { CSS_EASE_IN_OUT, CSS_EASE_OUT, DecodeText, LockOn, Magnetic, PauseToggle, Ping, Reveal, useReducedMotionSafe } from "../../components/fx";
import { ResultFxStyles, playSteps, useSvgUid } from "../../components/resultfx";
import { AmbientField } from "../../rx/AmbientField";
import { RiseWords } from "./ui";
import { useStepEntry } from "./hooks";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { BENCHMARK, hasBenchmark, fmtAsOf, fmtPct, isSmall } from "../../data/benchmark";
import { ALL, groupsOf } from "../../data/benchmarkGroups";
import { UI, CONTEXT_GROUPS, FIRM_SIZE, INDUSTRY, HQ, labelOf, YES_NO, pick } from "../../data/surveyUi";
import { CAPACITIES, CAP_ITEMS, itemsOfCapacity, scoreCapacity, pickCap } from "../../data/capacityItems";
import { save, functionLabel, type Answers, type IntakeState } from "./model";

// Gruene Woerter der Titelzeile je Sprache (nur Darstellung).
const TITLE_EM: Record<Lang, string[]> = { en: ["capacity", "profile"], de: ["Fähigkeitsprofil"] };

// ─── Ergebnis ────────────────────────────────────────────────────────────────
// Zuerst die vier Faehigkeiten des oeffentlichen Modells, ohne Prozentwerte: die
// siebenstufige Selbsteinschaetzung wird so berichtet, wie gefragt wurde.
// Darunter die Matrix aus den Forschungskonstrukten FTC, CTO und CONT des
// Kontextblocks, auf 0 bis 100 % der Skala normiert. Beide Teile werden getrennt
// berechnet.
// fromCode: Ergebnis aus einem Ergebnis-Code (data/resultCode.ts) statt aus Antworten
// in diesem Browser. Dann fehlen alle Teile, die einzelne Antworten brauchen, und es
// wird nichts uebermittelt.
type ResultProps = {
  lang: Lang; answers: Answers; intake: IntakeState; onRestart: () => void; responseId: string; consent: boolean;
  fromCode?: DecodedResult | null; code?: string | null; focusOnMount?: boolean;
};

export default function Result({ lang: surveyLang, answers, intake, onRestart, responseId, consent, fromCode, code, focusOnMount }: ResultProps) {
  const fc = fromCode as DecodedResult | null | undefined;
  const lang: Lang = surveyLang;
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Nach dem Abschluss des Fragebogens (nicht bei der Code-Ansicht, deren Fokus Assessment setzt)
  // zur Ueberschrift: nach oben scrollen und den Titel ansagen.
  useStepEntry(!!focusOnMount && !fc, titleRef);
  const tr = (k: string) => pick((UI as unknown as Record<string, { en: string; de: string }>)[k], lang);
  const fmt = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce((acc, [k, v]) => acc.replace("{" + k + "}", String(v)), s);

  const caps = useMemo(
    () => CAPACITIES.map((c) => ({
      cap: c,
      score: fc
        ? { mean: fc.scores.cap[c.key], valid: 0, total: itemsOfCapacity(c.key).length }
        : scoreCapacity(c.key, answers, MISSING),
    })),
    [answers, fc]
  );
  const ohneWert = caps.filter((c) => c.score.mean === null).length;

  const scores = useMemo(
    () => (fc ? { FTC: fc.scores.ftc, CTO: fc.scores.cto, CONT: fc.scores.cont } : constructScores(answers)) as Record<string, number | null>,
    [answers, fc]
  );

  // Quadrant der Matrix in Worten; Schwelle und Rundung in data/scoring.ts.
  const quadrant = useMemo(() => {
    const k: QuadKey | null = quadrantKey(scores["FTC"], scores["CTO"]);
    return k ? QUAD_VIEW[k] : null;
  }, [scores]);

  // ─── Vergleich mit anderen Teilnehmenden ───────────────────────────────────
  // Werte aus data/benchmark.json (Schnappschuss, nur Zusammenfassungen), dargestellt
  // mit components/ComparisonView: Filter nach einem Merkmal, Standard
  // "Alle", also kein Filter (Entscheid Adrian 06.10.2026).
  const myGroups = useMemo(
    () => groupsOf({ size: intake.size || "", industry: intake.industry || "", hq: intake.hq || "", fn: intake.fnKey || "" }),
    [intake]
  );
  const showCmp = hasBenchmark();

  const section = (title: string, sub?: string) => (
    <div className="as-sec__head">
      <h2 className="as-title">{title}</h2>
      {sub && <p className="as-small">{sub}</p>}
    </div>
  );
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
      // Zusatzfragen (seit 20.10.2026), sprachunabhaengig; "" = nicht beantwortet
      organisation_staat: intake.stateRole === "state" ? "staatliche_stelle"
        : intake.stateRole === "state_owned" ? "staatsunternehmen"
        : intake.stateRole === "private" ? "privat" : "",
      betrieb_durch_it_dienstleister: intake.operatedBy === "yes" ? "ja" : intake.operatedBy === "no" ? "nein" : "",
      it_dienstleister: intake.operatedBy === "yes"
        ? (intake.operatorType === "internal" ? "intern" : intake.operatorType === "external" ? "extern" : "")
        : "",
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
                .map((o) => pick(o as { en: string; de: string }, surveyLang))
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

  // Ergebnis-Code (data/resultCode.ts): enthaelt die eigenen Werte, damit sie sich auf
  // der Startseite des Self-Assessments auch auf einem anderen Geraet anzeigen lassen.
  // Wird nur hier berechnet.
  const resultCode = useMemo(() => (fc && code ? code : encodeResult(scoreRespondent(answers), intake)), [answers, intake, fc, code]);
  const codeRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  // Nur Deko: Ping am Kopier-Symbol, Leuchtstreifen ueber dem Code, Randblitz der Box.
  const [copyPing, setCopyPing] = useState(0);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const boxFlashRef = useRef<HTMLSpanElement>(null);
  const copyCode = () => {
    // Ohne Zwischenablage (z. B. in fremden iframes) den Code wenigstens markieren.
    const select = () => {
      const el = codeRef.current, sel = window.getSelection();
      if (!el || !sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    };
    try {
      navigator.clipboard.writeText(resultCode).then(() => {
        setCopied(true);
        setCopyPing((n) => n + 1);
        setTimeout(() => setCopied(false), 2000);
      }, select);
    } catch { select(); }
  };

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
        save("cds13-sent", [...done, responseId].slice(-50));
      }
    });
  }, [consent, responseId]);

  // Effekte (nur Darstellung): Glanz ueber dem CTA einmal 1.2 s nach dem Titel.
  // Das Feld der Abschluss-Karte (AmbientField) haelt sich selbst bei Pause,
  // ausserhalb des Viewports und bei reduzierter Bewegung an.
  const reduced = useReducedMotionSafe();
  const [ctaSheen, setCtaSheen] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setCtaSheen(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  // Kopierbestaetigung (nur nach echtem Erfolg der Zwischenablage, copied):
  // ein Leuchtstreifen faehrt per clip-path ueber den Code, der Rand der Box
  // blitzt einmal auf. Beides endet unsichtbar; der Code bleibt unberuehrt.
  const copyAnimsRef = useRef<Animation[]>([]);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useEffect(() => {
    if (!copied) return;
    copyAnimsRef.current.forEach((a) => a.cancel());
    copyAnimsRef.current = playSteps([
      {
        el: sweepRef.current, duration: 650, easing: CSS_EASE_OUT,
        keyframes: [
          { clipPath: "inset(0 100% 0 0)", opacity: 1 },
          { clipPath: "inset(0 0% 0 0)", opacity: 1, offset: 0.4 },
          { clipPath: "inset(0 0% 0 0)", opacity: 0 },
        ],
      },
      {
        el: boxFlashRef.current, duration: 700, easing: CSS_EASE_OUT,
        keyframes: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
      },
    ], reducedRef.current);
  }, [copied]);
  useEffect(() => () => {
    copyAnimsRef.current.forEach((a) => a.cancel());
    copyAnimsRef.current = [];
  }, []);

  // Abschluss-Karte: Checkliste blendet gestaffelt ein, die Haekchen zeichnen sich.
  const ctaListRef = useRef<HTMLUListElement>(null);
  useRevealOnce(ctaListRef, (host) => [
    ...Array.from(host.querySelectorAll("[data-cta-item]")).map((el, i) => ({
      el, duration: 320, delay: 200 + i * 60,
      keyframes: [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0px)" }],
    })),
    ...Array.from(host.querySelectorAll<SVGPathElement>("[data-cta-item] svg path")).flatMap((el, i) => {
      const len = typeof el.getTotalLength === "function" ? el.getTotalLength() : 0;
      return len > 0
        ? [{
            el, duration: 300, delay: 340 + i * 60, easing: CSS_EASE_OUT,
            keyframes: [
              { strokeDasharray: `${len}`, strokeDashoffset: len },
              { strokeDasharray: `${len}`, strokeDashoffset: 0 },
            ],
          }]
        : [];
    }),
  ]);

  // "Wo Sie stehen": Quadrant in Worten, rechts neben der Matrix.
  const quadrantSide = (
    <div className="as-quad">
      {quadrant ? (
        <>
          <p className="as-quad__head">{tr("quadHead")}</p>
          <QuadrantReveal name={pick(quadrant.name, lang)} desc={pick(quadrant.desc, lang)} color={quadrant.color} />
        </>
      ) : (
        <p className="as-quad__none">{tr("notAnswered")}</p>
      )}
    </div>
  );

  // Zusammenfassung der beantworteten Fragen, direkt unter den vier Faehigkeiten.
  const answeredNote = !fc && (
    <p className="as-ansnote">
      {fmt(tr("answeredSummary"), { a: beantwortet, b: alleIds.length })}
      {ohneWert === 1 ? " " + tr("notEnoughArea") : ohneWert > 1 ? " " + fmt(tr("notEnoughAreas"), { n: ohneWert }) : ""}
    </p>
  );

  // Derselbe Mailto-Link wie im Abschluss-Kasten. Bewusst leichter gestaltet und ohne
  // Verdikt: der Kasten unten bleibt der Abschluss, und ein automatisch bestimmter
  // Hebel darf laut Vorgabe nirgends stehen. Mit Vergleich steht er ueber den Filtern
  // (Entscheid Adrian 06.10.2026), sonst unter den vier Werten.
  const ctaButton = (
    <Magnetic>
      <CtaLink href={ctaMail} sheen={ctaSheen}>
        <Mail size={18} aria-hidden="true" /> {tr("ctaButton")} <span className="as-nudge as-nudge--r" aria-hidden="true"><ArrowRight size={18} /></span>
      </CtaLink>
    </Magnetic>
  );
  const afterValues = (
    <>
      {answeredNote}
      <div className="as-ctarow" style={{ marginTop: "1.6rem", marginBottom: 0 }}>{ctaButton}</div>
    </>
  );

  // Eigene Werte und Gruppen fuer den Vergleich (ComparisonView).
  const ownValues = useMemo(
    () => ({ scores: fc ? fc.scores : scoreRespondent(answers), groups: myGroups, oldCode: !!fc && fc.version === 1 }),
    [fc, answers, myGroups]
  );

  const antwortText = (i: Item): string => {
    const v = answers[i.id];
    if (v === undefined) return tr("notAnswered");
    if (Array.isArray(v)) {
      // Mehrfachauswahl wird als Menge berichtet, nie als Mittelwert.
      return v
        .map((x) => i.options?.find((o) => o.value === x))
        .filter(Boolean)
        .map((o) => pick(o as { en: string; de: string }, lang))
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

  const fnLine = functionLabel(intake, lang);
  return (
    <>
    {/* Pause-Knopf fuer alle Endlosanimationen (WCAG 2.2.2): erster Tab-Stopp der
        Ergebnisseite, unsichtbar bis zum Tastaturfokus. Bewusst ausserhalb des
        einblendenden Wrappers (dessen transform wuerde position: fixed brechen).
        Ansicht aus einem Ergebnis-Code: der Fokus springt nach der Anmeldung auf
        #result-title, der Knopf steht deshalb direkt dahinter (siehe unten), damit
        die erste Tab-Taste ihn erreicht. */}
    {!fc && <PauseToggle lang={lang} />}
    <ResultFxStyles />
    <div className="as-step">
      {/* Kopf: tiefgruenes Band mit Radar-Horizont. */}
      <div className="rx-deep as-band as-rhead">
        <AmbientField className="rx-ambient" />
        <ResultHorizon />
        <div className="rx-wrap">
          <h1 ref={titleRef} id="result-title" tabIndex={-1} className="as-display as-focus">
            <RiseWords text={tr("resultTitle")} em={TITLE_EM[lang]} />
          </h1>
          <div className="as-rhead__meta">
            <span className="as-chipstat">
              <DecodeText text={tr("resultEyebrow")} duration={500} trigger="mount" />
            </span>
            {(fnLine || intake.provider) && (
              <Reveal {...RESULT_VIEW} y={6} delay={0.32} duration={0.45}>
                <p className="as-rhead__fn">
                  {fnLine} {intake.provider ? tr("atProvider") + " " + intake.provider : ""}
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </div>
      {/* Code-Ansicht: der Pause-Knopf folgt direkt auf #result-title (Tab-Reihenfolge) und liegt
          ausserhalb des Bandes (isolation), damit position: fixed ueber dem Inhalt bleibt. */}
      {fc && <PauseToggle lang={lang} />}

      <div className="rx-wrap as-rbody">
        {showCmp ? (
          <>
            <div className="as-ctarow">
              <Reveal {...RESULT_VIEW} y={8} delay={0.45} duration={0.5}>{ctaButton}</Reveal>
              <Reveal {...RESULT_VIEW} y={0} delay={0.58} duration={0.4} className="as-standnote-wrap">
                <p className="as-standnote">
                  {fmt(tr("cmpStand"), { d: fmtAsOf(BENCHMARK.asOf, lang) })}.{" "}
                  {tr("cmpOwnNotIncl")}{isSmall(BENCHMARK.groups[ALL]) ? " " + tr("cmpSmall") : ""}
                </p>
              </Reveal>
            </div>
            {/* Vergleich: Filter, Faehigkeiten, Matrix, Kontinuitaet */}
            <ComparisonView
              lang={lang} own={ownValues} matrixSide={quadrantSide} ownNumbers headingLevel="h2"
              capNote={fc ? undefined : (k) => {
                const sc = caps.find((x) => x.cap.key === k)!.score;
                return fmt(tr("itemsScored"), { a: sc.valid, b: sc.total });
              }}
              afterCaps={answeredNote ? <div style={{ margin: "-8px 0 22px" }}>{answeredNote}</div> : undefined}
            />
          </>
        ) : (
          <>
            <Reveal {...RESULT_VIEW} y={0} delay={0.45}>
              <p className="as-nocmp">{tr("cmpNone")}</p>
            </Reveal>
            <CapBarsReveal>
              <div className="as-caps">
                {caps.map(({ cap, score }) => (
                  <div key={cap.key} className="as-cap">
                    <div className="as-cap__head">
                      <span className="as-cap__name">
                        <span className="as-swatch" style={{ background: cap.color }} aria-hidden="true" />
                        {pickCap(cap.label, lang)}
                      </span>
                      <span className="as-cap__term as-mono" lang="en">{cap.term}</span>
                      {!fc && (
                        <span className="as-cap__items">
                          {fmt(tr("itemsScored"), { a: score.valid, b: score.total })}
                        </span>
                      )}
                    </div>
                    <div className="as-cap__bar">
                      {/* Teilstriche bei k/7, gleiche Abbildung wie die Balkenbreite (mean/7) */}
                      {[1, 2, 3, 4, 5, 6].map((k) => (
                        <span key={k} aria-hidden="true" className="as-cap__tick" style={{ left: `${(k / 7) * 100}%` }} />
                      ))}
                      {score.mean !== null && (
                        <div data-cap-bar="" className="as-cap__fill" style={{ width: (score.mean / 7) * 100 + "%" }} />
                      )}
                    </div>
                    <p className={"as-cap__val" + (score.mean === null ? " is-none" : "")}>
                      {score.mean === null
                        ? tr("notEnough")
                        : fmt(tr("selfRating"), { v: score.mean.toFixed(1).replace(".", lang === "de" ? "," : ".") })}
                    </p>
                  </div>
                ))}
              </div>
            </CapBarsReveal>
          </>
        )}

        {!showCmp && afterValues}

        {/* Matrix ohne Vergleichswerte (mit Werten steckt sie in ComparisonView):
            Freedom to Change gegen Control to Operate, Punktfarbe = Kontinuitaet */}
        {!showCmp && (
          <Reveal {...RESULT_VIEW} y={16} className="as-block">
            <div className="as-matrix">
              <div className="as-matrix__side">
                {section(tr("matrixHead"), tr("matrixLead"))}
                {quadrantSide}
                {quadrant && <p className="as-small">{pick(UI.outcomeDot, lang)}</p>}
              </div>
              <div className="as-matrix__fig">
                <SovereigntyMatrix
                  ftc={scores["FTC"]} cto={scores["CTO"]} cont={scores["CONT"]} lang={lang}
                  ariaLabel={[
                    tr("matrixHead"),
                    scores["FTC"] !== null && scores["CTO"] !== null
                      ? `${tr("cmpLegendOwn")}: Reconfiguration Discretion ${fmtPct(scores["FTC"])}, Operational Control ${fmtPct(scores["CTO"])}`
                      : tr("notAnswered"),
                  ].join(". ")}
                />
              </div>
            </div>
          </Reveal>
        )}

        {!fc && (
          <Reveal {...RESULT_VIEW} y={16} className="as-ctx">
            <div className="as-ctx__head">
              <h2 className="as-title">{tr("contextTitle")}</h2>
              <p className="as-small">{tr("contextNotScored")}</p>
            </div>
            {CONTEXT_GROUPS.map((g) => {
              const items = ACTIVE.filter((i) => g.constructs.includes(i.construct));
              if (!items.length) return null;
              return (
                <div key={g.key} className="as-ctx__group">
                  <h3>{pick(g.label, lang)}</h3>
                  <ul className="as-ctx__list">
                    {items.map((i) => (
                      <li key={i.id} className="as-ctx__row">
                        <span className="as-ctx__q">{lang === "en" ? i.en : i.de}</span>
                        <span className="as-ctx__a">{antwortText(i)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Reveal>
        )}

        {/* Abschluss: die eine tiefgruene Karte der Seite */}
        <Reveal {...RESULT_VIEW} y={16} className="rx-deep as-band as-panel as-cta">
          <AmbientField className="rx-ambient" />
          <span className="as-chipstat as-cta__chip">{tr("ctaEyebrow")}</span>
          <div className="as-cta__main">
            <h2 className="as-h">{tr("ctaHead")}</h2>
            <p className="as-lead">{tr("ctaLead")}</p>
            <div className="as-cta__btn">
              <Magnetic>
                <a href={ctaMail} className="rx-pill as-pill-light as-pill-xl">
                  <Mail size={18} aria-hidden="true" /> {tr("ctaButton")} <span className="as-nudge as-nudge--r" aria-hidden="true"><ArrowRight size={18} /></span>
                </a>
              </Magnetic>
            </div>
          </div>
          <ul ref={ctaListRef} className="as-cta__list">
            {UI.ctaItems.map((it) => (
              <li key={it.en} data-cta-item="">
                <span className="as-cta__tick"><Check size={15} aria-hidden="true" /></span>
                <span>{pick(it, lang)}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Ergebnis-Code: die eigenen Werte zum Mitnehmen auf ein anderes Geraet */}
        <Reveal {...RESULT_VIEW} y={16} className="as-code">
          <span ref={boxFlashRef} aria-hidden="true" className="as-code__flash fx-deco" />
          <div>
            <p className="as-label">{tr("codeTitle")}</p>
            <p className="as-small" style={{ marginTop: "0.5rem" }}>{tr("codeText")}</p>
          </div>
          <div className="as-code__row">
            <CodeScan sweepRef={sweepRef}>
              <span ref={codeRef} className="as-code__val">{resultCode}</span>
            </CodeScan>
            <button type="button" onClick={copyCode} className={"as-copy fx-press" + (copied ? " is-copied" : "")}>
              <CopyIconSwap copied={copied} ping={copyPing} />
              <span aria-live="polite">{copied ? tr("codeCopied") : tr("codeCopy")}</span>
            </button>
          </div>
        </Reveal>

        {submitState !== "off" && !fc && (
          <div className="as-subm">
            <p role="status" className={"as-status" + (submitState === "failed" ? " as-status--bad" : "")}>
              {submitState === "ok" ? tr("submitOk") : submitState === "failed" ? tr("submitFailed") : tr("submitPending")}
            </p>
            {responseId && (
              <p className="as-rid as-mono">{tr("responseIdLabel")}: {responseId}</p>
            )}
          </div>
        )}

        <div className="as-end">
          {!fc && (
            <button type="button" onClick={exportJson} className="rx-pill rx-pill--ghost">
              <FileJson size={18} aria-hidden="true" /> {tr("downloadJson")}
            </button>
          )}
          <button type="button" onClick={onRestart} className="rx-pill rx-pill--ghost">
            <RotateCcw size={18} aria-hidden="true" /> {fc ? tr("codeLogout") : tr("restart")}
          </button>
          <Link to="/" className="rx-pill rx-pill--ghost">
            <Home size={18} aria-hidden="true" /> {tr("toHome")}
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Ergebnis: Hilfskomponenten fuer die Effekte ─────────────────────────────
// Alle zeigen ohne Animation (Druck, versteckter Tab) den Endzustand; bei Reduktion
// laeuft die sanfte Variante (clip-path, opacity, Zeichnen, keine Bewegung).
// Mechanik in components/ResultVisuals.tsx (useRevealOnce).
// QuadrantReveal (Feldname in Worten) liegt in components/ComparisonView.tsx.

// Kopf-Horizont: ein flacher Radar-Horizont hinter dem Titel (nur Deko, aria-hidden).
// Beim ersten Sichtkontakt zeichnen sich die Ringe und Peilachsen, ein Strahl
// streicht einmal von links nach rechts und erlischt. Keine Schleife. Sanfte Stufe:
// der Strahl steht auf 12 Uhr und blendet nur ein und aus (softSteps entfernt die
// Drehung). Ohne Animation stehen Ringe und Achsen, der Strahl ist unsichtbar.
const HZ_RX = [60, 120, 180, 240, 300];
const HZ_AXES = [0, 30, 60, 90, 120, 150, 180].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(300 * Math.cos(a) * 100) / 100, y: Math.round(-120 * Math.sin(a) * 100) / 100 };
});

function ResultHorizon() {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useSvgUid();
  const clipId = `${uid}hzc`;
  const gradId = `${uid}hzg`;
  useRevealOnce(svgRef, (h) => [
    ...Array.from(h.querySelectorAll('[data-hz="arc"]')).map((el, i) => ({
      el, duration: 900, delay: i * 90, easing: CSS_EASE_IN_OUT,
      keyframes: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    })),
    ...Array.from(h.querySelectorAll('[data-hz="axis"]')).map((el, i) => ({
      el, duration: 500, delay: 700 + i * 40,
      keyframes: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    })),
    {
      el: h.querySelector('[data-hz="beam-rot"]'), duration: 1600, delay: 500, easing: CSS_EASE_IN_OUT,
      keyframes: [{ transform: "rotate(-90deg)" }, { transform: "rotate(90deg)" }],
    },
    {
      el: h.querySelector('[data-hz="beam-op"]'), duration: 1600, delay: 500, easing: "linear",
      keyframes: [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }],
    },
  ]);
  return (
    <svg ref={svgRef} aria-hidden="true" className="as-horizon fx-deco" viewBox="0 0 600 122" preserveAspectRatio="xMidYMax meet"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)",
      }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={-300} y={-121} width={600} height={121} />
        </clipPath>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={-190} y2={0}>
          <stop offset="0" stopColor="rgba(111,214,154,0.26)" />
          <stop offset="1" stopColor="rgba(111,214,154,0)" />
        </linearGradient>
      </defs>
      <g transform="translate(300 121)">
        {HZ_RX.map((rx) => (
          <path key={rx} data-hz="arc" d={`M ${-rx} 0 A ${rx} ${0.4 * rx} 0 0 1 ${rx} 0`} pathLength={1}
            strokeDasharray="1 1" strokeDashoffset={0} stroke="rgba(111,214,154,0.32)" strokeWidth={1}
            vectorEffect="non-scaling-stroke" fill="none" />
        ))}
        {HZ_AXES.map((p, i) => (
          <path key={i} data-hz="axis" d={`M 0 0 L ${p.x} ${p.y}`} pathLength={1}
            strokeDasharray="1 1" strokeDashoffset={0} stroke="rgba(111,214,154,0.16)" strokeWidth={1}
            vectorEffect="non-scaling-stroke" fill="none" />
        ))}
        <g clipPath={`url(#${clipId})`}>
          <g transform="scale(1 0.4)">
            <g data-hz="beam-rot" style={{ transformBox: "view-box", transformOrigin: "0px 0px", transform: "rotate(0deg)" }}>
              <g data-hz="beam-op" style={{ opacity: 0 }}>
                <path d="M0 0 L0 -300 A300 300 0 0 0 -192.8 -229.8 Z" fill={`url(#${gradId})`} />
                <line x1={0} y1={0} x2={0} y2={-300} stroke="rgba(111,214,154,0.7)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

// Oberer CTA (derselbe Mailto-Link wie im Abschluss-Kasten): gruene Pille mit einmaligem
// Glanzstreifen. Keine Endlosschleife, also nichts, was pausiert werden muesste.
function CtaLink({ href, sheen, children }: { href: string; sheen: boolean; children: ReactNode }) {
  return (
    <a href={href} className={"rx-pill as-pill-xl fx-press fx-sheen-host" + (sheen ? " fx-sheen-once" : "")}>
      {children}
      <span className="fx-sheen" aria-hidden="true" />
    </a>
  );
}

// Ergebnis-Code als Fernschreiber: Steht der Code auf einer Zeile, wird er
// zeichenweise aufgedeckt (steps), der Balken springt mit; bricht er um (Handy),
// laeuft ein weicher Wipe. Der Code steht immer vollstaendig im DOM (markier- und
// kopierbar), kein Scramble. Danach greifen Ortungsecken zu (LockOn).
// sweepRef: Leuchtstreifen fuer die Kopierbestaetigung (gespielt in Result).
function CodeScan({ children, sweepRef }: { children: ReactNode; sweepRef?: RefObject<HTMLSpanElement> }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const clipRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const played = useRevealOnce(hostRef, (_host, reduced) => {
    const txt = clipRef.current?.firstElementChild;
    const n = txt?.textContent?.length ?? 0;
    const oneLine = !!txt && txt.getClientRects().length === 1;
    const typed = oneLine && n > 0;
    const easing = typed ? `steps(${n}, end)` : CSS_EASE_IN_OUT;
    const duration = typed ? n * 28 : 700;
    return [
      {
        el: clipRef.current, duration, easing,
        keyframes: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      },
      // Sanfte Stufe: nur der Wipe, ohne fahrenden Balken.
      ...(reduced ? [] : [{
        el: layerRef.current, duration, easing,
        keyframes: [{ transform: "translateX(-100%)" }, { transform: "translateX(0%)" }],
      }, {
        el: barRef.current, duration: duration + 120, easing: "linear",
        keyframes: [{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }],
      }]),
    ];
  }, { amount: 0.4 });
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!played) return;
    const id = window.setTimeout(() => setLocked(true), 800);
    return () => window.clearTimeout(id);
  }, [played]);
  return (
    <LockOn color="#00802f" play={locked} size={8} inset={-9} className="max-w-full">
      <span ref={hostRef} style={{ position: "relative", display: "block", maxWidth: "100%" }}>
        <span ref={clipRef} style={{ display: "block" }}>{children}</span>
        <span ref={layerRef} aria-hidden="true" className="fx-deco" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <span ref={barRef} style={{
            position: "absolute", top: "-3px", bottom: "-3px", right: 0, width: "1px",
            background: "#00802f", boxShadow: "0 0 8px 1px rgba(0,128,47,0.55)", opacity: 0,
          }} />
        </span>
        <span ref={sweepRef} aria-hidden="true" className="as-code__sweep fx-deco" />
      </span>
    </LockOn>
  );
}

// Kopieren-Button: Copy und Check liegen uebereinander und tauschen per Crossfade
// (mit leichtem Zoom, ohne Blur). ping: Ortungsring nach erfolgreichem Kopieren.
function CopyIconSwap({ copied, ping = 0 }: { copied: boolean; ping?: number }) {
  const reduced = useReducedMotionSafe();
  const layer = (show: boolean): CSSProperties => {
    const ms = show ? 200 : 150;
    return {
      gridArea: "1 / 1", display: "inline-flex",
      opacity: show ? 1 : 0,
      transform: show || reduced ? "scale(1)" : "scale(0.8)",
      transition: reduced
        ? `opacity ${ms}ms ${CSS_EASE_OUT}`
        : `opacity ${ms}ms ${CSS_EASE_OUT}, transform ${ms}ms ${CSS_EASE_OUT}`,
    };
  };
  return (
    <span aria-hidden="true" style={{ position: "relative", display: "inline-grid", placeItems: "center" }}>
      <span style={layer(!copied)}><Copy size={16} /></span>
      <span style={layer(copied)}><Check size={16} /></span>
      <Ping play={ping} color="#00802f" size={16} count={1} scale={2.6} duration={0.7} />
    </span>
  );
}

// Faehigkeitsbalken ohne Vergleichswerte: Breite steht fest im DOM, beim
// Sichtkontakt waechst jeder Balken einmal per scaleX von links (sanfte Stufe:
// clip-path-Wipe von links, ohne Bewegung).
function CapBarsReveal({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useRevealOnce(hostRef, (host, reduced) =>
    Array.from(host.querySelectorAll("[data-cap-bar]")).map((el, i) => ({
      el, duration: 900, delay: i * 120, easing: CSS_EASE_OUT,
      keyframes: reduced
        ? [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }]
        : [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
    })), { amount: 0.4 });
  return <div ref={hostRef}>{children}</div>;
}
