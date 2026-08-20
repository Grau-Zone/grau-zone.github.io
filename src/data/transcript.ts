// Lesbares Protokoll des Self-Assessments: jede gestellte Frage mit der
// gegebenen Antwort, gruppiert nach Modellspalte und Konstrukt.
//
// Warum eine eigene Datei und nicht der Mailtext: eine mailto-URL wird von
// Mailprogrammen abgeschnitten (Outlook jenseits von rund 2000 Zeichen), und
// dieses Protokoll ist rund 6000 Zeichen lang. Es geht deshalb ueber die
// Zwischenablage oder als Textdatei zum Empfaenger, nicht in die URL.
import { CONSTRUCTS, ITEMS, MISSING, type Lang } from "./instrument";
import { CONSTRUCT_NAMES, FIRM_SIZE, INDUSTRY, HQ, labelOf, anchorsFor, pick } from "./surveyUi";

const NL = String.fromCharCode(10);
const RULE = "-".repeat(66);

type Score = { value: number | null; answered: number; total: number };

export type TranscriptInput = {
  lang: Lang;                       // Sprache, in der die Items beantwortet wurden
  date: string;                     // ISO-Datum
  intake: any;
  functionLabel: string;
  scores: Record<string, Score>;
  answers: Record<string, number>;
  leverLong: string | null;
  leverValue: number | null;
  json?: any;                       // vollstaendiger Datensatz, wird unten angehaengt
};

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export function buildTranscript(inp: TranscriptInput): string {
  const { lang, answers } = inp;
  const text = (i: any) => (lang === "en" ? i.en : i.de);
  const active = ITEMS.filter((i) => i.selected);
  const out: string[] = [];

  // ── Kopf ──────────────────────────────────────────────────────────────────
  out.push("Digitale Souveraenitaet - Organisation Self-Assessment");
  out.push(`Datum: ${inp.date}   Instrument: v13_Instrument_final   Erhebungssprache: ${lang.toUpperCase()}`);
  out.push("");
  if (inp.functionLabel) out.push(`Funktion: ${inp.functionLabel}`);
  if (inp.intake.provider) out.push(`Anbieter: ${inp.intake.provider}`);
  const size = labelOf(FIRM_SIZE, inp.intake.size, lang);
  const ind = labelOf(INDUSTRY, inp.intake.industry, lang);
  const hq = labelOf(HQ, inp.intake.hq, lang);
  if (size) out.push(`Mitarbeiterzahl: ${size}`);
  if (ind) out.push(`Branche: ${ind}`);
  if (hq) out.push(`Hauptsitz: ${hq}`);

  // ── Kernzahlen ────────────────────────────────────────────────────────────
  out.push("", RULE, "ERGEBNIS", RULE);
  ["FTC", "CTO", "CONT"].forEach((k) => {
    out.push(`${pick(CONSTRUCT_NAMES[k], "en")}: ${pct(inp.scores[k]?.value ?? null)}`);
  });
  if (inp.leverLong) {
    out.push(`Groesster Hebel: ${inp.leverLong} (${pct(inp.leverValue)})`);
  }

  // ── Lesehilfe ─────────────────────────────────────────────────────────────
  const a = anchorsFor(7);
  out.push("");
  out.push(`Likert-Skala: 1 = ${pick(a.low, lang)} ... 7 = ${pick(a.high, lang)}`);
  out.push('"weiss nicht" wird als fehlend gefuehrt und nie als Null gewertet.');
  out.push("[R] = umgekehrt gepolt, bei der Auswertung gedreht.");

  // ── Fragen und Antworten je Modellspalte ──────────────────────────────────
  const steps = [...new Set(CONSTRUCTS.map((c) => c.step))];
  steps.forEach((step) => {
    const cs = CONSTRUCTS.filter((c) => c.step === step);
    if (!cs.some((c) => active.some((i) => i.construct === c.key))) return;
    out.push("", RULE, step.toUpperCase(), RULE);

    cs.forEach((c) => {
      const items = active.filter((i) => i.construct === c.key);
      if (!items.length) return;
      const sc = inp.scores[c.key];
      const likertItems = items.filter((i) => i.type === "likert");
      const head = likertItems.length
        ? `${pick(CONSTRUCT_NAMES[c.key], "en")} (${c.key}) - ${pct(sc?.value ?? null)}` +
          (sc && sc.answered < sc.total ? `, ${sc.answered} von ${sc.total} beantwortet` : "")
        : `${pick(CONSTRUCT_NAMES[c.key], "en")} (${c.key}) - Faktenindex, wird als Stufe berichtet`;
      out.push("", head);

      items.forEach((i) => {
        const v = answers[i.id];
        const beantwortet = v !== undefined && v !== MISSING;
        out.push(`  ${i.id}${i.reverse ? " [R]" : ""}  ${text(i)}`);

        if (!beantwortet) {
          out.push(`        Antwort: ${v === MISSING ? "weiss nicht" : "nicht beantwortet"}`);
          return;
        }
        if (i.type === "likert") {
          out.push(`        Antwort: ${v} von ${i.scale || 7}`);
        } else {
          const opt = i.options?.find((o: any) => o.value === v);
          const maxV = Math.max(...(i.options || []).map((o: any) => o.value));
          const minV = Math.min(...(i.options || []).map((o: any) => o.value));
          const unabh =
            i.independentFrom !== undefined
              ? v >= i.independentFrom
                ? "   anbieterunabhaengig"
                : "   abhaengig vom Anbieter"
              : "";
          out.push(`        Antwort: ${opt ? pick(opt, lang) : v} (Stufe ${v} von ${maxV}, Skala ${minV}-${maxV})${unabh}`);
        }
      });
    });
  });

  // ── Maschinenlesbar unten dran, damit eine Datei fuer beides reicht ───────
  if (inp.json) {
    out.push("", RULE, "DATENSATZ (JSON)", RULE);
    out.push("MISSING = 99 bedeutet 'weiss nicht' und ist keine Null.");
    out.push("");
    out.push(JSON.stringify(inp.json, null, 2));
  }

  out.push("", RULE);
  out.push("Erzeugt auf grau-zone.github.io. Nicht validiertes Instrument.");
  return out.join(NL);
}
