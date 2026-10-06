// Vergleichswerte: Kennzahlen und Schutzregeln.
//
// Das Ergebnis (benchmark.json) ist oeffentlich: alles, was darin steht, kann
// jeder lesen, auch wenn die Oberflaeche es nicht anzeigt. Deshalb stehen hier
// nur zusammengefasste Werte, und die Regeln sind Konstanten, keine Optionen.
//
//  1. Mindestens K_MIN Teilnahmen je Gruppe und je Kennzahl.
//  2. Ein Merkmal erscheint nur, wenn beide Gruppen K_MIN erreichen und der Rest
//     (keine Angabe, andere Funktion) 0 oder >= K_MIN ist, und zwar je Kennzahl:
//     auch die gueltigen Werte einer Kennzahl muessen in A, B und Rest 0 oder
//     >= K_MIN sein. Sonst liesse sich "Alle minus Gruppe" auf Einzelne
//     zurueckrechnen.
//  3. Nur gerundete Quartile (p25, p50, p75). Kein Mittelwert, kein Minimum,
//     kein Maximum, keine weiteren Perzentile.
//  4. Gruppengroesse nur als Spanne; nur die Gesamtzahl ist exakt.
//  5. Quadranten-Anteile nur fuer "Alle", erst ab QUAD_FROM, und Quadranten mit
//     weniger als K_MIN Teilnahmen ohne Anteil.
//  6. Ein neuer Stand nur, wenn sich die Gesamtzahl um mindestens K_MIN
//     veraendert hat. Hat sich eine Gruppe nur um 1 veraendert, bleibt ihr
//     Merkmal auf dem bisherigen Stand stehen. Die exakten Zahlen dafuer liegen
//     in einer privaten Zustandsdatei ausserhalb des Repositorys.
//  7. Unterdrueckte Gruppen fehlen ganz, ohne Zahl.
//  8. Kleine Gruppen (unter SMALL_GROUP) duerfen in hoechstens MAX_SMALL_DIMS
//     Merkmalen gleichzeitig stehen. Sonst lassen sich die Werte ueber die
//     Schnittmengen mehrerer Merkmale einer vollstaendigen Kombination aus
//     Branche, Groesse, Funktion und Sitz zuordnen.
//
// K_MIN = 2 ist ein bewusster Entscheid (Adrian, 05.10.2026). Bei Gruppen aus
// zwei oder drei Teilnahmen lassen sich die Einzelwerte aus den Quartilen
// ableiten; Regel 8 verhindert, dass sie einer Organisation zuordenbar werden
// (ebenfalls bestaetigt am 05.10.2026). Einbezogen werden alle Antworten des
// Instruments, auch solche vor dem Hinweis in der Einwilligung (Entscheid
// 05.10.2026); --since im Skript bleibt fuer einen Stichtag verfuegbar.
import type { CapacityKey } from "./capacityItems";
import type { QuadKey, RespondentScores } from "./scoring";
import { DIMENSIONS, ALL, groupId, type DimKey } from "./benchmarkGroups";
import { INSTRUMENT_VERSION } from "./instrument";

export const K_MIN = 2;
export const SMALL_GROUP = 5;
export const MAX_SMALL_DIMS = 1;
export const FINE_FROM = 10;
export const QUAD_FROM = 10;
export const CAP_STEP = { coarse: 0.5, fine: 0.25 };   // Skala 1..7
export const CTX_STEP = 0.05;                          // Skala 0..1, also 5 Prozentpunkte

// Muss mit buildRecord() in Assessment.tsx uebereinstimmen.
export const INSTRUMENT_ID = "capacity-v1 + " + INSTRUMENT_VERSION + "_research";

export type Quant = { p25: number; p50: number; p75: number };
export type MetricKey = CapacityKey | "ftc" | "cto" | "cont" | "tra";
export type GroupBlock = {
  n?: number;                          // nur bei "all"
  nBand?: [number, number];            // nur bei Gruppen
  cap: Record<CapacityKey, Quant | null>;
  ftc: Quant | null;
  cto: Quant | null;
  cont: Quant | null;
  tra?: Quant | null;                      // Transparenz; fehlt in Staenden vor dem 06.10.2026
  quad?: Record<QuadKey, number | null>;   // Prozent, nur bei "all"; null = unter K_MIN
};
export type BenchmarkFile = {
  schema: 1;
  asOf: string | null;
  instrument: string;
  kMin: number;
  nTotal: number | null;
  groups: Record<string, GroupBlock>;
};

// Private Zustandsdatei: exakte Zahlen des zuletzt veroeffentlichten Stands.
// Liegt AUSSERHALB des Repositorys und wird nie veroeffentlicht.
export type GroupCounts = { n: number; valid: Record<MetricKey, number> };
export type BenchmarkState = { asOf: string; nTotal: number; groups: Record<string, GroupCounts> };

export type ScoredRow = { groups: Partial<Record<DimKey, string>>; scores: RespondentScores };

export const emptyBenchmark = (): BenchmarkFile => ({
  schema: 1, asOf: null, instrument: INSTRUMENT_ID, kMin: K_MIN, nTotal: null, groups: {},
});

const CAP_KEYS: CapacityKey[] = ["SW", "IN", "MS", "NE"];
const METRICS: MetricKey[] = [...CAP_KEYS, "ftc", "cto", "cont", "tra"];
const metricOf = (r: ScoredRow, m: MetricKey): number | null =>
  m === "ftc" || m === "cto" || m === "cont" || m === "tra" ? r.scores[m] : r.scores.cap[m];

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

// Rundungsstufe einer Faehigkeit in einem Block, damit der eigene Wert genauso
// gerundet verglichen werden kann.
export const capStepOf = (b: GroupBlock) =>
  (b.n ?? b.nBand?.[0] ?? 0) >= FINE_FROM ? CAP_STEP.fine : CAP_STEP.coarse;

function quant(values: (number | null)[], step: number): Quant | null {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length < K_MIN) return null;
  return {
    p25: roundStep(quantile7(v, 0.25), step),
    p50: roundStep(quantile7(v, 0.5), step),
    p75: roundStep(quantile7(v, 0.75), step),
  };
}

export function nBand(n: number): [number, number] {
  if (n < 5) return [K_MIN, 4];
  const lo = Math.floor(n / 5) * 5;
  return [lo, lo + 4];
}

const countValid = (rows: ScoredRow[]) => {
  const valid = {} as Record<MetricKey, number>;
  METRICS.forEach((m) => { valid[m] = rows.filter((r) => metricOf(r, m) !== null).length; });
  return { n: rows.length, valid };
};

// Kennzahlen, die nach Regel 2 je Kennzahl in einem Merkmal unterdrueckt werden.
function blockedMetrics(a: ScoredRow[], b: ScoredRow[], rest: ScoredRow[]): Set<MetricKey> {
  const bad = (x: number) => x > 0 && x < K_MIN;
  const out = new Set<MetricKey>();
  METRICS.forEach((m) => {
    const c = (rows: ScoredRow[]) => rows.filter((r) => metricOf(r, m) !== null).length;
    if (bad(c(a)) || bad(c(b)) || bad(c(rest))) out.add(m);
  });
  return out;
}

function block(rows: ScoredRow[], isAll: boolean, blocked: Set<MetricKey> = new Set()): GroupBlock {
  const fine = rows.length >= FINE_FROM;
  const pick = (m: MetricKey, step: number) => (blocked.has(m) ? null : quant(rows.map((r) => metricOf(r, m)), step));
  const cap = {} as Record<CapacityKey, Quant | null>;
  CAP_KEYS.forEach((k) => { cap[k] = pick(k, fine ? CAP_STEP.fine : CAP_STEP.coarse); });
  const b: GroupBlock = {
    cap, ftc: pick("ftc", CTX_STEP), cto: pick("cto", CTX_STEP), cont: pick("cont", CTX_STEP), tra: pick("tra", CTX_STEP),
  };
  if (isAll) {
    b.n = rows.length;
    const withQuad = rows.filter((r) => r.scores.quad !== null);
    if (withQuad.length >= QUAD_FROM) {
      const share = (k: QuadKey) => {
        const c = withQuad.filter((r) => r.scores.quad === k).length;
        if (c > 0 && c < K_MIN) return null;
        return Math.round((c / withQuad.length) * 20) * 5;
      };
      b.quad = { sovereign: share("sovereign"), exit: share("exit"), settled: share("settled"), exposed: share("exposed") };
    }
  } else {
    b.nBand = nBand(rows.length);
  }
  return b;
}

export type BuildResult = { file: BenchmarkFile; state: BenchmarkState | null; report: string[] };

// Baut den oeffentlichen Stand und den privaten Zustand. Wirft, wenn Regel 6
// fuer die Gesamtzahl verletzt waere.
export function buildBenchmark(
  rows: ScoredRow[],
  asOf: string,
  prev: BenchmarkFile | null,
  prevState: BenchmarkState | null,
): BuildResult {
  const report: string[] = [];
  const N = rows.length;
  if (prev && prev.nTotal !== null) {
    if (!prevState) throw new Error("Regel 6: Es gibt schon einen Stand, aber keine Zustandsdatei (--state).");
    if (Math.abs(N - prevState.nTotal) < K_MIN) {
      throw new Error(`Regel 6: Gesamtzahl ${N}, bisheriger Stand ${prevState.nTotal}. Ein neuer Stand braucht mindestens ${K_MIN} Antworten Unterschied.`);
    }
  }
  const file = emptyBenchmark();
  file.asOf = asOf;
  report.push(`Antworten nach Filterung: ${N}`);
  if (N < K_MIN) {
    report.push(`Unter ${K_MIN}: es wird nichts veroeffentlicht.`);
    return { file, state: null, report };
  }
  file.nTotal = N;
  file.groups[ALL] = block(rows, true);
  const state: BenchmarkState = { asOf, nTotal: N, groups: { [ALL]: countValid(rows) } };

  // Kandidaten je Merkmal (Regeln 1 und 2).
  type Cand = { d: DimKey; ids: [string, string]; rows: [ScoredRow[], ScoredRow[]]; blocked: Set<MetricKey>; minN: number };
  const cands: Cand[] = [];
  DIMENSIONS.forEach((d) => {
    const [a, b] = d.groups;
    const ra = rows.filter((r) => r.groups[d.key] === a.key);
    const rb = rows.filter((r) => r.groups[d.key] === b.key);
    const rest = rows.filter((r) => r.groups[d.key] !== a.key && r.groups[d.key] !== b.key);
    const ok = ra.length >= K_MIN && rb.length >= K_MIN && (rest.length === 0 || rest.length >= K_MIN);
    report.push(`${d.key}: ${a.key} ${ra.length}, ${b.key} ${rb.length}, Rest ${rest.length}${ok ? "" : " -> unterdrueckt (Regel 1/2)"}`);
    if (ok) {
      cands.push({
        d: d.key, ids: [groupId(d.key, a.key), groupId(d.key, b.key)], rows: [ra, rb],
        blocked: blockedMetrics(ra, rb, rest), minN: Math.min(ra.length, rb.length),
      });
    }
  });

  // Regel 6 je Gruppe zuerst: Veraenderung um genau 1 -> bisherigen Stand behalten.
  // Erst danach Regel 8, damit auch behaltene alte (kleine) Gruppen mitzaehlen.
  type Plan = Cand & { action: "new" | "keep" | "skip"; effMinN: number; counts: GroupCounts[] };
  const plans: Plan[] = cands.map((c) => {
    const counts = c.rows.map(countValid);
    const changedByOne = prevState && c.ids.some((id, i) => {
      const before = prevState.groups[id];
      if (!before) return false;
      // Kennzahlen, die es im bisherigen Zustand noch nicht gab, zaehlen dort als 0.
      const deltas = [counts[i].n - before.n, ...METRICS.map((m) => counts[i].valid[m] - (before.valid[m] ?? 0))];
      return deltas.some((x) => Math.abs(x) > 0 && Math.abs(x) < K_MIN);
    });
    if (!changedByOne) return { ...c, action: "new", effMinN: c.minN, counts };
    const kept = c.ids.every((id) => prev?.groups[id] && prevState?.groups[id]);
    if (!kept) return { ...c, action: "skip", effMinN: c.minN, counts };
    // Behalten wird der alte Stand, also zaehlen fuer Regel 8 die alten Groessen.
    return { ...c, action: "keep", effMinN: Math.min(...c.ids.map((id) => prevState!.groups[id].n)), counts };
  });
  plans.filter((pl) => pl.action === "skip")
    .forEach((pl) => report.push(`${pl.d}: eine Gruppe hat sich nur um 1 veraendert -> zurueckgestellt (Regel 6)`));
  const live = plans.filter((pl) => pl.action !== "skip");

  // Regel 8: hoechstens MAX_SMALL_DIMS Merkmale mit kleinen Gruppen. Bevorzugt
  // das schon bisher veroeffentlichte Merkmal (stabile Anzeige), sonst das mit
  // der groessten kleinsten Gruppe, sonst die Reihenfolge in DIMENSIONS.
  const wasPublished = (c: Cand) => !!prev?.groups[c.ids[0]];
  const small = live.filter((pl) => pl.effMinN < SMALL_GROUP)
    .sort((x, y) => Number(wasPublished(y)) - Number(wasPublished(x)) || y.effMinN - x.effMinN);
  const dropped = new Set(small.slice(MAX_SMALL_DIMS).map((pl) => pl.d));
  dropped.forEach((d) => report.push(`${d}: kleine Gruppen, -> zurueckgestellt (Regel 8)`));

  live.filter((pl) => !dropped.has(pl.d)).forEach((pl) => {
    if (pl.action === "keep") {
      pl.ids.forEach((id) => { file.groups[id] = prev!.groups[id]; state.groups[id] = prevState!.groups[id]; });
      report.push(`${pl.d}: eine Gruppe hat sich nur um 1 veraendert -> bisheriger Stand bleibt (Regel 6)`);
      return;
    }
    pl.ids.forEach((id, i) => {
      file.groups[id] = block(pl.rows[i], false, pl.blocked);
      state.groups[id] = pl.counts[i];
    });
    report.push(`${pl.d}: veroeffentlicht${pl.blocked.size ? ` (ohne ${[...pl.blocked].join(", ")}, Regel 2 je Kennzahl)` : ""}`);
  });

  // Endkontrolle Regel 8 am fertigen Ergebnis, unabhaengig vom Weg dorthin.
  const smallDims = new Set(
    Object.entries(file.groups)
      .filter(([id, g]) => id !== ALL && (g.nBand?.[1] ?? Infinity) < SMALL_GROUP)
      .map(([id]) => id.split(":")[0]),
  );
  if (smallDims.size > MAX_SMALL_DIMS) {
    throw new Error(`Regel 8: kleine Gruppen in ${[...smallDims].join(", ")}, erlaubt sind ${MAX_SMALL_DIMS}.`);
  }
  return { file, state, report };
}

export type Position = "low" | "mid" | "high";

// Lage des eigenen Werts gegenueber der Vergleichsgruppe, bewusst grob. Der
// eigene Wert wird so gerundet wie die Quartile, sonst landet ein Wert genau
// auf dem Quartil wegen der Rundung im falschen Viertel.
export function positionOf(own: number | null, q: Quant | null, step = 0): Position | null {
  if (own === null || !q) return null;
  const o = step ? roundStep(own, step) : own;
  if (o < q.p25) return "low";
  if (o > q.p75) return "high";
  return "mid";
}
