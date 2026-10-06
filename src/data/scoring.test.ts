import { describe, it, expect } from "vitest";
import { likertScore, quadrantKey, scoreRespondent, transparencyScore, ACTIVE, itemsOfConstruct } from "./scoring";
import { CONSTRUCTS, MISSING } from "./instrument";
import { CAP_ITEMS } from "./capacityItems";

// Wortgleiche Fassung aus Commit 65749cb (vor der Auslagerung), als Referenz.
function likertScoreAlt(constructKey: string, a: Record<string, unknown>): number | null {
  const items = itemsOfConstruct(constructKey).filter((i) => i.type === "likert");
  const vals: number[] = [];
  items.forEach((i) => {
    const v = a[i.id] as number | undefined;
    if (v === undefined || v === MISSING) return;
    const max = i.scale || 7;
    const corrected = i.reverse ? max + 1 - v : v;
    vals.push((corrected - 1) / (max - 1));
  });
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

// Kleiner deterministischer Zufallsgenerator, damit der Test reproduzierbar ist.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("likertScore", () => {
  it("rechnet wie die bisherige Fassung", () => {
    const r = rng(7);
    for (let n = 0; n < 2000; n++) {
      const a: Record<string, number> = {};
      ACTIVE.forEach((i) => {
        const x = r();
        if (x < 0.1) return;                       // nicht beantwortet
        a[i.id] = x < 0.2 ? MISSING : 1 + Math.floor(r() * 7);
      });
      CONSTRUCTS.forEach((c) => expect(likertScore(c.key, a)).toBe(likertScoreAlt(c.key, a)));
    }
  });

  it("wertet 'weiss nicht' nie als Null", () => {
    expect(likertScore("FTC", { "FTC-1": MISSING, "FTC-2": MISSING, "FTC-5": MISSING })).toBeNull();
  });
});

describe("quadrantKey", () => {
  it("ordnet gleiche Antworten unabhaengig von der Reihenfolge gleich ein", () => {
    const base = { "CTO-1": 6, "CTO-4": 6 };
    const a = scoreRespondent({ ...base, "FTC-1": 4, "FTC-2": 6, "FTC-5": 2 });
    const b = scoreRespondent({ ...base, "FTC-1": 2, "FTC-2": 4, "FTC-5": 6 });
    expect(a.quad).toBe("settled");
    expect(b.quad).toBe("settled");
  });

  it("braucht beide Achsen", () => {
    expect(quadrantKey(null, 0.8)).toBeNull();
    expect(quadrantKey(0.9, 0.9)).toBe("sovereign");
    expect(quadrantKey(0.9, 0.1)).toBe("exit");
    expect(quadrantKey(0.1, 0.9)).toBe("settled");
    expect(quadrantKey(0.5, 0.5)).toBe("exposed");
  });
});

describe("scoreRespondent", () => {
  it("liefert Faehigkeiten erst ab drei gueltigen Antworten", () => {
    const a: Record<string, number> = {};
    CAP_ITEMS.filter((i) => i.publicBlock === "SW").slice(0, 2).forEach((i) => { a[i.id] = 5; });
    expect(scoreRespondent(a).cap.SW).toBeNull();
    CAP_ITEMS.filter((i) => i.publicBlock === "SW").forEach((i) => { a[i.id] = 5; });
    expect(scoreRespondent(a).cap.SW).toBe(5);
  });
});

describe("transparencyScore", () => {
  it("zaehlt den Anteil ohne 'Weiss nicht' unter den beantworteten Fragen", () => {
    expect(transparencyScore({})).toBeNull();
    expect(transparencyScore({ "CAP-SW-1": 5, "CAP-SW-2": MISSING, "CAP-SW-3": 3, "CAP-SW-4": MISSING })).toBe(0.5);
    expect(transparencyScore({ "CAP-SW-1": MISSING })).toBe(0);
    // Mehrfachauswahl zaehlt als beantwortet, unbekannte Kennungen gar nicht
    const multi = ACTIVE.find((i) => i.type === "multi");
    if (multi) expect(transparencyScore({ [multi.id]: [1, 2], "XYZ-9": MISSING })).toBe(1);
  });
});

