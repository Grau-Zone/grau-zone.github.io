import { describe, it, expect } from "vitest";
import {
  quantile7, roundStep, nBand, buildBenchmark, positionOf, K_MIN, MAX_SMALL_DIMS, type ScoredRow,
} from "./benchmarkCore";
import type { DimKey } from "./benchmarkGroups";

describe("quantile7", () => {
  it("stimmt mit numpy (linear) ueberein", () => {
    expect(quantile7([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
    expect(quantile7([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
    expect(quantile7([1, 2, 3, 4], 0.75)).toBeCloseTo(3.25);
    expect(quantile7([3, 5], 0.5)).toBeCloseTo(4);
  });
  it("rundet auf Stufen, auch exakte Halbstufen stabil", () => {
    expect(roundStep(3.26, 0.5)).toBe(3.5);
    expect(roundStep(3.2, 0.25)).toBe(3.25);
    expect(roundStep(0.4167, 0.05)).toBe(0.4);
    // 0.425 liegt genau auf der Halbstufe; Gleitkomma-Rauschen darf nicht entscheiden
    expect(roundStep(0.425, 0.05)).toBe(roundStep(0.42500000000000004, 0.05));
    expect(roundStep(0.425, 0.05)).toBe(roundStep(0.42499999999999993, 0.05));
  });
});

describe("nBand", () => {
  it("gibt nur Spannen aus", () => {
    expect(nBand(2)).toEqual([2, 4]);
    expect(nBand(7)).toEqual([5, 9]);
    expect(nBand(14)).toEqual([10, 14]);
  });
});

type G = Partial<Record<DimKey, string>>;
function row(g: G, v: number, opts: { swNull?: boolean; ftcNull?: boolean } = {}): ScoredRow {
  return {
    groups: g,
    scores: {
      cap: { SW: opts.swNull ? null : v, IN: v, MS: v, NE: v },
      ftc: opts.ftcNull ? null : (v - 1) / 6, cto: (v - 1) / 6, cont: (v - 1) / 6,
      quad: opts.ftcNull ? null : v > 4 ? "sovereign" : "exposed",
    },
  };
}

describe("buildBenchmark", () => {
  it("veroeffentlicht unter K_MIN nichts", () => {
    const { file, state } = buildBenchmark([row({}, 4)], "2026-10-06", null, null);
    expect(file.nTotal).toBeNull();
    expect(file.groups).toEqual({});
    expect(state).toBeNull();
  });

  it("unterdrueckt Merkmale mit einer Gruppe unter K_MIN oder einem Rest von genau 1", () => {
    const rows: ScoredRow[] = [
      row({ branche: "reguliert", groesse: "ab1000", sitz: "schweiz" }, 3),
      row({ branche: "reguliert", groesse: "ab1000", sitz: "schweiz" }, 5),
      row({ branche: "reguliert", groesse: "unter1000", sitz: "schweiz" }, 6),
      row({ branche: "weitere", groesse: "unter1000", sitz: "ausland" }, 2),
      row({ sitz: "ausland" }, 4, { swNull: true }),
    ];
    const { file } = buildBenchmark(rows, "2026-10-06", null, null);
    expect(file.nTotal).toBe(5);
    // branche: weitere = 1 -> raus; groesse: Rest 1 -> raus; sitz: 3/2 -> drin
    expect(Object.keys(file.groups).sort()).toEqual(["all", "sitz:ausland", "sitz:schweiz"]);
    expect(file.groups["sitz:schweiz"].n).toBeUndefined();
    expect(file.groups["sitz:schweiz"].nBand).toEqual([2, 4]);
    const json = JSON.stringify(file);
    ["mean", "min", "max", "p10", "p90"].forEach((k) => expect(json).not.toContain(`"${k}"`));
  });

  it("wendet Regel 2 je Kennzahl an", () => {
    // Ausland: zwei Teilnahmen, eine davon ohne FTC -> FTC in BEIDEN Gruppen leer
    const rows: ScoredRow[] = [
      row({ sitz: "schweiz" }, 3), row({ sitz: "schweiz" }, 5), row({ sitz: "schweiz" }, 6),
      row({ sitz: "ausland" }, 2), row({ sitz: "ausland" }, 4, { ftcNull: true }),
    ];
    const { file } = buildBenchmark(rows, "2026-10-06", null, null);
    expect(file.groups["sitz:schweiz"].ftc).toBeNull();
    expect(file.groups["sitz:ausland"].ftc).toBeNull();
    expect(file.groups["sitz:schweiz"].cto).not.toBeNull();
  });

  it("stellt nach Regel 8 weitere Merkmale mit kleinen Gruppen zurueck", () => {
    const rows: ScoredRow[] = [
      row({ branche: "reguliert", groesse: "unter1000", funktion: "anwendungen", sitz: "schweiz" }, 2),
      row({ branche: "reguliert", groesse: "ab1000", funktion: "infrastruktur", sitz: "ausland" }, 3),
      row({ branche: "weitere", groesse: "unter1000", funktion: "infrastruktur", sitz: "schweiz" }, 5),
      row({ branche: "weitere", groesse: "ab1000", funktion: "anwendungen", sitz: "ausland" }, 6),
    ];
    const { file, report } = buildBenchmark(rows, "2026-10-06", null, null);
    const dims = new Set(Object.keys(file.groups).filter((k) => k !== "all").map((k) => k.split(":")[0]));
    expect(dims.size).toBe(MAX_SMALL_DIMS);
    expect(report.join("\n")).toMatch(/Regel 8/);
  });

  it("veroeffentlicht mehrere Merkmale, sobald die Gruppen gross genug sind", () => {
    const rows: ScoredRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(row({ branche: i % 2 ? "reguliert" : "weitere", sitz: i % 4 < 2 ? "schweiz" : "ausland" }, 1 + (i % 7)));
    }
    const { file } = buildBenchmark(rows, "2026-10-06", null, null);
    expect(file.groups["branche:reguliert"]).toBeDefined();
    expect(file.groups["sitz:schweiz"]).toBeDefined();
  });

  it("verweigert einen neuen Stand mit weniger als K_MIN neuen Antworten oder ohne Zustand", () => {
    const rows = [row({}, 3), row({}, 5), row({}, 6), row({}, 2)];
    const first = buildBenchmark(rows.slice(0, 2), "2026-10-06", null, null);
    expect(() => buildBenchmark(rows.slice(0, 3), "2026-10-07", first.file, first.state)).toThrow(/Regel 6/);
    expect(() => buildBenchmark(rows, "2026-10-07", first.file, null)).toThrow(/Zustandsdatei/);
    expect(() => buildBenchmark(rows, "2026-10-07", first.file, first.state)).not.toThrow();
  });

  it("laesst ein Merkmal auf dem bisherigen Stand, wenn sich eine Gruppe nur um 1 veraendert", () => {
    const mk = (n: number, g: string, v: number) => Array.from({ length: n }, () => row({ sitz: g }, v));
    const first = buildBenchmark([...mk(3, "schweiz", 3), ...mk(3, "ausland", 5)], "2026-10-06", null, null);
    // +1 Schweiz, +1 Ausland: Gesamtzahl +2 erlaubt, aber jede Gruppe nur +1
    const second = buildBenchmark([...mk(3, "schweiz", 3), row({ sitz: "schweiz" }, 7), ...mk(3, "ausland", 5), row({ sitz: "ausland" }, 1)], "2026-10-20", first.file, first.state);
    expect(second.file.groups["sitz:schweiz"]).toEqual(first.file.groups["sitz:schweiz"]);
    expect(second.state!.groups["sitz:schweiz"]).toEqual(first.state!.groups["sitz:schweiz"]);
    expect(second.file.groups.all.n).toBe(8);
  });

  it("weist Quadranten mit weniger als K_MIN nicht aus", () => {
    const rows = Array.from({ length: 11 }, (_, i) => row({}, i === 0 ? 6 : 2));
    const { file } = buildBenchmark(rows, "2026-10-06", null, null);
    expect(file.groups.all.quad?.sovereign).toBeNull();
    expect(file.groups.all.quad?.exposed).toBe(90);
  });

  it("K_MIN ist 2", () => {
    expect(K_MIN).toBe(2);
  });
});

describe("positionOf", () => {
  it("ordnet grob ein und rundet den eigenen Wert wie die Quartile", () => {
    const q = { p25: 3, p50: 4, p75: 5 };
    expect(positionOf(2.5, q)).toBe("low");
    expect(positionOf(4, q)).toBe("mid");
    expect(positionOf(5.5, q)).toBe("high");
    expect(positionOf(null, q)).toBeNull();
    // eigener Wert 2.75 gegen ein auf 0.5 gerundetes p25 von 3: gleiche Rundung -> mittlere Haelfte
    expect(positionOf(2.75, q, 0.5)).toBe("mid");
  });
});
