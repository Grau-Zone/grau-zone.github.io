// Zweisprachige Oberflächentexte für das v13-Instrument.
// Die Item-Wortlaute selbst stehen in instrument.ts (aus der Excel generiert).
import type { Lang } from "./instrument";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });
export const pick = (v: T, lang: Lang) => (lang === "en" ? v.en : v.de);

// ─── Konstrukt-Anzeigenamen ──────────────────────────────────────────────────
export const CONSTRUCT_NAMES: Record<string, T> = {
  C1: t("Contractual Flexibility", "Vertragliche Flexibilität"),
  C2: t("Audit and Transparency Rights", "Prüf- und Transparenzrechte"),
  C3: t("Provider Accommodation", "Entgegenkommen des Anbieters"),
  T2: t("Technical Portability", "Technische Portabilität"),
  T3: t("Data and Key Control", "Daten- und Schlüsselkontrolle"),
  O1: t("Internal Technical Competence", "Interne technische Kompetenz"),
  O2: t("Architectural Knowledge", "Architekturwissen"),
  O3: t("Integration and Orchestration", "Integration und Orchestrierung"),
  ALT: t("Credible Alternatives", "Glaubhafte Alternativen"),
  ROC: t("Retained Operational Control", "Behaltene operative Kontrolle"),
  FTC: t("Reconfiguration Discretion", "Rekonfigurations-Spielraum"),
  CTO: t("Operational Control under Dependence", "Operative Kontrolle unter Abhängigkeit"),
  CONT: t("Continuity under Provider Disruption", "Kontinuität bei Anbieterstörung"),
};

// Kurzer Zusatz für die zwei Souveränitäts-Dimensionen
export const CONSTRUCT_SUFFIX: Record<string, T> = {
  FTC: t("Freedom to Change", "Freedom to Change"),
  CTO: t("Control to Operate", "Control to Operate"),
};

// ─── Firmenprofil ────────────────────────────────────────────────────────────
// Stichprobenbeschreibung. Die Schluessel sind stabil und wandern so in den
// Export; die Beschriftungen sind reine Anzeige.
export const FIRM_SIZE: { key: string; label: T }[] = [
  { key: "lt250",      label: t("< 250", "< 250") },
  { key: "250_999",    label: t("250–999", "250–999") },
  { key: "1k_5k",      label: t("1,000–4,999", "1.000–4.999") },
  { key: "5k_25k",     label: t("5,000–24,999", "5.000–24.999") },
  { key: "gte25k",     label: t("≥ 25,000", "≥ 25.000") },
];

export const INDUSTRY: { key: string; label: T }[] = [
  { key: "manufacturing", label: t("Industry and manufacturing", "Industrie und Produktion") },
  { key: "finance",       label: t("Financial services and insurance", "Finanzdienstleistungen und Versicherungen") },
  { key: "retail",        label: t("Retail and consumer goods", "Handel und Konsum") },
  { key: "tmt",           label: t("Telecommunications, IT and media", "Telekommunikation, IT und Medien") },
  { key: "energy",        label: t("Energy and utilities", "Energie und Versorgung") },
  { key: "health",        label: t("Healthcare and pharmaceuticals", "Gesundheitswesen und Pharma") },
  { key: "public",        label: t("Public sector", "Öffentlicher Sektor") },
  { key: "logistics",     label: t("Transport and logistics", "Verkehr und Logistik") },
  { key: "services",      label: t("Other services", "Sonstige Dienstleistungen") },
];

export const HQ: { key: string; label: T }[] = [
  { key: "eu",    label: t("EU", "EU") },
  { key: "ch",    label: t("Switzerland", "Schweiz") },
  { key: "uk",    label: t("United Kingdom", "Vereinigtes Königreich") },
  { key: "na",    label: t("North America", "Nordamerika") },
  { key: "other", label: t("Other", "Sonstige") },
];

export const labelOf = (list: { key: string; label: T }[], key: string, lang: Lang) => {
  const hit = list.find((x) => x.key === key);
  return hit ? pick(hit.label, lang) : "";
};

// ─── Auswahlliste kritischer digitaler Funktionen ────────────────────────────
// "providers" sind typische Anbieter und dienen nur als Beispiel im Hinweistext.
export const FUNCTIONS: { key: string; label: T; providers: T }[] = [
  { key: "erp",      label: t("ERP or core merchandise management system", "ERP oder Kernsystem der Warenwirtschaft"),
    providers: t("SAP S/4HANA Cloud, Microsoft Dynamics, Oracle", "SAP S/4HANA Cloud, Microsoft Dynamics, Oracle") },
  { key: "crm",      label: t("CRM and sales management", "CRM und Vertriebssteuerung"),
    providers: t("Salesforce, Microsoft Dynamics, HubSpot", "Salesforce, Microsoft Dynamics, HubSpot") },
  { key: "hr",       label: t("HR and payroll", "Personalwirtschaft und Lohnabrechnung"),
    providers: t("Workday, SAP SuccessFactors, Personio", "Workday, SAP SuccessFactors, Personio") },
  { key: "iam",      label: t("Identity and access management", "Identitäts- und Zugriffsverwaltung"),
    providers: t("Microsoft Entra ID, Okta, Ping", "Microsoft Entra ID, Okta, Ping") },
  { key: "dwh",      label: t("Data warehouse and analytics", "Data Warehouse und Analytik"),
    providers: t("Snowflake, Databricks, Google BigQuery", "Snowflake, Databricks, Google BigQuery") },
  { key: "compute",  label: t("Compute and hosting for own applications", "Rechenleistung und Hosting eigener Anwendungen"),
    providers: t("AWS, Azure, Google Cloud", "AWS, Azure, Google Cloud") },
  { key: "files",    label: t("File storage and document archive", "Dateiablage und Dokumentenarchiv"),
    providers: t("SharePoint, Box, Google Drive", "SharePoint, Box, Google Drive") },
  { key: "backup",   label: t("Backup and disaster recovery as a service", "Backup und Notfallwiederherstellung als Dienst"),
    providers: t("Veeam Cloud, Rubrik, Azure Backup", "Veeam Cloud, Rubrik, Azure Backup") },
  { key: "itsm",     label: t("Service management and ticketing", "Servicemanagement und Ticketing"),
    providers: t("ServiceNow, Jira Service Management, Zendesk", "ServiceNow, Jira Service Management, Zendesk") },
  { key: "shop",     label: t("Customer portal or web shop", "Kundenportal oder Webshop"),
    providers: t("Shopify, SAP Commerce, Adobe Commerce", "Shopify, SAP Commerce, Adobe Commerce") },
  { key: "fraud",    label: t("Fraud detection or risk scoring", "Betrugserkennung oder Risikoscoring"),
    providers: t("industry-specific", "branchenspezifisch") },
  { key: "ai",       label: t("AI services, language models, OCR, translation", "KI-Dienste, Sprachmodelle, Texterkennung, Übersetzung"),
    providers: t("OpenAI, Anthropic, Azure OpenAI, DeepL", "OpenAI, Anthropic, Azure OpenAI, DeepL") },
];
export const FUNCTION_OTHER = "other";

// ─── Modellspalten ───────────────────────────────────────────────────────────
export const STEPS: { key: string; label: T; sub: T }[] = [
  {
    key: "1 Response Capabilities",
    label: t("Response Capabilities", "Response Capabilities"),
    sub: t(
      "What your organisation is able to do — contractually, technically and organisationally.",
      "Was Ihre Organisation kann — vertraglich, technisch und organisatorisch."
    ),
  },
  {
    key: "2 Mechanisms",
    label: t("Mechanisms", "Mechanismen"),
    sub: t(
      "What those capabilities produce: real alternatives, and control you keep.",
      "Was daraus entsteht: echte Alternativen und behaltene Kontrolle."
    ),
  },
  {
    key: "3 Digital Sovereignty",
    label: t("Digital Sovereignty", "Digitale Souveränität"),
    sub: t(
      "The two distinct forms of discretion under provider dependence.",
      "Die zwei Formen von Handlungsspielraum unter Anbieter-Abhängigkeit."
    ),
  },
  {
    key: "4 Outcome",
    label: t("Outcome", "Ergebnis"),
    sub: t(
      "Whether the function keeps running when the provider fails or acts unilaterally.",
      "Ob die Funktion weiterläuft, wenn der Anbieter ausfällt oder einseitig handelt."
    ),
  },
];

// ─── Likert-Skalen (Ankerbeschriftung) ───────────────────────────────────────
// Die Excel enthält 2-, 5-, 7-, 8- und 10-stufige Items (unterschiedliche Quellen).
const AGREE = { low: t("Strongly disagree", "Stimme überhaupt nicht zu"), high: t("Strongly agree", "Stimme voll zu") };
export const YES_NO = { yes: t("Yes", "Ja"), no: t("No", "Nein") };
export function anchorsFor(_scale: number): { low: T; high: T } {
  return AGREE; // gilt für alle Zustimmungsskalen, unabhängig von der Stufenzahl
}

// ─── Oberflächentexte ────────────────────────────────────────────────────────
export const UI = {
  // Sprachauswahl
  langTitle: t("Choose your language", "Sprache wählen"),
  langLead: t(
    "This assessment is available in English and German.",
    "Dieses Assessment gibt es auf Englisch und Deutsch."
  ),
  langEn: t("Continue in English", "Continue in English"),
  langEnHint: t("Recommended — the instrument was written in English", "Empfohlen — das Instrument wurde auf Englisch entwickelt"),
  langDe: t("Auf Deutsch fortfahren", "Auf Deutsch fortfahren"),

  // Intro
  eyebrow: t("Organisation Self-Assessment", "Organisation Self-Assessment"),
  introTitle: t("How sovereign is your organisation?", "Wie souverän ist Ihre Organisation?"),
  introLead: t(
    "This questionnaire follows the Refined Digital Sovereignty Model (v13): response capabilities produce two mechanisms, which produce two distinct forms of discretion — and both together carry continuity when the provider fails.",
    "Dieser Fragebogen folgt dem Refined Digital Sovereignty Model (v13): Handlungsfähigkeiten erzeugen zwei Mechanismen, diese zwei getrennte Formen von Handlungsspielraum — und beide zusammen tragen die Kontinuität, wenn der Anbieter ausfällt."
  ),
  introUnit: t(
    "Answer for exactly one critical digital function at one provider. Every question refers to that pair.",
    "Beantworten Sie alles für genau eine kritische digitale Funktion bei einem Anbieter. Jede Frage bezieht sich auf dieses Paar."
  ),
  start: t("Start assessment", "Assessment starten"),
  toHome: t("Back to homepage", "Zur Startseite"),
  questionsCount: t("questions", "Fragen"),
  minutes: t(
    "approx. 12 minutes from knowledge · the 6 fact questions need contract and operations records",
    "ca. 12 Minuten aus dem Kopf · für die 6 Faktenfragen brauchen Sie Vertrags- und Betriebsunterlagen"
  ),

  // Intake
  intakeTitle: t("The function and the provider", "Die Funktion und der Anbieter"),
  intakeLead: t(
    "Name the critical digital function and the provider you are answering about. Both appear in the questions.",
    "Benennen Sie die kritische digitale Funktion und den Anbieter, um die es geht. Beide erscheinen in den Fragen."
  ),
  intakeFunction: t("Critical digital function", "Kritische digitale Funktion"),
  intakeFunctionPh: t("e.g. customer data platform", "z. B. Kundendatenplattform"),
  intakeProvider: t("Provider", "Anbieter"),
  intakeProviderPh: t("e.g. a hyperscaler, a SaaS vendor", "z. B. ein Hyperscaler, ein SaaS-Anbieter"),
  intakeChoose: t("Select one function", "Eine Funktion auswählen"),
  intakeOther: t("Other, please name", "Andere, bitte benennen"),
  intakeOtherPh: t("Name the function", "Funktion benennen"),
  intakeTypical: t("typical providers", "typische Anbieter"),
  intakeMissingFn: t("Please select a function.", "Bitte wählen Sie eine Funktion."),

  // Navigation
  back: t("Back", "Zurück"),
  next: t("Next", "Weiter"),
  showResult: t("Show result", "Ergebnis anzeigen"),
  answered: t("answered", "beantwortet"),
  block: t("Block", "Block"),
  of: t("of", "von"),
  dontKnow: t("I don't know", "Weiß ich nicht"),
  notAssessable: t("Not assessable", "Nicht beurteilbar"),

  // Ergebnis
  resultEyebrow: t("Your result", "Ihr Ergebnis"),
  resultTitle: t("Sovereignty profile", "Souveränitätsprofil"),
  resultFor: t("for", "für"),
  atProvider: t("at", "bei"),
  sovereigntyHead: t("Digital Sovereignty — the two dimensions", "Digitale Souveränität — die zwei Dimensionen"),
  outcomeHead: t("Outcome", "Ergebnis"),
  mechanismsHead: t("Mechanisms", "Mechanismen"),
  capabilitiesHead: t("Response Capabilities", "Response Capabilities"),
  factHead: t("Fact indices", "Faktenindizes"),
  factLead: t(
    "These are not opinions but recorded facts. They are reported as levels, never averaged into a percentage.",
    "Das sind keine Einschätzungen, sondern erhobene Tatsachen. Sie werden als Stufen berichtet, nie zu einem Prozentwert gemittelt."
  ),
  independent: t("provider-independent", "anbieterunabhängig"),
  notIndependent: t("depends on the provider", "hängt am Anbieter"),
  level: t("Level", "Stufe"),
  missing: t("no answer", "keine Angabe"),
  missingNote: t(
    "Counted as missing — deliberately not scored as zero.",
    "Als fehlend gewertet — bewusst nicht als Null gerechnet."
  ),
  notAnswered: t("not answered", "nicht beantwortet"),
  weakHint: t(
    "This instrument is not validated. The card sort has not yet confirmed it, and three constructs scored weak — including Continuity, the model's dependent variable. Treat the result as a structured conversation starter, not as a measurement.",
    "Dieses Instrument ist nicht validiert. Der Card-Sort hat es bisher nicht bestätigt, und drei Konstrukte sind schwach bewertet — darunter Kontinuität, die abhängige Variable des Modells. Behandeln Sie das Ergebnis als strukturierten Gesprächseinstieg, nicht als Messung."
  ),
  // Visualisierungen
  matrixHead: t("The two dimensions, side by side", "Die zwei Dimensionen im Verhältnis"),
  matrixLead: t(
    "Sovereignty is not one axis. Where you sit here says which of the two forms of discretion carries you.",
    "Souveränität ist keine einzelne Achse. Die Position zeigt, welche der zwei Formen von Handlungsspielraum Sie trägt."
  ),
  quadSovereign: t("Sovereign", "Souverän"),
  quadExit: t("Exit-oriented", "Exit-orientiert"),
  quadSettled: t("Settled in, but bound", "Eingerichtet, aber gebunden"),
  quadExposed: t("Exposed", "Ausgeliefert"),
  outcomeDot: t("Dot = continuity", "Punkt = Kontinuität"),

  chainHead: t("The causal chain", "Die Wirkkette"),
  chainLead: t(
    "Each column is the average of its constructs. The chain is only as strong as its weakest step.",
    "Jede Spalte ist der Mittelwert ihrer Konstrukte. Die Kette ist nur so stark wie ihre schwächste Stufe."
  ),
  chainWeakest: t("weakest step", "schwächste Stufe"),

  diagramHead: t("Your values in the model", "Ihre Werte im Modell"),
  diagramLead: t(
    "Every node is filled by your answers. For mechanisms, sovereignty and outcome the figure is the mean of normalised Likert items; for the seven capabilities it is the share of levels reached — comparable in colour, not in method.",
    "Jeder Knoten ist nach Ihren Antworten gefüllt. Bei Mechanismen, Souveränität und Outcome ist die Zahl das Mittel normierter Likert-Items, bei den sieben Capabilities der Anteil erreichter Stufen — farblich vergleichbar, methodisch nicht."
  ),
  notMeasured: t("not measured", "nicht erhoben"),

  firmHead: t("Company profile", "Firmenprofil"),
  firmLead: t(
    "Three quick questions so we can classify your answers. Optional.",
    "Drei kurze Angaben, damit wir Ihre Antworten einordnen können. Freiwillig."
  ),
  firmSize: t("Number of employees", "Mitarbeiterzahl Ihres Unternehmens"),
  firmIndustry: t("Main industry category", "Branchen-Hauptkategorie"),
  firmHq: t("Company headquarters", "Hauptsitz Ihres Unternehmens"),

  // ─── Einwilligung und Uebermittlung ──────────────────────────────────────
  minutesNoStore: t("nothing is stored", "nichts wird gespeichert"),

  consentLabel: t(
    "I agree that my answers are transmitted to the research team at the University of St. Gallen and used for research on digital sovereignty.",
    "Ich bin damit einverstanden, dass meine Antworten an das Forschungsteam der Universität St. Gallen übermittelt und für die Forschung zu digitaler Souveränität verwendet werden."
  ),
  consentDetail: t(
    "No name or e-mail address is collected. The company profile and the provider name are transmitted — in a small market these can narrow down an organisation. Answers are stored under a random ID.",
    "Es werden weder Name noch E-Mail-Adresse erhoben. Übermittelt werden Firmenprofil und Anbietername — in einem kleinen Markt kann das eine Organisation eingrenzen. Die Antworten werden unter einer zufälligen Kennung gespeichert."
  ),
  consentRequired: t("Please agree before starting.", "Bitte stimmen Sie vor dem Start zu."),

  submitOk: t("Your answers have been transmitted.", "Ihre Antworten wurden übermittelt."),
  submitFailed: t(
    "Your answers could not be transmitted and are stored locally. They will be sent again the next time you open this page.",
    "Ihre Antworten konnten nicht übermittelt werden und liegen lokal. Beim nächsten Aufruf dieser Seite werden sie erneut gesendet."
  ),
  submitPending: t("Transmitting …", "Wird übermittelt …"),
  responseIdLabel: t("Response ID", "Antwort-Kennung"),

  // ─── Verdikt: welche der beiden Dimensionen begrenzt heute? ───────────────
  verdictHead: t("Your position", "Ihre Position"),
  verdictBinding: t("binding today", "begrenzt heute"),
  verdictBoth: t("both equally", "beide gleich"),
  verdictLeadOne: t(
    "Continuity needs both sides at once. Raising the stronger side further will not move continuity while the weaker one lags.",
    "Kontinuität braucht beide Seiten zugleich. Die stärkere weiter zu heben bewegt nichts, solange die schwächere zurückliegt."
  ),
  verdictLeadTie: t(
    "Both sides are at the same level. Continuity only moves if both move together.",
    "Beide Seiten liegen gleichauf. Kontinuität bewegt sich nur, wenn sich beide bewegen."
  ),
  verdictMeasured: t(
    "Continuity is surveyed on its own, not calculated from the two dimensions. A visible gap between them is worth a second look.",
    "Kontinuität wird eigenständig erhoben, nicht aus den beiden Dimensionen berechnet. Eine sichtbare Lücke dazwischen lohnt den zweiten Blick."
  ),

  quadHead: t("Where you sit", "Wo Sie stehen"),
  quadDesc: {
    sovereign: t(
      "You can change provider, and you stay operable while you depend on this one. Continuity rests on two independent supports.",
      "Sie können den Anbieter wechseln und bleiben handlungsfähig, während Sie von ihm abhängen. Kontinuität ruht auf zwei unabhängigen Stützen."
    ),
    exit: t(
      "You could leave. But as long as you stay, you are exposed to this provider's decisions.",
      "Sie könnten gehen. Solange Sie bleiben, sind Sie den Entscheidungen dieses Anbieters ausgesetzt."
    ),
    settled: t(
      "You operate well with this provider, but changing is not realistically open to you. Continuity depends on the relationship holding.",
      "Mit diesem Anbieter läuft der Betrieb, aber ein Wechsel steht Ihnen realistisch nicht offen. Kontinuität hängt daran, dass die Beziehung hält."
    ),
    exposed: t(
      "Neither leaving nor operating under dependence is currently within your control.",
      "Weder der Weggang noch der Betrieb unter Abhängigkeit liegt derzeit in Ihrer Hand."
    ),
  },

  // ─── Call to Action am Seitenende ─────────────────────────────────────────
  ctaEyebrow: t("Next step", "Nächster Schritt"),
  ctaLever: t("Your biggest lever", "Ihr größter Hebel"),
  ctaLeverNone: t("Deepen your sovereignty profile", "Ihr Souveränitätsprofil vertiefen"),
  ctaLead: t(
    "In a deep-dive workshop and on-site audit we deepen your sovereignty profile with real company data and turn it into a prioritised roadmap.",
    "Im Deep-Dive-Workshop und On-Site-Audit vertiefen wir Ihr Souveränitätsprofil mit echten Unternehmensdaten und entwickeln daraus eine priorisierte Roadmap."
  ),
  ctaLeverNote: t(
    "The weaker of the two sovereignty dimensions. It caps what the stronger one can deliver.",
    "Die schwächere der beiden Souveränitätsdimensionen. Sie deckelt, was die stärkere leisten kann."
  ),
  ctaItems: [
    t("Cloud Dependency Mapping", "Cloud Dependency Mapping"),
    t("Data Sovereignty & Governance", "Data Sovereignty & Governance"),
    t("Regulatory Readiness (DORA, NIS2, GDPR, AI Act)", "Regulatory Readiness (DORA, NIS2, GDPR, AI Act)"),
    t("Strategic fields of action", "Strategische Handlungsfelder"),
  ],
  ctaButton: t("Request a deep dive", "Deep-Dive anfragen"),
  ctaMailAttach: t(
    "The full questions and answers are in the file that was just downloaded. Please attach it to this e-mail:",
    "Die vollständigen Fragen und Antworten stehen in der Datei, die soeben heruntergeladen wurde. Bitte an diese Mail anhängen:"
  ),
  ctaDownloadHint: t(
    "The click also downloads your answers as a file to attach — e-mail links cannot carry attachments themselves.",
    "Der Klick lädt Ihre Antworten zusätzlich als Datei zum Anhängen herunter — E-Mail-Links können selbst nichts anhängen."
  ),
  downloadReport: t("Answers as text", "Antworten als Text"),
  ctaMailData: t("--- Survey data (JSON, MISSING=99 means 'do not know') ---",
                 "--- Umfragedaten (JSON, MISSING=99 heißt 'weiß nicht') ---"),
  ctaMailTruncated: t(
    "Note: the full raw data did not fit into an e-mail. Please attach the file from 'Export JSON'.",
    "Hinweis: die vollständigen Rohdaten passen nicht in eine E-Mail. Bitte die Datei aus 'JSON exportieren' anhängen."
  ),
  ctaMailSubject: t("Deep dive: digital sovereignty", "Deep-Dive: Digitale Souveränität"),

  restart: t("Start over", "Erneut durchführen"),
  downloadJson: t("Export JSON", "JSON exportieren"),
  toModel: t("The model in detail", "Das Modell im Detail"),
};
