// Aktueller Stand der Vergleichswerte. benchmark.json wird von
// tools/build_benchmark.ts erzeugt und nie von Hand bearbeitet.
import raw from "./benchmark.json";
import type { BenchmarkFile, GroupBlock } from "./benchmarkCore";
import type { Lang } from "./instrument";

// Unerwartetes Format (z. B. ein Stand aus einer anderen Fassung): wie "noch
// kein Stand" behandeln, damit keine Seite an einem fehlenden Feld abstuerzt.
const parsed = raw as unknown as BenchmarkFile;
export const BENCHMARK: BenchmarkFile =
  parsed?.schema === 1 && parsed.groups && typeof parsed.groups === "object"
    ? parsed
    : { schema: 1, asOf: null, instrument: "", kMin: 2, nTotal: null, groups: {} };

// Gibt es ueberhaupt einen veroeffentlichten Stand?
// Robust gegen ein unerwartetes Format: dann lieber "noch keine Werte" als eine leere Seite.
export const hasBenchmark = (b: BenchmarkFile = BENCHMARK) =>
  b?.schema === 1 && b.nTotal !== null && !!b.groups?.all;

export function fmtAsOf(asOf: string | null, lang: Lang): string {
  if (!asOf) return "";
  const d = new Date(asOf + "T00:00:00Z");
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "de-CH", {
    day: lang === "en" ? "numeric" : "2-digit", month: lang === "en" ? "short" : "2-digit", year: "numeric", timeZone: "UTC",
  });
}

// Zahlen ohne ueberfluessige Nullen, mit Dezimalkomma im Deutschen.
export function fmtNum(v: number, lang: Lang, digits = 2): string {
  const s = v.toFixed(digits).replace(/\.?0+$/, "");
  return lang === "de" ? s.replace(".", ",") : s;
}

export const fmtPct = (v: number) => `${Math.round(v * 100)} %`;

// Unter 20 Teilnahmen sind Quartile noch wacklig.
export const isSmall = (g: GroupBlock) => (g.n ?? g.nBand?.[1] ?? 0) < 20;
