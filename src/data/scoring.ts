// Rechenlogik, die Ergebnisseite und Vergleichs-Skript (tools/build_benchmark.ts)
// gemeinsam nutzen. Steht bewusst ausserhalb von Assessment.tsx, damit beide
// garantiert gleich rechnen. Keine Abhaengigkeit vom Browser: laeuft auch in node.
import { ITEMS, CONSTRUCTS, MISSING } from "./instrument";
import { CAPACITIES, CAP_ITEMS, scoreCapacity, type CapacityKey } from "./capacityItems";

export type Answers = Record<string, number | number[]>;

// Nur die in der Excel ausgewaehlten Items (Spalte "Auswahl 3")
export const ACTIVE = ITEMS.filter((i) => i.selected);
export const itemsOfConstruct = (c: string) => ACTIVE.filter((i) => i.construct === c);

// Likert je Konstrukt: Mittel der beantworteten Items, reverse gedreht, auf 0..1.
// "Weiss nicht" (MISSING) zaehlt nie als Wert.
export function likertScore(constructKey: string, a: Record<string, unknown>): number | null {
  const vals: number[] = [];
  itemsOfConstruct(constructKey)
    .filter((i) => i.type === "likert")
    .forEach((i) => {
      const v = a[i.id];
      if (typeof v !== "number" || v === MISSING) return;
      const max = i.scale || 7;
      const corrected = i.reverse ? max + 1 - v : v;
      vals.push((corrected - 1) / (max - 1));
    });
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

export type QuadKey = "sovereign" | "exit" | "settled" | "exposed";

// Quadrant der Matrix. Streng groesser als die Skalenmitte: genau 0.5 ist
// Unentschiedenheit, keine Zustimmung. Vorher runden: je nach Reihenfolge der
// Items liefert die Gleitkommasumme sonst 0.5000000000000001 statt 0.5, und
// gleiche Antworten landen in verschiedenen Quadranten.
export function quadrantKey(ftc: number | null, cto: number | null): QuadKey | null {
  if (ftc === null || cto === null) return null;
  const r = (v: number) => Math.round(v * 1e9) / 1e9;
  const hiF = r(ftc) > 0.5, hiC = r(cto) > 0.5;
  if (hiF && hiC) return "sovereign";
  if (hiF) return "exit";
  if (hiC) return "settled";
  return "exposed";
}

// Transparenz: Anteil der beantworteten Fragen, die nicht mit "Weiss nicht"
// beantwortet wurden, ueber alle Fragen (Faehigkeiten und Kontext). Wer oft
// "Weiss nicht" waehlt, hat wenig Einblick in die Lage im eigenen Unternehmen
// (Entscheid Adrian 06.10.2026). Nicht beantwortete Fragen zaehlen nicht mit.
export function transparencyScore(a: Record<string, unknown>): number | null {
  let answered = 0, dontKnow = 0;
  [...CAP_ITEMS, ...ACTIVE].forEach((i) => {
    const v = a[i.id];
    if (v === undefined || v === null) return;
    answered++;
    if (v === MISSING) dontKnow++;
  });
  if (!answered) return null;
  // In ganzen Prozent (vorher auf 1e9 normalisiert): so rechnen Ergebnisseite,
  // Vergleichsstand und Ergebnis-Code mit genau derselben Zahl.
  return Math.round(Math.round(((answered - dontKnow) / answered) * 100 * 1e9) / 1e9) / 100;
}

export type RespondentScores = {
  cap: Record<CapacityKey, number | null>;   // 1..7 wie gefragt, null unter MIN_VALID
  ftc: number | null;                        // 0..1
  cto: number | null;
  cont: number | null;
  quad: QuadKey | null;
  tra: number | null;                        // 0..1, Transparenz (siehe oben)
};

export function scoreRespondent(a: Answers): RespondentScores {
  const cap = {} as Record<CapacityKey, number | null>;
  CAPACITIES.forEach((c) => { cap[c.key] = scoreCapacity(c.key, a, MISSING).mean; });
  const ftc = likertScore("FTC", a), cto = likertScore("CTO", a), cont = likertScore("CONT", a);
  return { cap, ftc, cto, cont, quad: quadrantKey(ftc, cto), tra: transparencyScore(a) };
}

// Alle Konstrukte auf einmal, fuer die Ergebnisseite.
export function constructScores(a: Record<string, unknown>): Record<string, number | null> {
  const s: Record<string, number | null> = {};
  CONSTRUCTS.forEach((c) => { s[c.key] = likertScore(c.key, a); });
  return s;
}
