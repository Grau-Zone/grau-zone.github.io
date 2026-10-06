import { describe, it, expect } from "vitest";
import { encodeResult, decodeResult, normaliseCode, CODE_KEYS } from "./resultCode";
import { scoreRespondent, ACTIVE, type Answers } from "./scoring";
import { CAP_ITEMS } from "./capacityItems";
import { MISSING } from "./instrument";
import { FIRM_SIZE, INDUSTRY, HQ, FUNCTIONS, FUNCTION_OTHER } from "./surveyUi";
import { groupsOf } from "./benchmarkGroups";
import { positionOf, CTX_STEP } from "./benchmarkCore";
import { fmtPct } from "./benchmark";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const pickOr = (r: () => number, list: readonly string[]) => (r() < 0.15 ? "" : list[Math.floor(r() * list.length)]);

function randomRespondent(r: () => number) {
  const a: Answers = {};
  [...CAP_ITEMS, ...ACTIVE].forEach((i) => {
    const x = r();
    if (x < 0.1) return;                         // nicht beantwortet
    a[i.id] = x < 0.2 ? MISSING : 1 + Math.floor(r() * 7);
  });
  const intake = {
    size: pickOr(r, CODE_KEYS.size), industry: pickOr(r, CODE_KEYS.industry),
    hq: pickOr(r, CODE_KEYS.hq), fnKey: pickOr(r, CODE_KEYS.fn),
  };
  return { answers: a, intake };
}

describe("Ergebnis-Code", () => {
  it("gibt nach dem Dekodieren genau dieselben Werte, Quadranten und Gruppen", () => {
    const r = rng(11);
    for (let n = 0; n < 3000; n++) {
      const { answers, intake } = randomRespondent(r);
      const s = scoreRespondent(answers);
      const code = encodeResult(s, intake);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
      const d = decodeResult(code)!;
      expect(d).not.toBeNull();
      (Object.keys(s.cap) as (keyof typeof s.cap)[]).forEach((k) => {
        if (s.cap[k] === null) expect(d.scores.cap[k]).toBeNull();
        else expect(d.scores.cap[k]!).toBeCloseTo(s.cap[k]!, 12);
      });
      (["ftc", "cto", "cont"] as const).forEach((k) => {
        if (s[k] === null) expect(d.scores[k]).toBeNull();
        else expect(d.scores[k]!).toBeCloseTo(s[k]!, 12);
      });
      expect(d.scores.quad).toBe(s.quad);
      // Transparenz in ganzen Prozent: gleiche Anzeige, gleiche Lage in Fuenferschritten.
      if (s.tra === null) expect(d.scores.tra).toBeNull();
      else {
        expect(fmtPct(d.scores.tra!)).toBe(fmtPct(s.tra));
        const qt = { p25: 0.5, p50: 0.7, p75: 0.85 };
        expect(positionOf(d.scores.tra, qt, CTX_STEP)).toBe(positionOf(s.tra, qt, CTX_STEP));
      }
      expect(d.intake).toEqual(intake);
      const g = (i: typeof intake) => groupsOf({ size: i.size, industry: i.industry, hq: i.hq, fn: i.fnKey });
      expect(g(d.intake)).toEqual(g(intake));
      // Lage gegenueber Quartilen im Raster der Seite bleibt gleich.
      const q = { p25: 3.5, p50: 4, p75: 4.5 };
      (Object.keys(s.cap) as (keyof typeof s.cap)[]).forEach((k) => {
        if (s.cap[k] !== null) expect(positionOf(d.scores.cap[k]!, q, 0.5)).toBe(positionOf(s.cap[k]!, q, 0.5));
      });
    }
  });

  it("kodiert auch einen Durchgang ganz ohne Werte und Angaben", () => {
    const s = scoreRespondent({});
    const d = decodeResult(encodeResult(s, {}))!;
    expect(d.scores).toEqual(s);
    expect(d.intake).toEqual({ size: "", industry: "", hq: "", fnKey: "" });
  });

  it("erkennt jeden einzelnen Tippfehler", () => {
    const r = rng(5);
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    for (let n = 0; n < 40; n++) {
      const { answers, intake } = randomRespondent(r);
      const plain = normaliseCode(encodeResult(scoreRespondent(answers), intake));
      for (let i = 0; i < plain.length; i++) {
        for (const ch of alphabet) {
          if (ch === plain[i]) continue;
          expect(decodeResult(plain.slice(0, i) + ch + plain.slice(i + 1))).toBeNull();
        }
      }
    }
  });

  it("verzeiht Schreibweise, aber keine falsche Laenge oder fremde Zeichen", () => {
    const code = encodeResult(scoreRespondent({}), { size: "gte25k" });
    const plain = normaliseCode(code);
    expect(decodeResult(plain.toLowerCase())).not.toBeNull();
    expect(decodeResult(" " + plain.match(/.{1,4}/g)!.join(" ") + " ")).not.toBeNull();
    expect(decodeResult(plain.replace(/0/g, "O").replace(/1/g, "I"))).not.toBeNull();
    expect(decodeResult(plain.slice(1))).toBeNull();
    expect(decodeResult(plain + "0")).toBeNull();
    expect(decodeResult(plain.slice(0, 15) + "U")).toBeNull();
    expect(decodeResult("")).toBeNull();
  });

  // Ausgegebene Codes muessen ueber alle Erhebungswellen gueltig bleiben. Schlaegt dieser
  // Test fehl, hat sich das Format geaendert: Tabellen nur hinten ergaenzen, sonst
  // CODE_VERSION erhoehen. Synthetische Antworten, keine echte Teilnahme.
  it("liest frueher ausgegebene Codes unveraendert", () => {
    expect(CODE_KEYS.size.slice(0, 5)).toEqual(["lt250", "250_999", "1k_5k", "5k_25k", "gte25k"]);
    expect(CODE_KEYS.industry.slice(0, 9)).toEqual(["manufacturing", "finance", "retail", "tmt", "energy", "health", "public", "logistics", "services"]);
    expect(CODE_KEYS.hq.slice(0, 5)).toEqual(["eu", "ch", "uk", "na", "other"]);
    expect(CODE_KEYS.fn.slice(0, 13)).toEqual(["erp", "crm", "hr", "iam", "dwh", "compute", "files", "backup", "itsm", "shop", "fraud", "ai", "other"]);
    const a: Answers = {
      "CAP-SW-1": 7, "CAP-SW-2": 7, "CAP-SW-3": 7, "CAP-SW-4": 7, "CAP-IN-1": 1, "CAP-IN-2": 1, "CAP-IN-3": 1,
      "CAP-MS-1": 2, "CAP-MS-2": 3, "CAP-MS-3": 4, "CAP-MS-4": MISSING, "CAP-NE-1": 5, "CAP-NE-2": 6, "CAP-NE-3": 6, "CAP-NE-4": 6,
      "FTC-1": 7, "FTC-2": 6, "FTC-5": MISSING, "CTO-1": 2, "CTO-4": 3, "CONT-4": 5,
    };
    const intake = { size: "gte25k", industry: "services", hq: "other", fnKey: "ai" };
    // Version 2 (seit 06.10.2026, mit Transparenz 19 von 21 = 90 %)
    expect(encodeResult(scoreRespondent(a), intake)).toBe("A801-GWTA-5MY2-SQ5M-006D");
    expect(decodeResult("A801-GWTA-5MY2-SQ5M-006D")!.scores.tra).toBe(0.9);
    // Version 1 (bis 06.10.2026 ausgegeben, ohne Transparenz) bleibt lesbar
    const d = decodeResult("6801-GWTA-5MY2-SQ4X")!;
    expect(d.scores.tra).toBeNull();
    expect(d.scores.cap).toEqual({ SW: 7, IN: 1, MS: 3, NE: 5.75 });
    expect(d.scores.ftc!).toBeCloseTo(11 / 12, 12);
    expect(d.scores.cto).toBe(0.25);
    expect(d.scores.cont!).toBeCloseTo(2 / 3, 12);
    expect(d.scores.quad).toBe("exit");
    expect(d.intake).toEqual(intake);
  });

  it("kennt jeden Schluessel der Angaben am Anfang des Fragebogens", () => {
    FIRM_SIZE.forEach((x) => expect(CODE_KEYS.size).toContain(x.key));
    INDUSTRY.forEach((x) => expect(CODE_KEYS.industry).toContain(x.key));
    HQ.forEach((x) => expect(CODE_KEYS.hq).toContain(x.key));
    FUNCTIONS.forEach((x) => expect(CODE_KEYS.fn).toContain(x.key));
    expect(CODE_KEYS.fn).toContain(FUNCTION_OTHER);
    // Platz im Code: Index 1..n muss in die Bitbreite passen.
    expect(CODE_KEYS.size.length).toBeLessThan(8);
    expect(CODE_KEYS.industry.length).toBeLessThan(16);
    expect(CODE_KEYS.hq.length).toBeLessThan(8);
    expect(CODE_KEYS.fn.length).toBeLessThan(16);
  });
});
