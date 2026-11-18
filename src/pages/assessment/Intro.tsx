// Intro: Frage, vier Faehigkeiten plus Kontext, Einwilligung, Start, Code-Anmeldung.
import { useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Home } from "lucide-react";
import { isEnabled } from "../../data/submit";
import type { Lang } from "../../data/instrument";
import { ACTIVE } from "../../data/scoring";
import { UI } from "../../data/surveyUi";
import { CAPACITIES, CAP_ITEMS, pickCap } from "../../data/capacityItems";
import ResultCodeForm from "../../components/ResultCodeForm";
import { CountUp, Magnetic, ScrollWords } from "@/components/fx";
import { RiseWords, TickSvg } from "./ui";
import { useSeen, useStepEntry } from "./hooks";
import type { Tr } from "./model";

// Gruene Woerter der Ueberschrift je Sprache (nur Darstellung, der Text bleibt unveraendert).
const TITLE_EM: Record<Lang, string[]> = {
  en: ["room", "for", "manoeuvre"],
  de: ["Handlungsspielraum"],
};
const UNIT_HOT: Record<Lang, Record<string, string>> = {
  en: { combination: "#00802f" },
  de: { Kombination: "#00802f" },
};

export default function Intro({ lang, tr, onStart, consent, setConsent, onCode, focusOnMount }: {
  lang: Lang; tr: Tr; onStart: () => void; consent: boolean; setConsent: (v: boolean) => void;
  onCode: (code: string) => void; focusOnMount: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pathRef = useRef<HTMLOListElement>(null);
  useStepEntry(focusOnMount, titleRef);
  const pathIn = useSeen(pathRef, true);
  const detailId = useId();
  const warnId = useId();
  const warn = touched && !consent;
  return (
    <div className="as-step">
      <section className="rx-wrap as-intro">
        <h1 ref={titleRef} id="step-title" tabIndex={-1} className="as-display as-focus">
          <RiseWords text={tr("introTitle")} em={TITLE_EM[lang]} />
        </h1>

        <div className="as-intro__grid">
          <div>
            <p className="as-small" style={{ marginBottom: "1.4rem" }}>
              <span className="as-chipstat as-chipstat--paper">{tr("eyebrow")}</span>
            </p>
            <p className="as-lead">{tr("introLead")}</p>
          </div>

          <ol ref={pathRef} className={"as-path" + (pathIn ? " is-in" : "")}>
            {CAPACITIES.map((c, i) => (
              <li key={c.key} style={{ "--i": i } as CSSProperties}>
                <span className="as-path__n">{i + 1}</span>
                <span className="as-path__t">{pickCap(c.label, lang)}</span>
                <span className="as-swatch" style={{ background: c.color }} aria-hidden="true" />
              </li>
            ))}
            <li className="is-ctx" style={{ "--i": CAPACITIES.length } as CSSProperties}>
              <span className="as-path__n">{CAPACITIES.length + 1}</span>
              <span className="as-path__t">{tr("contextTitle")}</span>
              <span className="as-swatch as-swatch--hollow" aria-hidden="true" />
            </li>
          </ol>
        </div>

        <ScrollWords
          as="p" className="as-statement" text={tr("introUnit")}
          highlight={UNIT_HOT[lang]} min={0.4} scanLine={false}
        />

        <p className="as-stage as-small">{tr("introStage")}</p>

        {/* Einwilligung vor dem ersten Item, nicht danach: wer nicht zustimmt,
            soll die Fragen gar nicht erst beantwortet haben. */}
        {isEnabled() && (
          <div className={"as-consent" + (warn ? " is-warn" : "")}>
            <label className="as-check">
              <input
                type="checkbox" className="as-vh as-check__in" checked={!!consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={warn} aria-describedby={detailId + (warn ? " " + warnId : "")}
              />
              <span className="as-check__box" aria-hidden="true"><TickSvg /></span>
              <span className="as-check__t">{tr("consentLabel")}</span>
            </label>
            <p id={detailId} className="as-consent__detail">
              {tr("consentDetail")}{" "}
              <Link to="/impressum" lang="de">Impressum und Datenschutz</Link>
            </p>
            {warn && (
              <p id={warnId} role="alert" className="as-note">{tr("consentRequired")}</p>
            )}
          </div>
        )}

        <div className="as-actions">
          <Magnetic>
            <button
              type="button" className="rx-pill as-pill-xl"
              onClick={() => { setTouched(true); if (!isEnabled() || consent) onStart(); }}
            >
              {tr("start")}
              <span className="as-nudge as-nudge--r" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
          </Magnetic>
          <Link to="/" className="rx-pill rx-pill--ghost as-pill-xl">
            <Home size={18} aria-hidden="true" /> {tr("toHome")}
          </Link>
        </div>

        <p className="as-fine">
          <CountUp value={String(CAP_ITEMS.length + ACTIVE.length)} /> {tr("questionsCount")} · {tr("minutes")}
          {!isEnabled() && <> · {tr("minutesNoStore")}</>}
        </p>
      </section>

      {/* Wer schon teilgenommen hat: Ergebnis aus dem Ergebnis-Code statt neu starten */}
      <section className="as-code-sec">
        <div className="rx-wrap">
          <div className="as-code-sec__in">
            <ResultCodeForm
              id="intro-code" lang={lang} onLogin={onCode} align="left"
              label={UI.codeIntroLabel} hint={UI.codeIntroHint} button={UI.codeIntroButton}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
