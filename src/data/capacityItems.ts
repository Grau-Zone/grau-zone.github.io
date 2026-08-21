// Oeffentliches Capacity-Modell des Self-Assessments.
//
// TRENNUNG ZUM FORSCHUNGSINSTRUMENT
// Diese sechzehn Items sind neu und gehoeren ausschliesslich dem oeffentlichen
// Modell. Sie sind KEINE umbenannten v13-Items. Die Konstrukte des v13-Instruments
// (C1, C2, C3, T2, T3, O1, O2, O3, ALT, ROC, FTC, CTO, CONT) bleiben in
// instrument.ts erhalten und werden weiter erhoben, fliessen aber nicht in die
// vier Capacity-Werte ein und werden nicht auf sie abgebildet.
//
// Nur Items aus dieser Datei tragen includeInPublicScore = true.
import type { Lang } from "./instrument";

export type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

export type CapacityKey = "SW" | "IN" | "MS" | "NE";

export interface Capacity {
  key: CapacityKey;
  label: T;          // deutsche Bezeichnung, verbindlich festgelegt
  term: string;      // englischer Fachbegriff, in beiden Sprachen identisch
  question: T;       // Leitfrage
  definition: T;     // genau eine Definition je Faehigkeit
  factors: T[];      // relevante Einflussfaktoren, ohne kausale Rollen
  color: string;
}

export const CAPACITIES: Capacity[] = [
  {
    key: "SW",
    label: t("Switching", "Wechselfähigkeit"),
    term: "Switching Capacity",
    question: t("Can we replace the provider?", "Können wir den Anbieter wechseln?"),
    definition: t(
      "The ability of an organisation to replace an existing provider with another provider within acceptable time, cost and risk.",
      "Fähigkeit einer Organisation, einen bestehenden Anbieter innerhalb vertretbarer Zeit, Kosten und Risiken durch einen anderen Anbieter zu ersetzen."
    ),
    factors: [
      t("Technical decoupling", "Technische Entkopplung"),
      t("Data portability", "Datenportabilität"),
      t("Contractual flexibility", "Vertragliche Flexibilität"),
      t("Availability of alternative providers", "Verfügbarkeit alternativer Anbieter"),
    ],
    color: "#6b9bd8",
  },
  {
    key: "IN",
    label: t("Internalization", "Internalisierungsfähigkeit"),
    term: "Internalization Capacity",
    question: t("Could we run it ourselves?", "Könnten wir die Leistung selbst erbringen?"),
    definition: t(
      "The ability of an organisation to provide an externally sourced digital service internally when required.",
      "Fähigkeit einer Organisation, eine extern bezogene digitale Leistung bei Bedarf intern bereitzustellen."
    ),
    factors: [
      t("Internal technical competencies", "Interne technische Kompetenzen"),
      t("Expert knowledge of the technology", "Expertenwissen zur Technologie"),
      t("Operating capacity", "Betriebskapazität"),
      t("Development capacity", "Entwicklungskapazität"),
    ],
    color: "#6cc2b5",
  },
  {
    key: "MS",
    label: t("Multi-Sourcing", "Multi-Sourcing-Fähigkeit"),
    term: "Multi-Sourcing Capacity",
    question: t("Can we use several providers?", "Können wir mehrere Anbieter nutzen?"),
    definition: t(
      "The ability of an organisation to distribute a digital service across several providers or to shift it between them.",
      "Fähigkeit einer Organisation, eine digitale Leistung auf mehrere Anbieter zu verteilen oder zwischen mehreren Anbietern zu verlagern."
    ),
    factors: [
      t("Contractual admissibility", "Vertragliche Zulässigkeit"),
      t("Interfaces and data formats", "Schnittstellen und Datenformate"),
      t("Coordination across providers", "Koordination über Anbieter hinweg"),
      t("Shiftability of workloads", "Verlagerbarkeit von Arbeitslasten"),
    ],
    color: "#d9a559",
  },
  {
    key: "NE",
    label: t("Negotiation", "Verhandlungsfähigkeit"),
    term: "Negotiation Capacity",
    question: t("Can we shape the terms?", "Können wir die Konditionen beeinflussen?"),
    definition: t(
      "The ability of an organisation to negotiate favourable contract and service terms with a provider.",
      "Fähigkeit einer Organisation, gegenüber einem Anbieter vorteilhafte Vertrags- und Leistungsbedingungen auszuhandeln."
    ),
    factors: [
      t("Adjustable contract terms", "Anpassbare Vertragsbedingungen"),
      t("Enforceable corrective measures", "Durchsetzbare Korrekturmassnahmen"),
      t("Binding change agreements", "Verbindliche Änderungsvereinbarungen"),
      t("Defence against unilateral changes", "Abwehr einseitiger Änderungen"),
    ],
    color: "#cf87a5",
  },
];

export interface CapacityItem {
  id: string;
  publicBlock: CapacityKey;
  text: T;
  scale: number;
  includeInPublicScore: true;
}

const item = (id: string, publicBlock: CapacityKey, en: string, de: string): CapacityItem => ({
  id, publicBlock, text: t(en, de), scale: 7, includeInPublicScore: true,
});

export const CAP_ITEMS: CapacityItem[] = [
  item("CAP-SW-1", "SW",
    "The technical components of this function could be reused with a different provider with limited adaptation.",
    "Die technischen Komponenten dieser Funktion könnten bei einem anderen Anbieter mit begrenzten Anpassungen weiterverwendet werden."),
  item("CAP-SW-2", "SW",
    "The data, configurations and documentation required for a provider change are available in transferable form.",
    "Die für einen Anbieterwechsel erforderlichen Daten, Konfigurationen und Dokumentationen stehen in übertragbarer Form zur Verfügung."),
  item("CAP-SW-3", "SW",
    "Core parts of this function can be operated without proprietary services of the current provider.",
    "Kernbestandteile dieser Funktion können ohne proprietäre Dienste des derzeitigen Anbieters betrieben werden."),
  item("CAP-SW-4", "SW",
    "We could move this function to a different provider within a period acceptable for business operations.",
    "Wir könnten diese Funktion innerhalb eines für den Geschäftsbetrieb vertretbaren Zeitraums zu einem anderen Anbieter verlagern."),

  item("CAP-IN-1", "IN",
    "Our organisation has the technical competencies to take over the essential operating tasks of this function internally.",
    "Unsere Organisation verfügt über die technischen Kompetenzen, um die wesentlichen Betriebsaufgaben dieser Funktion intern zu übernehmen."),
  item("CAP-IN-2", "IN",
    "Sufficient expert knowledge of the underlying technology is available within our organisation.",
    "Für die zugrunde liegende Technologie ist in unserer Organisation ausreichendes Expertenwissen verfügbar."),
  item("CAP-IN-3", "IN",
    "We could take over day-to-day operation of this function internally within a period acceptable for business operations.",
    "Wir könnten den laufenden Betrieb dieser Funktion innerhalb eines für den Geschäftsbetrieb vertretbaren Zeitraums intern übernehmen."),
  item("CAP-IN-4", "IN",
    "We could carry out further development of this function internally if required.",
    "Wir könnten die Weiterentwicklung dieser Funktion bei Bedarf intern durchführen."),

  item("CAP-MS-1", "MS",
    "Our contractual arrangements permit the parallel use of an additional provider for this function.",
    "Unsere vertraglichen Vereinbarungen erlauben den parallelen Einsatz eines weiteren Anbieters für diese Funktion."),
  item("CAP-MS-2", "MS",
    "Our organisation can coordinate the services of several providers for this function technically and organisationally.",
    "Unsere Organisation kann die Leistungen mehrerer Anbieter für diese Funktion technisch und organisatorisch koordinieren."),
  item("CAP-MS-3", "MS",
    "The interfaces and data formats allow relevant parts of this function to be connected to more than one provider.",
    "Die Schnittstellen und Datenformate erlauben es, relevante Teile dieser Funktion an mehr als einen Anbieter anzubinden."),
  item("CAP-MS-4", "MS",
    "We could shift workloads or sub-functions between the providers in use.",
    "Wir könnten Arbeitslasten oder Teilfunktionen zwischen den eingesetzten Anbietern verlagern."),

  item("CAP-NE-1", "NE",
    "Our organisation can negotiate binding adjustments to service or contract terms when requirements change.",
    "Unsere Organisation kann bei veränderten Anforderungen verbindliche Anpassungen der Leistungs- oder Vertragsbedingungen aushandeln."),
  item("CAP-NE-2", "NE",
    "Where agreed services are not delivered, we can enforce effective corrective measures with the provider.",
    "Bei Abweichungen von vereinbarten Leistungen können wir wirksame Korrekturmassnahmen gegenüber dem Anbieter durchsetzen."),
  item("CAP-NE-3", "NE",
    "We can agree material changes to scope or service quality with the provider in a binding manner.",
    "Wir können wesentliche Änderungen an Leistungsumfang oder Servicequalität mit dem Anbieter verbindlich vereinbaren."),
  item("CAP-NE-4", "NE",
    "We can reject disadvantageous unilateral changes by the provider or offset them through contractual adjustments.",
    "Wir können nachteilige einseitige Änderungen des Anbieters ablehnen oder durch vertragliche Anpassungen kompensieren."),
];

export const capacityOf = (key: CapacityKey) => CAPACITIES.find((c) => c.key === key)!;
export const itemsOfCapacity = (key: CapacityKey) => CAP_ITEMS.filter((i) => i.publicBlock === key);

// Mindestens drei von vier gueltigen Antworten. "Weiss ich nicht" gilt als fehlend
// und wird nie als Null gerechnet. Darunter wird kein Wert berechnet, weil eine
// Faehigkeit nicht auf einer einzelnen Antwort beruhen darf.
export const MIN_VALID = 3;

export type CapacityScore = {
  mean: number | null;   // 1..7, nicht normiert: die Skala wird so berichtet, wie gefragt wurde
  valid: number;
  total: number;
};

export function scoreCapacity(
  key: CapacityKey,
  answers: Record<string, number | number[]>,
  missing: number
): CapacityScore {
  const items = itemsOfCapacity(key);
  // Capacity-Items sind immer einzelne Likert-Werte. Mengen und MISSING gelten
  // als fehlend und werden nie als Null gerechnet.
  const vals = items
    .map((i) => answers[i.id])
    .filter((v): v is number => typeof v === "number" && v !== missing);
  return {
    mean: vals.length >= MIN_VALID ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    valid: vals.length,
    total: items.length,
  };
}

export const pickCap = (v: T, lang: Lang) => (lang === "en" ? v.en : v.de);
