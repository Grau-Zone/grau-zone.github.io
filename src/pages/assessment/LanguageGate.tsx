// Sprachauswahl: erste Seite des Self-Assessments.
// Beide Sprachfassungen sind gleichwertig. Eine sichtbare Empfehlung fuer
// Englisch wuerde die deutsche Fassung abwerten.
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { Lang } from "../../data/instrument";
import { UI } from "../../data/surveyUi";
import { RadarArt, RiseWords } from "./ui";
import { useStepEntry } from "./hooks";

export default function LanguageGate({ onPick, focusOnMount }: { onPick: (l: Lang) => void; focusOnMount: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useStepEntry(focusOnMount, titleRef);
  return (
    <div className="as-step">
      <section className="rx-wrap as-gate">
        <div className="as-gate__grid">
          <div>
            <h1 ref={titleRef} id="step-title" tabIndex={-1} className="as-display as-focus">
              <span style={{ display: "block" }}>
                <RiseWords lang="en" text={UI.langTitle.en} em={["language"]} />
              </span>
              <span className="as-vh"> · </span>
              <span style={{ display: "block" }}>
                <RiseWords lang="de" text={UI.langTitle.de} em={["Sprache"]} delay={160} />
              </span>
            </h1>
            <p className="as-lead as-gate__lead">{UI.langLead.de}</p>

            <div className="as-langrows">
              <button type="button" lang="en" className="as-langrow as-rise" style={{ "--i": 3 } as React.CSSProperties} onClick={() => onPick("en")}>
                <span className="as-langrow__t">{UI.langEn.en}</span>
                <span className="as-circ" aria-hidden="true"><ArrowRight size={20} /></span>
              </button>
              <button type="button" lang="de" className="as-langrow as-rise" style={{ "--i": 4 } as React.CSSProperties} onClick={() => onPick("de")}>
                <span className="as-langrow__t">{UI.langDe.de}</span>
                <span className="as-circ" aria-hidden="true"><ArrowRight size={20} /></span>
              </button>
            </div>

            <p className="as-small as-gate__cap">{UI.eyebrow.de}</p>
          </div>
          <RadarArt className="as-gate__art" />
        </div>
      </section>
    </div>
  );
}
