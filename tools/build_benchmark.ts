// Rechnet aus einem Supabase-Export die oeffentlichen Vergleichswerte.
//
// Aufruf (im Ordner v2):
//   npx vite-node tools/build_benchmark.ts --in <export.json> --state <zustand.json> --asof JJJJ-MM-TT
//     [--since JJJJ-MM-TT] [--exclude <ids.json>] [--dry-run]
//
//   --state   private Zustandsdatei mit den exakten Zahlen des letzten Stands
//             (Regel 6). Wird gelesen und nach dem Schreiben aktualisiert. Liegt
//             wie der Export AUSSERHALB von v2/ und wird nie veroeffentlicht.
//   --since   nur Antworten ab diesem Tag (created_at), z. B. ab dem Tag, an dem
//             der Hinweis zur Veroeffentlichung in der Einwilligung steht.
//
// Export im Supabase-SQL-Editor (ohne Anbieter und ohne Fragetexte). Bei
// "andere Funktion" steht der Freitext der Funktion im Export; er gelangt nicht
// in benchmark.json, die Exportdatei nach dem Lauf trotzdem loeschen. Ergebnis
// als JSON herunterladen und AUSSERHALB von v2/ ablegen:
//
//   select 2 as export_format, response_id, created_at,
//     payload->>'instrument' instrument,
//     payload->'intake'->>'funktion' funktion, payload->'intake'->>'mitarbeiterzahl' groesse,
//     payload->'intake'->>'branche' branche, payload->'intake'->>'hauptsitz' hauptsitz,
//     (select jsonb_object_agg(a->>'id',
//        case when a->>'status' = 'weiss nicht' then to_jsonb(99) else a->'antwort' end)
//        from jsonb_array_elements(payload->'antworten') a) antworten
//   from responses order by created_at;
//
// Schreibt src/data/benchmark.json. Die Schutzregeln stehen in
// src/data/benchmarkCore.ts und lassen sich hier nicht abschalten.
import fs from "node:fs";
import path from "node:path";
import { scoreRespondent, type Answers } from "../src/data/scoring";
import { groupsOf, keyFromLabel, LABEL_LISTS, type IntakeKeys } from "../src/data/benchmarkGroups";
import {
  buildBenchmark, emptyBenchmark, INSTRUMENT_ID, type BenchmarkFile, type BenchmarkState, type ScoredRow,
} from "../src/data/benchmarkCore";
import { FUNCTION_OTHER } from "../src/data/surveyUi";
import { MISSING } from "../src/data/instrument";

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "src", "data", "benchmark.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);
function fail(msg: string): never {
  console.error("ABBRUCH: " + msg);
  process.exit(1);
}

const inPath = arg("--in");
const asOf = arg("--asof");
const since = arg("--since");
const statePath = arg("--state");
const exclPath = arg("--exclude");
const dryRun = has("--dry-run");
if (!inPath) fail("--in <export.json> fehlt.");
if (!statePath) fail("--state <zustand.json> fehlt (private Zustandsdatei ausserhalb von v2/; beim ersten Lauf wird sie angelegt).");
if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) fail("--asof JJJJ-MM-TT fehlt oder ist ungueltig.");
if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) fail("--since JJJJ-MM-TT ist ungueltig.");

// Rohdaten und Zustand gehoeren nie ins Repository. Echte Pfade vergleichen
// (Kurznamen, Gross/Klein, Verknuepfungen aufgeloest); bei noch nicht
// vorhandenen Dateien den echten Pfad des Ordners nehmen.
const real = (p: string): string => {
  const abs = path.resolve(p);
  try { return fs.realpathSync.native(abs); } catch { /* Datei existiert noch nicht */ }
  try { return path.join(fs.realpathSync.native(path.dirname(abs)), path.basename(abs)); } catch { return abs; }
};
const REPO_REAL = real(REPO);
const inside = (p: string) => {
  const rel = path.relative(REPO_REAL.toLowerCase(), real(p).toLowerCase());
  return !(rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel));
};
if (inside(inPath)) fail(`Die Exportdatei liegt im Repository (${inPath}). Bitte ausserhalb von v2/ ablegen.`);
if (inside(statePath)) fail("Die Zustandsdatei liegt im Repository. Bitte ausserhalb von v2/ ablegen.");
if (exclPath && inside(exclPath)) fail("Die Ausschlussliste liegt im Repository. Bitte ausserhalb von v2/ ablegen.");

// jsonb kommt je nach Exportweg als Objekt oder als Text an.
const maybeJson = (v: unknown) =>
  typeof v === "string" && /^\s*[[{]/.test(v) ? JSON.parse(v) : v;

type Row = {
  response_id: string; instrument: string; created_at: string | null;
  funktion: string | null; groesse: string | null; branche: string | null; hauptsitz: string | null;
  antworten: Record<string, unknown>;
};

function normaliseRow(r: any): Row {
  // Auch ganze Tabellenzeilen {response_id, payload} annehmen.
  if (r.payload) {
    const p = maybeJson(r.payload);
    const ant: Record<string, unknown> = {};
    // "Weiss nicht" steht im Datensatz als antwort null mit status; fuer die
    // Rechnung wie im Browser als MISSING (99), sonst fehlt es der Transparenz.
    (p.antworten || []).forEach((a: any) => { ant[a.id] = a.status === "weiss nicht" ? MISSING : a.antwort; });
    return {
      response_id: r.response_id, instrument: p.instrument, created_at: r.created_at ?? null,
      funktion: p.intake?.funktion ?? null, groesse: p.intake?.mitarbeiterzahl ?? null,
      branche: p.intake?.branche ?? null, hauptsitz: p.intake?.hauptsitz ?? null,
      antworten: ant,
    };
  }
  // Die Abfrage vor dem 06.10.2026 lieferte "Weiss nicht" als null; damit waere die
  // Transparenz fuer alle 100 %. Deshalb nur Exporte mit der aktuellen Abfrage.
  if (Number(r.export_format) !== 2) {
    fail("Export ohne export_format = 2. Bitte die aktuelle Abfrage aus dem Kopf dieses Skripts verwenden (\"Weiss nicht\" als 99).");
  }
  return { ...r, antworten: maybeJson(r.antworten) || {} };
}

const raw = JSON.parse(fs.readFileSync(inPath, "utf8").replace(/^﻿/, ""));
if (!Array.isArray(raw)) fail("Die Exportdatei muss eine JSON-Liste von Zeilen sein.");
const rows: Row[] = raw.map(normaliseRow);

const excluded = new Set<string>(
  exclPath ? (JSON.parse(fs.readFileSync(exclPath, "utf8")) as any[]).map((x) => (typeof x === "string" ? x : x.response_id)) : [],
);

const lines: string[] = [];
const seen = new Set<string>();
const vectors = new Set<string>();
const unknown: string[] = [];
const freeTexts = new Set<string>();
const scored: ScoredRow[] = [];
let dropInstrument = 0, dropExcluded = 0, dropDuplicate = 0, dropSameVector = 0, dropSince = 0;

for (const r of rows) {
  if (r.instrument !== INSTRUMENT_ID) { dropInstrument++; continue; }
  if (since && (!r.created_at || String(r.created_at).slice(0, 10) < since)) { dropSince++; continue; }
  if (excluded.has(r.response_id)) { dropExcluded++; continue; }
  if (seen.has(r.response_id)) { dropDuplicate++; continue; }
  seen.add(r.response_id);

  const keys: IntakeKeys = { size: "", industry: "", hq: "", fn: "" };
  const map = (field: keyof IntakeKeys, label: string | null) => {
    if (!label || !label.trim()) return;
    const k = keyFromLabel(LABEL_LISTS[field], label);
    if (k) keys[field] = k;
    else if (field === "fn") { keys.fn = FUNCTION_OTHER; freeTexts.add(label); }
    else unknown.push(`${field}: "${label}"`);
  };
  map("size", r.groesse); map("industry", r.branche); map("hq", r.hauptsitz); map("fn", r.funktion);

  const answers: Answers = {};
  Object.entries(r.antworten).forEach(([id, v]) => {
    if (typeof v === "number" || Array.isArray(v)) answers[id] = v as number | number[];
  });

  // Mehrfach abgeschickte identische Durchgaenge nur einmal zaehlen.
  const vec = JSON.stringify([keys, Object.keys(answers).sort().map((k) => [k, answers[k]])]);
  if (vectors.has(vec)) { dropSameVector++; continue; }
  vectors.add(vec);

  scored.push({ groups: groupsOf(keys), scores: scoreRespondent(answers) });
}

if (unknown.length) fail("Unbekannte Bezeichnungen, bitte surveyUi.ts pruefen:\n  " + unknown.join("\n  "));

lines.push(`Zeilen im Export: ${rows.length}`);
lines.push(`  anderes Instrument: ${dropInstrument}, vor --since: ${dropSince}, ausgeschlossen: ${dropExcluded}, doppelte ID: ${dropDuplicate}, identischer Durchgang: ${dropSameVector}`);

let prev: BenchmarkFile | null = null;
try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { prev = emptyBenchmark(); }
let prevState: BenchmarkState | null = null;
if (fs.existsSync(statePath)) prevState = JSON.parse(fs.readFileSync(statePath, "utf8"));
// Stand und Zustand aus der Fassung ohne Gruppen (schema 2, 05.10.2026) passen
// nicht zu dieser Fassung mit Gruppen. Dann wie beim ersten Lauf beginnen.
if (prev && (prev as any).schema !== 1) prev = emptyBenchmark();
if (prevState && !(prevState as any).groups) prevState = null;

let result;
try {
  result = buildBenchmark(scored, asOf, prev, prevState);
} catch (e: any) {
  fail(e.message);
}
lines.push(...result.report);

// Selbstpruefung: nichts Einzelnes darf im oeffentlichen Ergebnis stehen.
const out = JSON.stringify(result.file, null, 2) + "\n";
const leaks: string[] = [];
seen.forEach((id) => { if (id && out.includes(id)) leaks.push("response_id " + id); });
freeTexts.forEach((s) => { if (s.length > 2 && out.includes(s)) leaks.push("Freitext"); });
["\"mean\"", "\"min\"", "\"max\"", "\"p10\"", "\"p90\""].forEach((k) => { if (out.includes(k)) leaks.push(k); });
if (leaks.length) fail("Selbstpruefung: " + leaks.join(", "));

console.log(lines.join("\n"));
if (dryRun) {
  console.log("\n--dry-run: nichts geschrieben. Ergebnis waere:\n" + out);
} else {
  fs.writeFileSync(OUT, out, "utf8");
  if (result.state) fs.writeFileSync(statePath, JSON.stringify(result.state, null, 2) + "\n", "utf8");
  console.log(`\nGeschrieben: ${path.relative(REPO, OUT)} (Stand ${asOf}), Zustand: ${statePath}.`);
  console.log("Die Exportdatei jetzt loeschen: sie enthaelt Rohdaten.");
}
