// Zustand und Konstanten des Self-Assessments, aus pages/Assessment.tsx herausgezogen,
// damit die Bildschirme in eigenen Dateien liegen koennen. Inhalt und Logik sind
// unveraendert uebernommen.
import { ACTIVE } from "../../data/scoring";
import { readLS } from "../../data/storageKeys";
import { CAPACITIES, itemsOfCapacity, type CapacityKey } from "../../data/capacityItems";
import { CONTEXT_GROUPS, FUNCTIONS, FUNCTION_OTHER, UI, pick } from "../../data/surveyUi";
import type { Lang } from "../../data/instrument";

// Mehrfachauswahl-Items (ATR-3) speichern eine Liste von Optionswerten.
// MISSING bleibt auch dort die einzelne Zahl 99 und wird nie als Null gewertet.
export type Answers = Record<string, number | number[]>;
export type Phase = "lang" | "intro" | "intake" | "blocks" | "result";

export const load = readLS;

// Schreiben muss genauso abgesichert sein wie Lesen. In einem iframe auf einer
// fremden Domain sperren Browser den Speicher: Safari grundsaetzlich, Chrome
// sobald jemand Drittanbieter-Daten blockiert. Der Zugriff wirft dann einen
// SecurityError. Ungefangen aus einem useEffect heraus reisst der die gesamte
// Anwendung mit, die Seite bleibt weiss. Nachgestellt am 15.09.2026: nach der
// Sprachwahl war der Seiteninhalt von 246 Zeichen auf 0 gefallen.
//
// Ohne Speicher geht nur der Fortschritt verloren, der Fragebogen selbst laeuft.
export const save = (k: string, v: unknown): void => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* gesperrt oder voll */ }
};
export const drop = (k: string): void => {
  try { localStorage.removeItem(k); } catch { /* egal */ }
};

// Fuenf Bloecke des Fragebogens. Die ersten vier sind das oeffentliche
// Capacity-Modell, der fuenfte sammelt die Items des Forschungsinstruments.
// Die Items des fuenften Blocks fliessen nicht in die Capacity-Werte ein.
export type BlockDef =
  | { kind: "cap"; key: CapacityKey }
  | { kind: "ctx"; key: "CTX" };
export const BLOCKS: BlockDef[] = [
  ...CAPACITIES.map((c) => ({ kind: "cap" as const, key: c.key })),
  { kind: "ctx" as const, key: "CTX" as const },
];
export const CTX_COLOR = "rgba(160,175,205,1)";
export const blockColor = (b: BlockDef) =>
  b.kind === "cap" ? CAPACITIES.find((c) => c.key === b.key)!.color : CTX_COLOR;

// Items eines Blocks. Fuer den Kontextblock die im Instrument ausgewaehlten Items,
// gruppiert nach den neutralen Ueberschriften aus CONTEXT_GROUPS.
export const ctxItemsOfGroup = (g: { constructs: string[] }) =>
  ACTIVE.filter((i) => g.constructs.includes(i.construct));
export const itemIdsOfBlock = (b: BlockDef): string[] =>
  b.kind === "cap"
    ? itemsOfCapacity(b.key).map((i) => i.id)
    : CONTEXT_GROUPS.flatMap((g) => ctxItemsOfGroup(g).map((i) => i.id));

// Intake: gewaehlte Funktion (Schluessel) oder Freitext unter "other"
// stateRole, operatedBy, operatorType: freiwillige Zusatzfragen (seit 20.10.2026);
// operatorType gilt nur, wenn operatedBy = "yes".
export type IntakeState = {
  fnKey: string; fnOther: string; provider: string; size: string; industry: string; hq: string;
  stateRole: string; operatedBy: string; operatorType: string;
};
export const EMPTY_INTAKE: IntakeState = {
  fnKey: "", fnOther: "", provider: "", size: "", industry: "", hq: "",
  stateRole: "", operatedBy: "", operatorType: "",
};
export const EMPTY_ANSWERS: Answers = {};

export function functionLabel(intake: IntakeState, lang: Lang): string {
  if (intake.fnKey === FUNCTION_OTHER) return intake.fnOther.trim();
  const f = FUNCTIONS.find((x) => x.key === intake.fnKey);
  return f ? pick(f.label, lang) : "";
}
export function typicalProviders(intake: IntakeState, lang: Lang): string {
  const f = FUNCTIONS.find((x) => x.key === intake.fnKey);
  return f ? pick(f.providers, lang) : "";
}

// ctaItems ist als einziger UI-Eintrag ein Array und wird direkt gerendert,
// deshalb nimmt tr() nur die Schluessel mit einfachem {en,de}-Wert.
export type TrKey = { [K in keyof typeof UI]: (typeof UI)[K] extends { en: string } ? K : never }[keyof typeof UI];
export type Tr = (k: TrKey) => string;
