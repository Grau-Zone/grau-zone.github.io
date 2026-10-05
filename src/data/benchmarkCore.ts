// Vergleichswerte: Kennzahlen und Schutzregeln.
//
// Verglichen wird nur mit ALLEN Teilnehmenden, ohne Unterteilung nach Branche,
// Groesse, Funktion oder Sitz (Entscheid Adrian, 05.10.2026). Damit lassen sich
// veroeffentlichte Werte keiner Merkmalskombination zuordnen.
//
// Das Ergebnis (benchmark.json) ist oeffentlich: alles, was darin steht, kann
// jeder lesen, auch wenn die Oberflaeche es nicht anzeigt. Deshalb stehen hier
// nur zusammengefasste Werte, und die Regeln sind Konstanten, keine Optionen.
//
//  1. Mindestens K_MIN Teilnahmen insgesamt und je Kennzahl.
//  2. Nur gerundete Quartile (p25, p50, p75). Kein Mittelwert, kein Minimum,
//     kein Maximum, keine weiteren Perzentile.
//  3. Quadranten-Anteile erst ab QUAD_FROM, und Quadranten mit weniger als
//     K_MIN Teilnahmen ohne Anteil.
//  4. Ein neuer Stand nur, wenn sich die Gesamtzahl um mindestens K_MIN
//     veraendert hat. Hat sich die Zahl gueltiger Werte einer Kennzahl nur um 1
//     veraendert, bleibt diese Kennzahl auf dem bisherigen Stand. Die exakten
//     Zahlen dafuer liegen in einer privaten Zustandsdatei ausserhalb des Repos.
//
// K_MIN = 2 ist ein bewusster Entscheid (Adrian, 05.10.2026). Bei zwei oder drei
// Teilnahmen lassen sich die Einzelwerte aus den Quartilen ableiten, aber
// keiner Organisation zuordnen. Einbezogen werden alle Antworten des
// Instruments (Entscheid 05.10.2026); --since im Skript bleibt fuer einen
// Stichtag verfuegbar.
import type { CapacityKey } from "./capacityItems";
import type { QuadKey, RespondentScores } from "./scoring";
import { INSTRUMENT_VERSION } from "./instrument";

export const K_MIN = 2;
export const FINE_FROM = 10;
export const QUAD_FROM = 10;
export const CAP_STEP = { coarse: 0.5, fine: 0.25 };   // Skala 1..7
export const CTX_STEP = 0.05;                          // Skala 0..1, also 5 Prozentpunkte

// Muss mit buildRecord() in Assessment.tsx uebereinstimmen.
export const INSTRUMENT_ID = "capacity-v1 + " + INSTRUMENT_VERSION + "_research";

export type Quant = { p25: number; p50: number; p75: number };
export type MetricKey = CapacityKey | "ftc" | "cto" | "cont";
export type Summary = {
  n: number;
  cap: Record<CapacityKey, Quant | null>;
  ftc: Quant | null;
  cto: Quant | null;
  cont: Quant | null;
  quad?: Record<QuadKey, number | null>;   // Prozent; null = unter K_MIN
};
export type BenchmarkFile = {
  schema: 2;
  asOf: string | null;
  instrument: string;
  kMin: number;
  all: Summary | null;
};

// Private Zustandsdatei: exakte Zahlen des zuletzt veroeffentlichten Stands.
// Liegt AUSSERHALB des Repositorys und wird nie veroeffentlicht.
export type BenchmarkState = { asOf: string; n: number; valid: Record<MetricKey, number> };

export const emptyBenchmark = (): BenchmarkFile => ({
  schema: 2, asOf: null, instrument: INSTRUMENT_ID, kMin: K_MIN, all: null,
});

const CAP_KEYS: CapacityKey[] = ["SW", "IN", "MS", "NE"];
const METRICS: MetricKey[] = [...CAP_KEYS, "ftc", "cto", "cont"];
const metricOf = (s: RespondentScores, m: MetricKey): number | null =>
  m === "ftc" || m === "cto" || m === "cont" ? s[m] : s.cap[m];

// Quantil nach Hyndman-Fan Typ 7 (Standard in R und numpy), Werte aufsteigend sortiert.
export function quantile7(sorted: number[], p: number): number {
  if (!sorted.length) throw new Error("quantile7: leere Liste");
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

// Vorher auf 1e9 normalisieren: sonst kippt eine exakte Halbstufe je nach
// Gleitkomma-Rauschen mal nach oben, mal nach unten.
export function roundStep(v: number, step: number): number {
  const k = Math.round(Math.round((v / step) * 1e9) / 1e9);
  return Math.round(k * step * 1e6) / 1e6;
}

// Rundungsstufe der Faehigkeiten, damit der eigene Wert genauso gerundet
// verglichen werden kann.
export const capStepOf = (s: Summary) => (s.n >= FINE_FROM ? CAP_STEP.fine : CAP_STEP.coarse);

function quant(values: (number | null)[], step: number): Quant | null {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length < K_MIN) return null;
  return {
    p25: roundStep(quantile7(v, 0.25), step),
    p50: roundStep(quantile7(v, 0.5), step),
    p75: roundStep(quantile7(v, 0.75), step),
  };
}

export type BuildResult = { file: BenchmarkFile; state: BenchmarkState | null; report: string[] };

// Baut den oeffentlichen Stand und den privaten Zustand. Wirft, wenn Regel 4
// fuer die Gesamtzahl verletzt waere.
export function buildBenchmark(
  rows: RespondentScores[],
  asOf: string,
  prev: BenchmarkFile | null,
  prevState: BenchmarkState | null,
): BuildResult {
  const report: string[] = [];
  const N = rows.length;
  if (prev?.all) {
    if (!prevState) throw new Error("Regel 4: Es gibt schon einen Stand, aber keine Zustandsdatei (--state).");
    if (Math.abs(N - prevState.n) < K_MIN) {
      throw new Error(`Regel 4: Gesamtzahl ${N}, bisheriger Stand ${prevState.n}. Ein neuer Stand braucht mindestens ${K_MIN} Antworten Unterschied.`);
    }
  }
  const file = emptyBenchmark();
  file.asOf = asOf;
  report.push(`Antworten nach Filterung: ${N}`);
  if (N < K_MIN) {
    report.push(`Unter ${K_MIN}: es wird nichts veroeffentlicht.`);
    return { file, state: null, report };
  }

  const valid = {} as Record<MetricKey, number>;
  METRICS.forEach((m) => { valid[m] = rows.filter((r) => metricOf(r, m) !== null).length; });

  // Regel 4 je Kennzahl: Veraenderung der gueltigen Werte um genau 1 ->
  // bisherige Werte dieser Kennzahl behalten, samt bisheriger Zahl im Zustand.
  const carried = new Set<MetricKey>();
  if (prev?.all && prevState) {
    METRICS.forEach((m) => {
      const d = Math.abs(valid[m] - prevState.valid[m]);
      if (d > 0 && d < K_MIN) { carried.add(m); valid[m] = prevState.valid[m]; }
    });
  }
  const pick = (m: MetricKey, step: number): Quant | null => {
    if (carried.has(m)) {
      const p = prev!.all!;
      return m === "ftc" || m === "cto" || m === "cont" ? p[m] : p.cap[m];
    }
    return quant(rows.map((r) => metricOf(r, m)), step);
  };

  const capStep = N >= FINE_FROM ? CAP_STEP.fine : CAP_STEP.coarse;
  const cap = {} as Record<CapacityKey, Quant | null>;
  CAP_KEYS.forEach((k) => { cap[k] = pick(k, capStep); });
  const all: Summary = { n: N, cap, ftc: pick("ftc", CTX_STEP), cto: pick("cto", CTX_STEP), cont: pick("cont", CTX_STEP) };

  const withQuad = rows.filter((r) => r.quad !== null);
  if (withQuad.length >= QUAD_FROM) {
    const share = (k: QuadKey) => {
      const c = withQuad.filter((r) => r.quad === k).length;
      if (c > 0 && c < K_MIN) return null;
      return Math.round((c / withQuad.length) * 20) * 5;
    };
    all.quad = { sovereign: share("sovereign"), exit: share("exit"), settled: share("settled"), exposed: share("exposed") };
  }
  file.all = all;
  if (carried.size) report.push(`Bisheriger Stand behalten fuer: ${[...carried].join(", ")} (Regel 4 je Kennzahl)`);
  report.push("veroeffentlicht: alle Teilnehmenden");
  return { file, state: { asOf, n: N, valid }, report };
}

export type Position = "low" | "mid" | "high";

// Lage des eigenen Werts gegenueber allen Teilnehmenden, bewusst grob. Der
// eigene Wert wird so gerundet wie die Quartile, sonst landet ein Wert genau
// auf dem Quartil wegen der Rundung im falschen Viertel.
export function positionOf(own: number | null, q: Quant | null, step = 0): Position | null {
  if (own === null || !q) return null;
  const o = step ? roundStep(own, step) : own;
  if (o < q.p25) return "low";
  if (o > q.p75) return "high";
  return "mid";
}
