// Ergebnis-Codes fuer bereits abgeschlossene Teilnahmen, z. B. aus begleiteten
// Teams-Sessions, deren Ergebnis im Browser einer anderen Person liegt.
//
// Aufruf (im Ordner v2):
//   npx vite-node tools/result_codes.ts --in C:/Users/ABohrer/Vergleichswerte/export.json
//
// Eingabe: derselbe Export wie fuer tools/build_benchmark.ts (Liste von Zeilen mit
// response_id, created_at, funktion, groesse, branche, hauptsitz, antworten) oder ganze
// Tabellenzeilen {response_id, payload}, oder eine einzelne Datei {intake, answers}
// wie ~/Vergleichswerte/simulation.json.
//
// Ausgabe nur in der Konsole, es wird nichts geschrieben. Die Exportdatei danach
// loeschen. Den Code nur der Person geben, deren Teilnahme es ist.
import fs from "node:fs";
import path from "node:path";
import { scoreRespondent, type Answers } from "../src/data/scoring";
import { keyFromLabel, LABEL_LISTS } from "../src/data/benchmarkGroups";
import { encodeResult, type CodeIntake } from "../src/data/resultCode";
import { FUNCTION_OTHER } from "../src/data/surveyUi";
import { MISSING } from "../src/data/instrument";

function fail(msg: string): never {
  console.error("ABBRUCH: " + msg);
  process.exit(1);
}
const i = process.argv.indexOf("--in");
const inPath = i >= 0 ? process.argv[i + 1] : undefined;
if (!inPath) fail("--in <export.json> fehlt.");

// Rohdaten gehoeren nie ins Repository.
const REPO = fs.realpathSync.native(path.resolve(__dirname, ".."));
const rel = path.relative(REPO.toLowerCase(), fs.realpathSync.native(path.resolve(inPath)).toLowerCase());
if (!(rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel))) {
  fail(`Die Exportdatei liegt im Repository (${inPath}). Bitte ausserhalb von v2/ ablegen.`);
}

const maybeJson = (v: unknown) => (typeof v === "string" && /^\s*[[{]/.test(v) ? JSON.parse(v) : v);

function answersOf(raw: Record<string, unknown>): Answers {
  const a: Answers = {};
  Object.entries(raw || {}).forEach(([id, v]) => {
    if (typeof v === "number" || (Array.isArray(v) && v.every((x) => typeof x === "number"))) a[id] = v as number | number[];
  });
  return a;
}

function intakeOf(labels: { funktion?: string | null; groesse?: string | null; branche?: string | null; hauptsitz?: string | null }): CodeIntake {
  const k = (list: keyof typeof LABEL_LISTS, label?: string | null) => keyFromLabel(LABEL_LISTS[list], label) ?? "";
  const fn = k("fn", labels.funktion);
  return {
    size: k("size", labels.groesse), industry: k("industry", labels.branche), hq: k("hq", labels.hauptsitz),
    fnKey: fn || (labels.funktion && labels.funktion.trim() ? FUNCTION_OTHER : ""),
  };
}

const raw = maybeJson(fs.readFileSync(inPath, "utf8").replace(/^\uFEFF/, ""));
const out: { wann: string; kennung: string; code: string }[] = [];

if (!Array.isArray(raw) && raw?.answers) {
  // Einzelne Datei wie simulation.json: Angaben schon als Schluessel.
  out.push({ wann: raw.label || "", kennung: "", code: encodeResult(scoreRespondent(answersOf(raw.answers)), raw.intake || {}) });
} else if (Array.isArray(raw)) {
  for (const r of raw) {
    let row = r;
    // Wie in build_benchmark.ts: nur Exporte mit der aktuellen Abfrage ("Weiss nicht" als 99).
    if (!r.payload && Number(r.export_format) !== 2) {
      fail("Export ohne export_format = 2. Bitte die aktuelle Abfrage aus tools/build_benchmark.ts verwenden.");
    }
    if (r.payload) {
      const p = maybeJson(r.payload);
      const ant: Record<string, unknown> = {};
      // "Weiss nicht" als MISSING (99), wie im Browser.
      (p.antworten || []).forEach((a: { id: string; antwort: unknown; status?: string }) => {
        ant[a.id] = a.status === "weiss nicht" ? MISSING : a.antwort;
      });
      row = {
        response_id: r.response_id, created_at: r.created_at,
        funktion: p.intake?.funktion, groesse: p.intake?.mitarbeiterzahl, branche: p.intake?.branche, hauptsitz: p.intake?.hauptsitz,
        antworten: ant,
      };
    }
    const code = encodeResult(scoreRespondent(answersOf(maybeJson(row.antworten) as Record<string, unknown>)), intakeOf(row));
    out.push({ wann: String(row.created_at ?? "").slice(0, 16).replace("T", " "), kennung: row.response_id ?? "", code });
  }
} else {
  fail("Unbekanntes Format: erwartet eine Liste von Zeilen oder {intake, answers}.");
}

out.forEach((o) => console.log([o.wann, o.kennung, o.code].filter(Boolean).join("   ")));
