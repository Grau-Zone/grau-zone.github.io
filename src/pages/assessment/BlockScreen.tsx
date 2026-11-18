// Fragenblock. Bloecke 1 bis 4 erheben je eine der vier Faehigkeiten. Block 5 sammelt die
// Items des Forschungsinstruments unter neutralen Ueberschriften. Konstruktnamen,
// Konstruktcodes und Item-IDs bleiben unsichtbar: sie wuerden Teilnehmende beim
// Antworten primen. Auch im DOM stehen keine Item-IDs (ids kommen aus useId).
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Info } from "lucide-react";
import { AmbientField } from "@/rx/AmbientField";
import { Ping, useReducedMotionSafe } from "@/components/fx";
import { MISSING, type Lang } from "../../data/instrument";
import { CAPACITIES, itemsOfCapacity, pickCap } from "../../data/capacityItems";
import { CONTEXT_GROUPS, YES_NO, anchorsFor, pick } from "../../data/surveyUi";
import { ActionBar, RiseWords, Segments } from "./ui";
import { BLOCKS, blockColor, ctxItemsOfGroup, functionLabel, itemIdsOfBlock, type Answers, type IntakeState, type Tr } from "./model";

type BlockScreenProps = {
  lang: Lang; tr: Tr; blockIndex: number; answers: Answers; intake: IntakeState; focusOnMount: boolean;
  onAnswer: (id: string, v: number) => void; onToggle: (id: string, v: number, exclusive: boolean) => void;
  onBack: () => void; onNext: () => void;
};

export default function BlockScreen({ lang, tr, blockIndex, answers, onAnswer, onToggle, onBack, onNext, intake, focusOnMount }: BlockScreenProps) {
  const block = BLOCKS[blockIndex];
  const cap = block.kind === "cap" ? CAPACITIES.find((c) => c.key === block.key)! : null;
  const color = blockColor(block);
  const ids = itemIdsOfBlock(block);
  const answered = ids.filter((id) => answers[id] !== undefined).length;
  const vollstaendig = answered === ids.length;
  const [touched, setTouched] = useState(false);
  const reduced = useReducedMotionSafe();
  const topRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const labelId = uid + "-label";
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    setTouched(false);
    // nach einer Navigation die Ueberschrift ansagen (Fokus ohne Scrollen)
    if (focusOnMount) titleRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockIndex]);

  const fnLabel = functionLabel(intake, lang);
  const fill = (x: string) =>
    x.replace(/\[FUNCTION\]|<FUNCTION>/g, fnLabel || (lang === "en" ? "this function" : "diese Funktion"))
     .replace(/\[PROVIDER\]|<PROVIDER>/g, intake.provider || (lang === "en" ? "this provider" : "diesem Anbieter"));

  // Weiter: nur bei vollstaendigem Block; sonst zur ersten offenen Frage scrollen.
  const next = () => {
    setTouched(true);
    if (vollstaendig) { onNext(); return; }
    const first = rootRef.current?.querySelector<HTMLElement>(".as-q:not(.is-done)");
    try { first?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); } catch { /* ignorieren */ }
  };

  const blockLabel = `${tr("block")} ${blockIndex + 1} ${tr("of")} ${BLOCKS.length}`;

  return (
    <div ref={rootRef} className="as-step">
      <div ref={topRef} />
      <div className="rx-deep as-band as-chapter">
        <AmbientField className="rx-ambient" />
        <span className="as-bignum" aria-hidden="true">{blockIndex + 1}</span>
        <div className="rx-wrap">
          <div className="as-chapter__top">
            <span id={labelId} className="as-chapter__label">
              <span className="as-swatch as-swatch--deep" style={{ background: color }} aria-hidden="true" />
              {blockLabel}
            </span>
            <Segments
              count={BLOCKS.length} index={blockIndex} fraction={ids.length ? answered / ids.length : 0}
              labelledBy={labelId} valueText={blockLabel}
            />
          </div>
          <h1 ref={titleRef} id="step-title" tabIndex={-1} className="as-display as-focus">
            <RiseWords text={cap ? pickCap(cap.label, lang) : tr("contextTitle")} />
          </h1>
          {cap && <p className="as-chapter__term as-mono" lang="en">{cap.term}</p>}
          <p className="as-lead as-chapter__lead">{cap ? pickCap(cap.definition, lang) : tr("contextSub")}</p>
        </div>
      </div>

      <div className="rx-wrap as-qwrap">
        {(fnLabel || intake.provider) && (
          <div className="as-info">
            <Info size={16} className="as-info__i" aria-hidden="true" />
            <span className="as-info__t">{fnLabel} {tr("atProvider")} {intake.provider}</span>
          </div>
        )}

        {!cap && <p className="as-ctxnote">{tr("contextLead")}</p>}

        {cap ? (
          <ol className="as-qlist">
            {itemsOfCapacity(cap.key).map((it) => (
              <QuestionCard key={it.id} lang={lang} tr={tr} fill={fill}
                id={it.id} text={pickCap(it.text, lang)} scale={it.scale}
                value={answers[it.id]} onAnswer={onAnswer} missing={touched} />
            ))}
          </ol>
        ) : (
          CONTEXT_GROUPS.map((g) => {
            const items = ctxItemsOfGroup(g);
            if (!items.length) return null;
            return (
              <section key={g.key} className="as-cgroup" aria-labelledby={`${uid}-${g.key}`}>
                <h2 id={`${uid}-${g.key}`} className="as-title as-cgroup__h">{pick(g.label, lang)}</h2>
                <ol className="as-qlist">
                  {items.map((it) => (
                    <QuestionCard key={it.id} lang={lang} tr={tr} fill={fill} ctx
                      id={it.id} text={lang === "en" ? it.en : it.de} scale={it.scale || 7}
                      options={it.type === "fact" || it.type === "multi" ? it.options : undefined}
                      multi={it.type === "multi"}
                      value={answers[it.id]} onAnswer={onAnswer} onToggle={onToggle} missing={touched} />
                  ))}
                </ol>
              </section>
            );
          })
        )}
      </div>

      <ActionBar
        onBack={onBack} onNext={next} backLabel={tr("back")}
        nextLabel={blockIndex === BLOCKS.length - 1 ? tr("showResult") : tr("next")}
        progress={(blockIndex + (ids.length ? answered / ids.length : 0)) / BLOCKS.length}
        count={`${answered}/${ids.length} ${tr("answered")}`}
        note={touched && !vollstaendig ? <p role="alert" className="as-note">{tr("incompleteHint")}</p> : undefined}
      />
    </div>
  );
}

// ─── Einzelfrage ─────────────────────────────────────────────────────────────
// Eine Frage. Ohne Item-ID und ohne Konstruktcode. Bei Faktenfragen wird nur der
// Antworttext gezeigt: sichtbare Zahlen suggerieren eine Rangfolge und beeinflussen
// die Antwort. Die numerischen Werte bleiben allein im Datensatz.
function QuestionCard({ id, text, scale, options, multi, lang, tr, value, onAnswer, onToggle, fill, missing, ctx }: {
  id: string; text: string; scale: number; options?: { value: number; en: string; de: string }[];
  multi?: boolean;
  lang: Lang; tr: Tr;
  value: number | number[] | undefined;
  onAnswer: (itemId: string, v: number) => void;
  onToggle?: (itemId: string, v: number, exclusive: boolean) => void;
  fill: (s: string) => string;
  missing?: boolean; ctx?: boolean;
}) {
  const frage = fill(text);
  const answered = value !== undefined;
  const gewaehlt = Array.isArray(value) ? value : [];
  const aktiv = (v: number) => (multi ? gewaehlt.includes(v) : value === v);
  const uid = useId();
  const qid = uid + "-q";
  const hintId = uid + "-hint";
  const name = uid + "-a";

  // Deko: ein Ring am Marker, wenn die Antwort sich aendert (nicht beim Laden eines Standes).
  const [ping, setPing] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && value !== undefined) setPing((n) => n + 1);
    prev.current = value;
  }, [value]);

  const dk = (checkbox: boolean) => (
    <label className="as-dk">
      <input
        type={checkbox ? "checkbox" : "radio"} name={name} className="as-vh as-in" checked={value === MISSING}
        onChange={() => onAnswer(id, MISSING)}
      />
      <span className={"as-dot" + (checkbox ? " as-dot--sq" : "")} aria-hidden="true" />
      <span className="as-dk__t">{tr("dontKnow")}</span>
    </label>
  );

  const anchors = anchorsFor(scale);
  const fillFraction = typeof value === "number" && value >= 1 && value <= scale ? (value - 1) / (scale - 1) : 0;

  return (
    <li className={"as-q" + (ctx ? " as-q--ctx" : "") + (answered ? " is-done" : "") + (missing && !answered ? " is-missing" : "")}>
      <div className="as-q__head">
        <span className="as-q__mark" aria-hidden="true">
          <Ping play={ping} color="#00802f" size={14} scale={2.8} duration={0.8} />
        </span>
        <p id={qid} className="as-question">{frage}</p>
      </div>

      <div className="as-ans">
        {options ? (
          <div role={multi ? "group" : "radiogroup"} aria-labelledby={qid} aria-describedby={multi ? hintId : undefined}>
            {multi && <p id={hintId} className="as-hint">{tr("multiHint")}</p>}
            <div className="as-opts">
              {options.map((o) => (
                <label key={o.value} className={"as-opt" + (aktiv(o.value) ? " is-on" : "")}>
                  <input
                    type={multi ? "checkbox" : "radio"} name={name} className="as-vh as-in" checked={aktiv(o.value)}
                    onChange={() => (multi && onToggle ? onToggle(id, o.value, o.value === 1) : onAnswer(id, o.value))}
                  />
                  <span className={"as-dot" + (multi ? " as-dot--sq" : "")} aria-hidden="true" />
                  <span className="as-opt__t">{pick(o, lang)}</span>
                </label>
              ))}
              <label className={"as-opt as-opt--dk" + (value === MISSING ? " is-on" : "")}>
                <input
                  type={multi ? "checkbox" : "radio"} name={name} className="as-vh as-in" checked={value === MISSING}
                  onChange={() => onAnswer(id, MISSING)}
                />
                <span className={"as-dot" + (multi ? " as-dot--sq" : "")} aria-hidden="true" />
                <span className="as-opt__t">{tr("dontKnow")}</span>
              </label>
            </div>
          </div>
        ) : scale === 2 ? (
          <div role="radiogroup" aria-labelledby={qid} className="as-ynrow">
            <div className="as-yn">
              <label className="as-pillopt">
                <input type="radio" name={name} className="as-vh as-in" checked={value === 2} onChange={() => onAnswer(id, 2)} />
                <span className="as-pillopt__t">{pick(YES_NO.yes, lang)}</span>
              </label>
              <label className="as-pillopt">
                <input type="radio" name={name} className="as-vh as-in" checked={value === 1} onChange={() => onAnswer(id, 1)} />
                <span className="as-pillopt__t">{pick(YES_NO.no, lang)}</span>
              </label>
            </div>
            {dk(false)}
          </div>
        ) : (
          <div role="radiogroup" aria-labelledby={qid} className="as-scalerow">
            <div className="as-scale" style={{ "--n": scale } as CSSProperties}>
              <span className="as-scale__track" aria-hidden="true">
                <i style={{ "--f": fillFraction } as CSSProperties} />
              </span>
              {Array.from({ length: scale }, (_, k) => k + 1).map((n) => (
                <label key={n} className="as-scale__opt">
                  <input
                    type="radio" name={name} className="as-vh as-scale__in" checked={value === n}
                    onChange={() => onAnswer(id, n)}
                  />
                  <span className="as-scale__c">{n}</span>
                  {n === 1 && <span className="as-vh"> = {pick(anchors.low, lang)}</span>}
                  {n === scale && <span className="as-vh"> = {pick(anchors.high, lang)}</span>}
                </label>
              ))}
            </div>
            <div className="as-scale__anchors" aria-hidden="true">
              <span>1 = {pick(anchors.low, lang)}</span>
              <span>{scale} = {pick(anchors.high, lang)}</span>
            </div>
            {dk(false)}
          </div>
        )}
      </div>
    </li>
  );
}
