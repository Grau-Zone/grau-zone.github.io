// Intake: Funktion, Anbieter, Firmenprofil, Zusatzfragen.
import { useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useReducedMotionSafe } from "@/components/fx";
import type { Lang } from "../../data/instrument";
import { FUNCTIONS, FUNCTION_OTHER, FIRM_SIZE, INDUSTRY, HQ, STATE_ROLE, OPERATED_BY_PROVIDER, OPERATOR_TYPE, pick } from "../../data/surveyUi";
import { DIMENSIONS } from "../../data/benchmarkGroups";
import { ActionBar, RiseWords } from "./ui";
import { useStepEntry } from "./hooks";
import { typicalProviders, type IntakeState, type Tr } from "./model";

const TITLE_EM: Record<Lang, string[]> = { en: ["dependency"], de: ["Abhängigkeit"] };

export default function Intake({ lang, tr, intake, setIntake, onBack, onNext, focusOnMount }: {
  lang: Lang; tr: Tr; intake: IntakeState; setIntake: Dispatch<SetStateAction<IntakeState>>;
  onBack: () => void; onNext: () => void; focusOnMount: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const reduced = useReducedMotionSafe();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useStepEntry(focusOnMount, titleRef);
  const uid = useId();
  const fnHeadId = uid + "-fn";
  const provId = uid + "-prov";
  const provNoteId = uid + "-prov-note";
  const chosen = intake.fnKey as string;
  // Ohne Anbieter ist die Funktion-Anbieter-Konstellation nicht vollstaendig
  // definiert, und jede Antwort bezieht sich auf genau diese Kombination.
  const valid =
    chosen &&
    (chosen !== FUNCTION_OTHER || intake.fnOther.trim().length > 0) &&
    intake.provider.trim().length > 0;
  const fnMissing = !chosen || (chosen === FUNCTION_OTHER && intake.fnOther.trim().length === 0);

  // Kompakte Auswahlreihe; erneutes Klicken hebt die Auswahl wieder auf,
  // damit eine freiwillige Angabe auch zurueckgenommen werden kann.
  const chips = (title: string, list: { key: string; label: { en: string; de: string } }[], field: string, clearUnless?: { value: string; fields: string[] }) => {
    const gid = uid + "-" + field;
    return (
      <div className="as-group" role="group" aria-labelledby={gid}>
        <p id={gid} className="as-label">{title}</p>
        <div className="as-chips">
          {list.map((o) => {
            const on = (intake as unknown as Record<string, string>)[field] === o.key;   // nur Darstellung
            return (
              <button key={o.key} type="button" className="as-chip"
                aria-pressed={on}
                onClick={() => setIntake((p) => {
                  const cur = p as unknown as Record<string, string>;
                  const next = cur[field] === o.key ? "" : o.key;
                  const out: Record<string, string> = { ...cur, [field]: next };
                  // Folgefrage nur, solange die ausloesende Antwort gilt
                  if (clearUnless && next !== clearUnless.value) clearUnless.fields.forEach((f) => { out[f] = ""; });
                  return out as unknown as IntakeState;
                })}>
                {pick(o.label, lang)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const option = (key: string, label: string, providers?: string) => {
    const active = chosen === key;
    return (
      <label key={key} className={"as-pickrow" + (active ? " is-on" : "")}>
        <input
          type="radio" name={uid + "-fn-radio"} className="as-vh as-in" checked={active}
          onChange={() => setIntake((p) => ({ ...p, fnKey: key }))}
        />
        <span className="as-dot" aria-hidden="true" />
        <span>
          <span className="as-pickrow__t">{label}</span>
          {providers && (
            <span className="as-pickrow__s">{tr("intakeTypical")}: {providers}</span>
          )}
        </span>
      </label>
    );
  };

  // Weiter: bei fehlenden Pflichtangaben zur ersten Luecke scrollen, statt still stehenzubleiben.
  const goNext = () => {
    setTouched(true);
    if (valid) { onNext(); return; }
    const el = document.getElementById(fnMissing ? fnHeadId : provId);
    try { el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: fnMissing ? "start" : "center" }); } catch { /* ignorieren */ }
    if (!fnMissing) (el as HTMLInputElement | null)?.focus({ preventScroll: true });
  };

  const fnGroups = DIMENSIONS.find((d) => d.key === "funktion")!.groups;
  const other = chosen === FUNCTION_OTHER;
  const otherBad = touched && other && intake.fnOther.trim().length === 0;
  const provBad = touched && intake.provider.trim().length === 0;

  return (
    <div className="as-step">
      <div className="rx-wrap as-form">
        <h1 ref={titleRef} id="step-title" tabIndex={-1} className="as-display as-focus">
          <RiseWords text={tr("intakeTitle")} em={TITLE_EM[lang]} />
        </h1>
        <p className="as-lead as-form__lead">{tr("intakeLead")}</p>

        {/* Ablauf in drei Schritten. Ohne diese Einordnung ist auf dieser Seite
            nicht erkennbar, was nach der Auswahl passiert und was am Ende steht. */}
        <section className="as-sec">
          <div className="as-sec__head">
            <h2 className="as-title">{tr("intakeHowHead")}</h2>
          </div>
          <ol className="as-steps">
            {[tr("intakeStep1"), tr("intakeStep2"), tr("intakeStep3")].map((txt, i) => (
              <li key={i}>
                <span className="as-steps__n" aria-hidden="true">{i + 1}</span>
                <span className="as-steps__t">{txt}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Firmenprofil: Stichprobenbeschreibung, bewusst nicht erzwungen ── */}
        <section className="as-sec">
          <div className="as-sec__head">
            <h2 className="as-title">{tr("firmHead")}</h2>
            <p className="as-small">{tr("firmLead")}</p>
          </div>
          <div>
            {chips(tr("firmSize"), FIRM_SIZE, "size")}
            {chips(tr("firmIndustry"), INDUSTRY, "industry")}
            {chips(tr("firmHq"), HQ, "hq")}
          </div>
        </section>

        <section className="as-sec">
          <div className="as-sec__head">
            <h2 id={fnHeadId} className="as-title" style={{ scrollMarginTop: "1.5rem" }}>{tr("intakeChoose")}</h2>
          </div>
          <div>
            <div role="radiogroup" aria-labelledby={fnHeadId} className="as-pick">
              {/* Gruppiert nach denselben zwei Gruppen wie der Vergleich auf der Ergebnisseite
                  (benchmarkGroups.ts). Schluessel, Reihenfolge und Ergebnis-Code bleiben unveraendert. */}
              {fnGroups.map((g) => (
                <div key={g.key} role="group" aria-labelledby={uid + "-fng-" + g.key} className="as-pickgroup">
                  <p id={uid + "-fng-" + g.key} className="as-pickgroup__h">{pick(g.label, lang)}</p>
                  {FUNCTIONS.filter((f) => (g.members as string[]).includes(f.key)).map((f) =>
                    option(f.key, pick(f.label, lang), pick(f.providers, lang)),
                  )}
                </div>
              ))}
              {option(FUNCTION_OTHER, tr("intakeOther"))}
            </div>
            <div className={"as-other__in" + (other ? " is-open" : "")}>
              <div>
                {other && (
                  <input
                    autoFocus value={intake.fnOther} className="as-input" autoComplete="off"
                    onChange={(e) => setIntake((p) => ({ ...p, fnOther: e.target.value }))}
                    placeholder={tr("intakeOtherPh")} aria-label={tr("intakeOtherPh")}
                    aria-invalid={otherBad}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="as-sec">
          <div className="as-sec__head">
            <h2 className="as-title"><label htmlFor={provId}>{tr("intakeProvider")}</label></h2>
            <p id={provNoteId} className="as-small">{tr("intakeProviderNote")}</p>
          </div>
          <div>
            <input
              id={provId} className="as-input" autoComplete="off" value={intake.provider}
              onChange={(e) => setIntake((p) => ({ ...p, provider: e.target.value }))}
              placeholder={typicalProviders(intake, lang) || tr("intakeProviderPh")}
              aria-describedby={provNoteId} aria-invalid={provBad}
            />
          </div>
        </section>

        {/* ── Zusatzfragen (freiwillig): Staat oder privat, Betrieb durch
            IT-Dienstleister und bei Ja dessen Art (intern/extern) ── */}
        <section className="as-sec">
          <div className="as-sec__head">
            <p className="as-title">{tr("extraLead")}</p>
          </div>
          <div>
            {chips(tr("stateRoleQ"), STATE_ROLE, "stateRole")}
            {chips(tr("operatedByQ"), OPERATED_BY_PROVIDER, "operatedBy", { value: "yes", fields: ["operatorType"] })}
            {intake.operatedBy === "yes" && chips(tr("operatorTypeQ"), OPERATOR_TYPE, "operatorType")}
          </div>
        </section>
      </div>

      <ActionBar
        onBack={onBack} onNext={goNext} backLabel={tr("back")} nextLabel={tr("next")} progress={0}
        note={touched && !valid ? <p role="alert" className="as-note">{tr("intakeMissingFn")}</p> : undefined}
      />
    </div>
  );
}
