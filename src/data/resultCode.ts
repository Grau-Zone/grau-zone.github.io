// Ergebnis-Code: die eigenen Werte in 16 Zeichen, z. B. "7K3M-Q2XA-9PZD-4TRB".
//
// Damit sehen Teilnehmende ihre Werte auf /dashboard auch auf einem anderen Geraet,
// ohne dass die Seite die Datenbank lesen muss: Der Code ENTHAELT die Werte, er
// verweist nicht auf einen Datensatz. Er wird im Browser berechnet und ausgewertet,
// nie uebertragen. Nicht verschluesselt, nur kodiert: Wer den Code kennt, sieht die
// Werte. Das steht so auch im Datenschutztext (Impressum.tsx).
//
// Inhalt, 72 Bit, hoechstwertiges Bit zuerst:
//   Version              3 Bit
//   SW, IN, MS, NE       je 7 Bit   Wert 1..7 im Raster 1/12, 127 = kein Wert
//   FTC, CTO, CONT       je 9 Bit   Wert 0..1 im Raster 1/360, 511 = kein Wert
//   Groesse, Branche,    3/4/3/4 Bit  Index in den Tabellen unten, 0 = keine Angabe
//   Hauptsitz, Funktion
// dazu 8 Bit CRC-8 gegen Tippfehler, zusammen 80 Bit = 16 Zeichen Crockford-Base32.
//
// Die Raster sind exakt: Faehigkeiten sind Mittel aus 3 oder 4 Werten auf 1..7
// (Nenner 3 oder 4, also Vielfache von 1/12), Konstrukte Mittel aus bis zu 5 Werten
// auf (v-1)/6 (Nenner bis 30, alle Teiler von 360). Ein dekodierter Code ergibt
// deshalb dieselben Werte, Quadranten und Lagen wie die Antworten selbst.
import { quadrantKey, type RespondentScores } from "./scoring";
import { CAPACITIES, type CapacityKey } from "./capacityItems";

export const CODE_VERSION = 1;

// Feste Reihenfolge, nur hinten ergaenzen (auch hinter "other"): Der Index steht im
// Code. Jeder Schluessel aus surveyUi.ts muss hier vorkommen (geprueft in
// resultCode.test.ts, dort ist auch das Format mit einem festen Code abgesichert).
export const CODE_KEYS = {
  size: ["lt250", "250_999", "1k_5k", "5k_25k", "gte25k"],
  industry: ["manufacturing", "finance", "retail", "tmt", "energy", "health", "public", "logistics", "services"],
  hq: ["eu", "ch", "uk", "na", "other"],
  fn: ["erp", "crm", "hr", "iam", "dwh", "compute", "files", "backup", "itsm", "shop", "fraud", "ai", "other"],
} as const;
const INTAKE_BITS = { size: 3, industry: 4, hq: 3, fn: 4 } as const;
type IntakeField = keyof typeof CODE_KEYS;
const INTAKE_FIELDS: IntakeField[] = ["size", "industry", "hq", "fn"];

// Feste Reihenfolge der Faehigkeiten im Code, unabhaengig von der Anzeige.
const CAP_ORDER: CapacityKey[] = ["SW", "IN", "MS", "NE"];
const CTX_ORDER = ["ftc", "cto", "cont"] as const;

const CAP_GRID = 12, CAP_NULL = 127, CAP_MAX = 6 * CAP_GRID;
const CTX_GRID = 360, CTX_NULL = 511;

// Crockford-Base32: ohne I, L, O, U, damit sich der Code gut abschreiben und vorlesen laesst.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type CodeIntake = { size: string; industry: string; hq: string; fnKey: string };
export type DecodedResult = { scores: RespondentScores; intake: CodeIntake };

function crc8(bytes: number[]): number {
  let c = 0;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  }
  return c;
}

const pushBits = (bits: number[], value: number, n: number) => {
  for (let i = n - 1; i >= 0; i--) bits.push((value >> i) & 1);
};
const readBits = (bits: number[], pos: number, n: number) => {
  let v = 0;
  for (let i = 0; i < n; i++) v = (v << 1) | bits[pos + i];
  return v;
};
const toBytes = (bits: number[]) => {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(readBits(bits, i, 8));
  return out;
};

export function encodeResult(scores: RespondentScores, intake: Partial<CodeIntake>): string {
  const bits: number[] = [];
  pushBits(bits, CODE_VERSION, 3);
  CAP_ORDER.forEach((k) => {
    const v = scores.cap[k];
    const q = v === null || v === undefined || !Number.isFinite(v) ? CAP_NULL : Math.round((v - 1) * CAP_GRID);
    pushBits(bits, q === CAP_NULL ? q : Math.min(CAP_MAX, Math.max(0, q)), 7);
  });
  CTX_ORDER.forEach((k) => {
    const v = scores[k];
    const q = v === null || v === undefined || !Number.isFinite(v) ? CTX_NULL : Math.round(v * CTX_GRID);
    pushBits(bits, q === CTX_NULL ? q : Math.min(CTX_GRID, Math.max(0, q)), 9);
  });
  const given: Record<IntakeField, string> = {
    size: intake.size || "", industry: intake.industry || "", hq: intake.hq || "", fn: intake.fnKey || "",
  };
  INTAKE_FIELDS.forEach((f) => {
    const i = (CODE_KEYS[f] as readonly string[]).indexOf(given[f]);
    pushBits(bits, i + 1, INTAKE_BITS[f]);   // nicht gefunden: -1 + 1 = 0 = keine Angabe
  });
  pushBits(bits, crc8(toBytes(bits)), 8);
  let s = "";
  for (let i = 0; i < bits.length; i += 5) s += ALPHABET[readBits(bits, i, 5)];
  return formatCode(s);
}

// Eingabe bereinigen: Gross/Klein, Leerzeichen, Bindestriche egal; O/I/L als 0/1 lesen.
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[\s\-_.]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export const formatCode = (s: string) => normaliseCode(s).replace(/(.{4})(?=.)/g, "$1-");

// null bei allem, was kein gueltiger Code ist: falsche Laenge, unbekannte Zeichen,
// Pruefsumme falsch (Tippfehler), andere Version, Werte ausserhalb des Rasters.
export function decodeResult(input: string): DecodedResult | null {
  const s = normaliseCode(input || "");
  if (s.length !== 16) return null;
  const bits: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    pushBits(bits, v, 5);
  }
  const data = bits.slice(0, 72);
  if (crc8(toBytes(data)) !== readBits(bits, 72, 8)) return null;
  let pos = 0;
  const take = (n: number) => { const v = readBits(data, pos, n); pos += n; return v; };
  if (take(3) !== CODE_VERSION) return null;

  const cap = {} as Record<CapacityKey, number | null>;
  for (const k of CAP_ORDER) {
    const q = take(7);
    if (q !== CAP_NULL && q > CAP_MAX) return null;
    cap[k] = q === CAP_NULL ? null : 1 + q / CAP_GRID;
  }
  // Faehigkeiten, die es im Code nicht gibt, bleiben leer statt undefined.
  CAPACITIES.forEach((c) => { if (!(c.key in cap)) cap[c.key] = null; });
  const ctx = {} as Record<(typeof CTX_ORDER)[number], number | null>;
  for (const k of CTX_ORDER) {
    const q = take(9);
    if (q !== CTX_NULL && q > CTX_GRID) return null;
    ctx[k] = q === CTX_NULL ? null : q / CTX_GRID;
  }
  const keys = {} as Record<IntakeField, string>;
  for (const f of INTAKE_FIELDS) {
    const i = take(INTAKE_BITS[f]);
    if (i > CODE_KEYS[f].length) return null;
    keys[f] = i === 0 ? "" : CODE_KEYS[f][i - 1];
  }
  return {
    scores: { cap, ftc: ctx.ftc, cto: ctx.cto, cont: ctx.cont, quad: quadrantKey(ctx.ftc, ctx.cto) },
    intake: { size: keys.size, industry: keys.industry, hq: keys.hq, fnKey: keys.fn },
  };
}
