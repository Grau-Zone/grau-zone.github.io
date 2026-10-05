import { describe, it, expect } from "vitest";
import { quantile7, roundStep, buildBenchmark, positionOf, K_MIN } from "./benchmarkCore";
import type { RespondentScores } from "./scoring";

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
    expect(roundStep(0.425, 0.05)).toBe(roundStep(0.42500000000000004, 0.05));
    expect(roundStep(0.425, 0.05)).toBe(roundStep(0.42499999999999993, 0.05));
  });
});

function r(v: number, opts: { swNull?: boolean; ftcNull?: boolean } = {}): RespondentScores {
  return {
    cap: { SW: opts.swNull ? null : v, IN: v, MS: v, NE: v },
    ftc: opts.ftcNull ? null : (v - 1) / 6, cto: (v - 1) / 6, cont: (v - 1) / 6,
    quad: opts.ftcNull ? null : v > 4 ? "sovereign" : "exposed",
  };
}

describe("buildBenchmark", () => {
  it("veroeffentlicht unter K_MIN nichts", () => {
    const { file, state } = buildBenchmark([r(4)], "2026-10-06", null, null);
    expect(file.all).toBeNull();
    expect(state).toBeNull();
  });

  it("veroeffentlicht nur alle Teilnehmenden, ohne Gruppen und ohne Einzelwerte", () => {
    const { file } = buildBenchmark([r(3), r(5), r(6), r(2), r(4, { swNull: true })], "2026-10-06", null, null);
    expect(file.all?.n).toBe(5);
    expect(Object.keys(file)).toEqual(["schema", "asOf", "instrument", "kMin", "all"]);
    const json = JSON.stringify(file);
    ["mean", "min", "max", "p10", "p90", "groups", "nBand"].forEach((k) => expect(json).not.toContain(`"${k}"`));
  });

  it("laesst eine Kennzahl mit weniger als K_MIN gueltigen Werten leer", () => {
    const { file } = buildBenchmark([r(3, { ftcNull: true }), r(5, { ftcNull: true }), r(6)], "2026-10-06", null, null);
    expect(file.all?.ftc).toBeNull();
    expect(file.all?.cto).not.toBeNull();
  });

  it("verweigert einen neuen Stand mit weniger als K_MIN neuen Antworten oder ohne Zustand", () => {
    const rows = [r(3), r(5), r(6), r(2)];
    const first = buildBenchmark(rows.slice(0, 2), "2026-10-06", null, null);
    expect(() => buildBenchmark(rows.slice(0, 3), "2026-10-07", first.file, first.state)).toThrow(/Regel 4/);
    expect(() => buildBenchmark(rows, "2026-10-07", first.file, null)).toThrow(/Zustandsdatei/);
    expect(() => buildBenchmark(rows, "2026-10-07", first.file, first.state)).not.toThrow();
  });

  it("behaelt eine Kennzahl, deren gueltige Werte sich nur um 1 veraendert haben", () => {
    const first = buildBenchmark([r(3), r(5), r(6)], "2026-10-06", null, null);
    // +2 Antworten, aber nur eine davon mit FTC
    const second = buildBenchmark([r(3), r(5), r(6), r(1), r(7, { ftcNull: true })], "2026-10-20", first.file, first.state);
    expect(second.file.all?.ftc).toEqual(first.file.all?.ftc);
    expect(second.state?.valid.ftc).toBe(first.state?.valid.ftc);
    expect(second.file.all?.cto).not.toEqual(first.file.all?.cto);
  });

  it("weist Quadranten mit weniger als K_MIN nicht aus", () => {
    const rows = Array.from({ length: 11 }, (_, i) => r(i === 0 ? 6 : 2));
    const { file } = buildBenchmark(rows, "2026-10-06", null, null);
    expect(file.all?.quad?.sovereign).toBeNull();
    expect(file.all?.quad?.exposed).toBe(90);
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
    expect(positionOf(2.75, q, 0.5)).toBe("mid");
  });
});
