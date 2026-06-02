// ─── Types ──────────────────────────────────────────────────────────────────────

export interface LikertQuestion {
  id: string;
  type: "likert";
  dimension?: string;
  question: string;
  reversed?: boolean; // true for negatively worded items (e.g. HU)
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceQuestion {
  id: string;
  type: "choice";
  question: string;
  options: ChoiceOption[];
}

export type Question = LikertQuestion | ChoiceQuestion;

export interface QuestionGroup {
  title: string;
  description?: string;
  questions: Question[];
}

export interface SurveyBlock {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  framing?: string;
  groups: QuestionGroup[];
}

// ─── Scale Labels ───────────────────────────────────────────────────────────────

export const likertScale = [
  { value: 1, label: "Trifft nicht zu" },
  { value: 2, label: "Trifft eher nicht zu" },
  { value: 3, label: "Teilweise" },
  { value: 4, label: "Trifft eher zu" },
  { value: 5, label: "Trifft voll zu" },
];

export const notAssessableValue = 0;

// ─── Dimension / Capacity Labels ──────────────────────────────────────────────────

export const dimensionLabels: Record<string, string> = {
  K: "Kritikalität",
  SW: "Switching · Wechselfähigkeit",
  IN: "Internalization · Internalisierung",
  MS: "Multi-Sourcing · Mehrgleisigkeit",
  NE: "Negotiation · Verhandlungsmacht",
};

// Capacity order used across the assessment (matches CapacityRadar AXES order)
export const capacityKeys = ["SW", "IN", "MS", "NE"] as const;

// Short labels for the context factors (Ebene A) and enablers (Ebene B)
export const contextFactorLabels: Record<string, string> = {
  A1: "Markt-Alternativen",
  A2: "Regulatorik",
  A3: "Kritikalität",
  A4: "Anbieter-Macht",
};

export const enablerLabels: Record<string, string> = {
  B1: "Techn. Entkopplung",
  B2: "Datenkontrolle",
  B3: "Vertragl. Flexibilität",
  B4: "Interne Kompetenz",
  B5: "Architekturtransparenz",
  B6: "Integration",
  B7: "Ressourcen",
  B8: "Anbieter-Relevanz",
};

// ─── Framing ──────────────────────────────────────────────────────────────────────

const framingSovereignty =
  "Die folgenden Fragen beziehen sich auf die digitalen Funktionen (z. B. Cloud-Compute, Storage, Analytics- und KI-Services), die Ihre Organisation bei externen Anbietern bezieht und die für Ihre Wertschöpfung kritisch sind. Bitte denken Sie an diese geschäftskritischen Funktionen, nicht an Test-, Entwicklungs- oder reine Verwaltungsumgebungen.";

// ─── Helper ─────────────────────────────────────────────────────────────────────

function l(id: string, question: string, dimension: string, reversed = false): LikertQuestion {
  return { id, type: "likert", dimension, question, reversed };
}

// ─── BLOCK 1: Die vier Capacities ────────────────────────────────────────────────

// Jede Capacity wird reflektiv mit 3 Items gemessen: zwei positiv formuliert,
// eines invertiert (reversed) als Konsistenz- und Acquiescence-Check. Jeweils ein
// konkret/verhaltensnah formuliertes Item reduziert Selbstüberschätzung. Das Scoring
// mittelt automatisch alle Items je dimension und dreht reversed-Items.
const capacitiesBlock: SurveyBlock = {
  id: "capacities",
  title: "Ihre vier Capacities",
  subtitle: "Die Fähigkeiten, die Souveränität ausmachen",
  icon: "Radar",
  color: "#8ba4ff",
  framing: framingSovereignty,
  groups: [
    {
      title: "Switching · Wechselfähigkeit",
      description: "Können Sie einen Anbieter ersetzen?",
      questions: [
        l("SW.1", "Wir könnten unseren wichtigsten Anbieter für eine kritische Funktion innerhalb von etwa 12 Monaten mit vertretbarem Aufwand und Risiko ersetzen.", "SW"),
        l("SW.2", "Für mindestens eine kritische Funktion haben wir einen Anbieterwechsel konkret vorbereitet, etwa durch portierbare Architektur oder eine getestete Alternative.", "SW"),
        l("SW.3", "Ein Anbieterwechsel würde bei uns einen mehrjährigen, kaum kalkulierbaren Umbau erfordern.", "SW", true),
      ],
    },
    {
      title: "Internalization · Internalisierung",
      description: "Könnten Sie es selbst betreiben?",
      questions: [
        l("IN.1", "Wir könnten eine kritische digitale Funktion bei Bedarf intern aufbauen und selbst betreiben.", "IN"),
        l("IN.2", "Wir verfügen intern über das Team und das technische Know-how, um eine kritische Funktion eigenständig zu betreiben.", "IN"),
        l("IN.3", "Ohne unseren aktuellen Anbieter könnten wir eine kritische Funktion nicht eigenständig am Laufen halten.", "IN", true),
      ],
    },
    {
      title: "Multi-Sourcing · Mehrgleisigkeit",
      description: "Können Sie mehrere Anbieter parallel nutzen?",
      questions: [
        l("MS.1", "Wir können kritische Funktionen über mehrere Anbieter parallel und kontrolliert beziehen.", "MS"),
        l("MS.2", "Für mindestens eine kritische Funktion nutzen wir heute bereits mehr als einen Anbieter produktiv.", "MS"),
        l("MS.3", "Beim Ausfall unseres Hauptanbieters hätten wir keine kontrollierte Möglichkeit, kurzfristig auf einen anderen auszuweichen.", "MS", true),
      ],
    },
    {
      title: "Negotiation · Verhandlungsmacht",
      description: "Können Sie Konditionen beeinflussen?",
      questions: [
        l("NE.1", "Wir können Preise und kommerzielle Konditionen mit unseren wichtigsten Anbietern aktiv nachverhandeln.", "NE"),
        l("NE.2", "Wir setzen gegenüber Anbietern vertraglich Datenrechte, Audit- und Governance-Bedingungen durch.", "NE"),
        l("NE.3", "Bei Vertragsverhandlungen müssen wir im Wesentlichen akzeptieren, was unsere Anbieter vorgeben.", "NE", true),
      ],
    },
  ],
};

// ─── BLOCK 2: Kontext & Voraussetzungen (Ebene A + Ebene B) ───────────────────────

const contextBlock: SurveyBlock = {
  id: "context",
  title: "Kontext & Voraussetzungen",
  subtitle: "Externe Kontextfaktoren und organisationale Enabler",
  icon: "Layers",
  color: "#A855F7",
  groups: [
    {
      title: "Externe Kontextfaktoren",
      description: "Rahmenbedingungen, die Ihre Organisation nur begrenzt beeinflussen kann.",
      questions: [
        l("A1", "Für unsere kritischen digitalen Funktionen gibt es am Markt mehrere ernstzunehmende Anbieter-Alternativen.", "CTX"),
        l("A2", "Für unsere kritischen Funktionen bestehen verbindliche regulatorische Anforderungen (z. B. DORA, NIS2, GDPR, AI Act).", "CTX"),
        l("A3", "Die betrachteten digitalen Funktionen sind für unsere Kernwertschöpfung hochkritisch.", "K"),
        l("A4", "Der Markt für unsere kritischen Funktionen wird von wenigen großen Anbietern dominiert.", "CTX"),
      ],
    },
    {
      title: "Organisationale Enabler",
      description: "Intern gestaltbare Voraussetzungen, die Ihre Capacities tragen.",
      questions: [
        l("B1", "Unsere kritischen Funktionen sind technisch so gestaltet, dass sie nur lose an einzelne Anbieter gekoppelt sind.", "ENA"),
        l("B2", "Wir behalten die volle Kontrolle über unsere Daten und können sie jederzeit in einem nutzbaren Format zurückführen.", "ENA"),
        l("B3", "Unsere Verträge mit Anbietern sind flexibel und lassen Anpassungen oder einen Ausstieg zu.", "ENA"),
        l("B4", "Wir verfügen intern über die technische Kompetenz, kritische Funktionen zu verstehen und zu steuern.", "ENA"),
        l("B5", "Wir haben einen vollständigen und aktuellen Überblick über unsere Architektur und Datenflüsse.", "ENA"),
        l("B6", "Wir können Dienste mehrerer Anbieter technisch integrieren und orchestrieren.", "ENA"),
        l("B7", "Uns stehen ausreichend Budget und personelle Ressourcen zur Verfügung, um Souveränitätsmaßnahmen umzusetzen.", "ENA"),
        l("B8", "Wir sind für unsere wichtigsten Anbieter ein strategisch bedeutender Kunde.", "ENA"),
        // Attention check: Dimension "QC" wird vom Scoring nicht ausgewertet, dient nur der Datenqualität.
        l("QC.1", "Bitte wählen Sie bei dieser Aussage \"Trifft eher nicht zu\", um aufmerksames Ausfüllen zu bestätigen.", "QC"),
      ],
    },
  ],
};

// ─── BLOCK 3: Outcomes ──────────────────────────────────────────────────────────

const outcomesBlock: SurveyBlock = {
  id: "outcomes",
  title: "Auswirkungen",
  subtitle: "Was Ihre Souveränität bewirkt",
  icon: "TrendingUp",
  color: "#FF9F2E",
  groups: [
    {
      title: "Ökonomische Outcomes",
      description: "Ihre Marktposition gegenüber den Anbietern.",
      questions: [
        l("TCO.1", "Die Gesamtkosten unserer Anbieter-Beziehungen sind im Vergleich zu Marktbenchmarks angemessen.", "TCO"),
        l("TCO.2", "Wir zahlen für unsere kritischen Dienste keine spürbaren Aufschläge, die aus fehlenden Wechselmöglichkeiten entstehen.", "TCO"),
        l("HU.1", "Wir wären gegen kurzfristige substanzielle Preiserhöhungen unserer wichtigsten Anbieter weitgehend wehrlos.", "HU", true),
        l("HU.2", "Wesentliche Vertragsänderungen unserer Anbieter müssten wir hinnehmen, ohne wirksam gegensteuern zu können.", "HU", true),
      ],
    },
    {
      title: "Strategische Outcomes",
      description: "Ihre Handlungsfähigkeit im Markt.",
      questions: [
        l("FLX.1", "Wir können IT-gestützte Prozesse zügig an neue Geschäftsanforderungen anpassen.", "FLX"),
        l("FLX.2", "Änderungen an unseren digitalen Funktionen lassen sich umsetzen, ohne durch Anbieter-Abhängigkeiten ausgebremst zu werden.", "FLX"),
        l("INN.1", "Wir können neue Technologien (z. B. neue ML-/Analytics-Methoden) zügig in unsere Wertschöpfung integrieren.", "INN"),
        l("INN.2", "Wir sind frei, neue oder bessere Anbieterlösungen zu übernehmen, sobald sie am Markt verfügbar sind.", "INN"),
      ],
    },
  ],
};

// ─── BLOCK 4: Kontrollvariablen ─────────────────────────────────────────────────

const controlsBlock: SurveyBlock = {
  id: "controls",
  title: "Über Ihr Unternehmen",
  subtitle: "Kontext für die Einordnung",
  icon: "Building",
  color: "rgba(139,164,255,0.7)",
  groups: [
    {
      title: "Firmenprofil",
      questions: [
        {
          id: "KV.1",
          type: "choice" as const,
          question: "Mitarbeiterzahl Ihres Unternehmens",
          options: [
            { value: "<250", label: "< 250" },
            { value: "250-999", label: "250–999" },
            { value: "1000-4999", label: "1.000–4.999" },
            { value: "5000-24999", label: "5.000–24.999" },
            { value: ">=25000", label: "≥ 25.000" },
          ],
        },
        {
          id: "KV.2",
          type: "choice" as const,
          question: "Jahresumsatz in Euro",
          options: [
            { value: "<50M", label: "< 50 Mio." },
            { value: "50-250M", label: "50–250 Mio." },
            { value: "250M-1B", label: "250 Mio. – 1 Mrd." },
            { value: "1-10B", label: "1–10 Mrd." },
            { value: ">=10B", label: "≥ 10 Mrd." },
          ],
        },
        {
          id: "KV.3",
          type: "choice" as const,
          question: "Branchen-Hauptkategorie",
          options: [
            { value: "industry", label: "Industrie und Produktion" },
            { value: "finance", label: "Finanzdienstleistungen und Versicherungen" },
            { value: "retail", label: "Handel und Konsum" },
            { value: "tech", label: "Telekommunikation, IT und Medien" },
            { value: "energy", label: "Energie und Versorgung" },
            { value: "health", label: "Gesundheitswesen und Pharma" },
            { value: "public", label: "Öffentlicher Sektor" },
            { value: "logistics", label: "Verkehr und Logistik" },
            { value: "services", label: "Sonstige Dienstleistungen" },
          ],
        },
      ],
    },
    {
      title: "IT & Cloud",
      questions: [
        {
          id: "KV.4",
          type: "choice" as const,
          question: "Jährliches IT-Budget in % des Jahresumsatzes",
          options: [
            { value: "<2%", label: "< 2%" },
            { value: "2-4%", label: "2–4%" },
            { value: "5-9%", label: "5–9%" },
            { value: "10-19%", label: "10–19%" },
            { value: ">=20%", label: "≥ 20%" },
            { value: "unknown", label: "Nicht bekannt" },
          ],
        },
        {
          id: "KV.5",
          type: "choice" as const,
          question: "Anteil des IT-Budgets für externe Cloud-Provider",
          options: [
            { value: "<10%", label: "< 10%" },
            { value: "10-24%", label: "10–24%" },
            { value: "25-49%", label: "25–49%" },
            { value: "50-74%", label: "50–74%" },
            { value: ">=75%", label: "≥ 75%" },
            { value: "unknown", label: "Nicht bekannt" },
          ],
        },
        {
          id: "KV.6",
          type: "choice" as const,
          question: "Cloud-Reifegrad Ihres Unternehmens",
          options: [
            { value: "pilot", label: "Erste Cloud-Pilotprojekte" },
            { value: "selective", label: "Selektive Cloud-Nutzung in einzelnen Bereichen" },
            { value: "cloud-first-partial", label: "Cloud-First für neue Workloads, Bestand teils migriert" },
            { value: "cloud-first-full", label: "Cloud-First mit weitgehend migriertem Bestand" },
            { value: "cloud-native", label: "Cloud-Native auf strategischer Ebene" },
            { value: "unknown", label: "Nicht bekannt" },
          ],
        },
        {
          id: "KV.7",
          type: "choice" as const,
          question: "Wie viele Hyperscaler-Provider nutzt Ihr Unternehmen produktiv?",
          options: [
            { value: "1", label: "Einen" },
            { value: "2", label: "Zwei" },
            { value: "3", label: "Drei" },
            { value: ">3", label: "Mehr als drei" },
            { value: "unknown", label: "Nicht bekannt" },
          ],
        },
      ],
    },
    {
      title: "Persönliche Angaben",
      questions: [
        {
          id: "KV.8",
          type: "choice" as const,
          question: "Hauptsitz Ihres Unternehmens",
          options: [
            { value: "DE", label: "Deutschland" },
            { value: "AT", label: "Österreich" },
            { value: "CH", label: "Schweiz" },
            { value: "EU", label: "Übriges EU" },
            { value: "UK", label: "Vereinigtes Königreich" },
            { value: "NA", label: "Nordamerika" },
            { value: "other", label: "Sonstige" },
          ],
        },
        {
          id: "KV.9",
          type: "choice" as const,
          question: "Ihre Position im Unternehmen",
          options: [
            { value: "cxo", label: "CIO / CTO / Head of IT" },
            { value: "architect", label: "Cloud Architect / Senior IT-Architekt" },
            { value: "strategy", label: "IT-Strategie / Enterprise Architecture" },
            { value: "procurement", label: "IT-Einkauf / Vendor Management" },
            { value: "it-lead", label: "Sonstige IT-Führungsrolle" },
            { value: "other", label: "Sonstige" },
          ],
        },
      ],
    },
  ],
};

// ─── Export ──────────────────────────────────────────────────────────────────────

export const surveyBlocks: SurveyBlock[] = [
  capacitiesBlock,
  contextBlock,
  outcomesBlock,
  controlsBlock,
];

export const totalQuestionCount = surveyBlocks.reduce(
  (sum, block) => sum + block.groups.reduce((gs, g) => gs + g.questions.length, 0),
  0
);
