// Vergleichsgruppen fuer Ergebnisseite und Dashboard.
//
// Je Filter genau ZWEI grobe Gruppen (Entscheid 05.10.2026), damit sich die
// Gruppen schnell fuellen und keine kleinen Zellen entstehen. Gefiltert wird
// immer nur nach einem Merkmal, nie kombiniert, und nie nach Anbieter.
// "Andere Funktion" (Freitext) und "keine Angabe" zaehlen nur in "Alle".
import { FIRM_SIZE, INDUSTRY, HQ, FUNCTIONS } from "./surveyUi";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

export type DimKey = "branche" | "groesse" | "funktion" | "sitz";

export interface GroupDef { key: string; label: T; members: string[] }
export interface DimDef { key: DimKey; label: T; groups: [GroupDef, GroupDef] }

// Grenzen hier verschieben, nicht im Code verstreut. Jeder Schluessel aus
// surveyUi.ts gehoert zu genau einer Gruppe (geprueft in benchmarkGroups.test.ts).
export const DIMENSIONS: DimDef[] = [
  {
    key: "branche",
    label: t("Industry", "Branche"),
    groups: [
      { key: "reguliert", label: t("Heavily regulated", "Stark reguliert"), members: ["finance", "public", "health", "energy"] },
      { key: "weitere", label: t("Other industries", "Weitere Branchen"), members: ["manufacturing", "retail", "tmt", "logistics", "services"] },
    ],
  },
  {
    key: "groesse",
    label: t("Size", "Grösse"),
    groups: [
      { key: "unter1000", label: t("Under 1,000 employees", "Unter 1000 Mitarbeitende"), members: ["lt250", "250_999"] },
      { key: "ab1000", label: t("1,000 employees or more", "Ab 1000 Mitarbeitende"), members: ["1k_5k", "5k_25k", "gte25k"] },
    ],
  },
  {
    key: "funktion",
    label: t("Function", "Funktion"),
    groups: [
      { key: "anwendungen", label: t("Business applications", "Geschäftsanwendungen"), members: ["erp", "crm", "hr", "shop", "fraud", "itsm"] },
      { key: "infrastruktur", label: t("Infrastructure, data and AI", "Infrastruktur, Daten und KI"), members: ["compute", "dwh", "files", "backup", "iam", "ai"] },
    ],
  },
  {
    key: "sitz",
    label: t("Headquarters", "Hauptsitz"),
    groups: [
      { key: "schweiz", label: t("Switzerland", "Schweiz"), members: ["ch"] },
      { key: "ausland", label: t("Outside Switzerland", "Ausserhalb der Schweiz"), members: ["eu", "uk", "na", "other"] },
    ],
  },
];

export const groupId = (dim: DimKey, group: string) => `${dim}:${group}`;
export const ALL = "all";

// Schluessel der Angaben am Anfang des Fragebogens (leer = keine Angabe).
export type IntakeKeys = { size: string; industry: string; hq: string; fn: string };

const DIM_SOURCE: Record<DimKey, keyof IntakeKeys> = {
  branche: "industry", groesse: "size", funktion: "fn", sitz: "hq",
};

// Gruppen einer Person, je Merkmal hoechstens eine.
export function groupsOf(k: IntakeKeys): Partial<Record<DimKey, string>> {
  const out: Partial<Record<DimKey, string>> = {};
  DIMENSIONS.forEach((d) => {
    const v = k[DIM_SOURCE[d.key]];
    const g = d.groups.find((gr) => gr.members.includes(v));
    if (g) out[d.key] = g.key;
  });
  return out;
}

export function groupDef(id: string): { dim: DimDef; group: GroupDef } | null {
  const [dk, gk] = id.split(":");
  const dim = DIMENSIONS.find((d) => d.key === dk);
  const group = dim?.groups.find((g) => g.key === gk);
  return dim && group ? { dim, group } : null;
}

// Gespeichert werden im Datensatz die BEZEICHNUNGEN in der Sprache der Befragung,
// nicht die Schluessel. Fuer die Auswertung zurueck auf den Schluessel abbilden,
// in beiden Sprachen und unempfindlich gegen Leerraum und Strichvarianten.
const norm = (s: string) =>
  s.normalize("NFC").replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();

export function keyFromLabel(list: { key: string; label: T }[], label: string | null | undefined): string | null {
  if (!label || !label.trim()) return null;
  const n = norm(label);
  const hit = list.find((x) => norm(x.label.en) === n || norm(x.label.de) === n);
  return hit ? hit.key : null;
}

export const LABEL_LISTS = { size: FIRM_SIZE, industry: INDUSTRY, hq: HQ, fn: FUNCTIONS };
