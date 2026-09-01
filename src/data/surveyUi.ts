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
// Kontextgruppen des fuenften Blocks. Neutrale Ueberschriften: die Konstruktnamen
// des Forschungsinstruments duerfen fuer Teilnehmende nicht sichtbar sein, sonst
// steht neben den vier Faehigkeiten ein zweites Modell im Raum.
export const CONTEXT_GROUPS: { key: string; label: T; constructs: string[] }[] = [
  { key: "vertrag",  label: t("Contract terms and audit rights", "Vertragliche Bedingungen und Prüfrechte"), constructs: ["C1", "C2"] },
  { key: "anbieter", label: t("Provider responsiveness", "Reaktionsbereitschaft des Anbieters"), constructs: ["C3"] },
  { key: "wissen",   label: t("Technical and organisational knowledge", "Technisches und organisatorisches Wissen"), constructs: ["O1", "O2", "T2"] },
  { key: "integ",    label: t("Integration and coordination", "Integration und Koordination"), constructs: ["O3"] },
  { key: "daten",    label: t("Data, key and recovery control", "Daten-, Schlüssel- und Wiederherstellungskontrolle"), constructs: ["T3"] },
  { key: "kont",     label: t("Continuity under provider disruption", "Kontinuität bei Anbieterstörungen"), constructs: ["ALT", "ROC", "FTC", "CTO", "CONT"] },
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
  
  langDe: t("Auf Deutsch fortfahren", "Auf Deutsch fortfahren"),

  // Intro
  eyebrow: t("Self-assessment on digital sovereignty", "Self-Assessment zur digitalen Souveränität"),
  introTitle: t(
    "How large is your room for manoeuvre in one critical digital dependency?",
    "Wie gross ist Ihr Handlungsspielraum bei einer kritischen digitalen Abhängigkeit?"
  ),
  introLead: t(
    "Digital sovereignty refers to the room for manoeuvre an organisation has in dealing with critical digital dependencies. This assessment examines that room for manoeuvre through four organisational capacities: Switching, Internalization, Multi-Sourcing and Negotiation.",
    "Digitale Souveränität bezeichnet den Handlungsspielraum einer Organisation im Umgang mit kritischen digitalen Abhängigkeiten. Dieses Assessment betrachtet diesen Handlungsspielraum anhand von vier organisationalen Fähigkeiten: Switching, Internalization, Multi-Sourcing und Negotiation."
  ),
  introUnit: t(
    "Choose one critical digital function and one specific provider. Answer every question for that combination only.",
    "Wählen Sie eine kritische digitale Funktion und einen konkreten Anbieter. Beantworten Sie sämtliche Fragen ausschliesslich für diese Kombination."
  ),
  start: t("Start assessment", "Assessment starten"),
  toHome: t("Back to homepage", "Zur Startseite"),
  questionsCount: t("questions", "Fragen"),
  introStage: t(
    "The instrument is under scientific development. The results support structured self-reflection. They are not yet a validated measurement or a benchmark.",
    "Das Instrument befindet sich in wissenschaftlicher Entwicklung. Die Ergebnisse dienen der strukturierten Selbstreflexion und stellen noch keine validierte Messung oder einen Benchmark dar."
  ),
  minutes: t(
    "For individual context questions you may need contract or operations records.",
    "Für einzelne Kontextfragen benötigen Sie gegebenenfalls Vertrags- oder Betriebsunterlagen."
  ),

  // Intake
  intakeTitle: t("The digital dependency under review", "Betrachtete digitale Abhängigkeit"),
  intakeLead: t(
    "Choose a critical digital function and name the provider concerned. All questions and results refer to that combination only.",
    "Wählen Sie eine kritische digitale Funktion und geben Sie den zugehörigen Anbieter an. Sämtliche Fragen und Ergebnisse beziehen sich ausschliesslich auf diese Kombination."
  ),
  // Ablauf-Einordnung auf der Intake-Seite. Rueckmeldung Dominik Wlcek: es war
  // nicht erkennbar, was nach der Auswahl passiert und was man am Ende bekommt.
  intakeHowHead: t("What happens next", "So läuft es ab"),
  intakeStep1: t(
    "You choose one critical digital function and the provider you obtain it from.",
    "Sie wählen eine kritische digitale Funktion und den Anbieter, von dem Sie sie beziehen."
  ),
  intakeStep2: t(
    "You then rate statements about exactly this combination on a scale from 1 to 7. You assess your own organisation. There are no right or wrong answers.",
    "Anschliessend bewerten Sie Aussagen zu genau dieser Kombination auf einer Skala von 1 bis 7. Sie schätzen Ihre eigene Organisation ein. Es gibt keine richtigen oder falschen Antworten."
  ),
  intakeStep3: t(
    "At the end you see a profile across four organisational capacities and can download your answers.",
    "Am Ende sehen Sie ein Profil über vier organisationale Fähigkeiten und können Ihre Antworten herunterladen."
  ),
  intakeFunction: t("Critical digital function", "Kritische digitale Funktion"),
  intakeFunctionPh: t("e.g. customer data platform", "z. B. Kundendatenplattform"),
  intakeProvider: t("Provider or anonymised label", "Anbieter oder anonymisierte Bezeichnung"),
  intakeProviderPh: t("e.g. Microsoft Azure or Provider A", "z. B. Microsoft Azure oder Provider A"),
  intakeProviderNote: t(
    "Instead of the provider name you may use a unique anonymised label. Please use that label consistently throughout the assessment.",
    "Sie können anstelle des Anbieternamens eine eindeutige anonymisierte Bezeichnung verwenden. Bitte verwenden Sie diese Bezeichnung im gesamten Assessment konsistent."
  ),
  intakeChoose: t("Select one function", "Eine Funktion auswählen"),
  intakeOther: t("Other, please name", "Andere, bitte benennen"),
  intakeOtherPh: t("Name the function", "Funktion benennen"),
  intakeTypical: t("typical providers", "typische Anbieter"),
  intakeMissingFn: t(
    "Please choose a function and enter a provider or an anonymised provider label.",
    "Bitte wählen Sie eine Funktion und geben Sie einen Anbieter oder eine anonymisierte Anbieterbezeichnung an."
  ),

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
  resultTitle: t("Preliminary capacity profile", "Vorläufiges Fähigkeitsprofil"),
  resultLead: t(
    "The overview summarises your self-assessments for the function and provider under review. It shows relative strengths and weaknesses across four organisational capacities. The results are not a validated benchmark and do not permit a conclusive statement about whether your organisation is digitally sovereign.",
    "Die Darstellung fasst Ihre Selbsteinschätzungen für die betrachtete Funktion-Anbieter-Konstellation zusammen. Sie zeigt relative Stärken und Schwächen in vier organisationalen Fähigkeiten. Die Ergebnisse sind noch kein validierter Benchmark und erlauben keine abschliessende Aussage darüber, ob Ihre Organisation digital souverän ist."
  ),
  resultFor: t("for", "für"),
  atProvider: t("at", "bei"),
  sovereigntyHead: t("Digital Sovereignty: the two dimensions", "Digitale Souveränität: die zwei Dimensionen"),
  outcomeHead: t("Outcome", "Ergebnis"),
  mechanismsHead: t("Mechanisms", "Mechanismen"),
  capabilitiesHead: t("Response Capabilities", "Response Capabilities"),
  factHead: t("Fact indices", "Faktenindizes"),
  factLead: t(
    "These are recorded facts, not assessments. They are reported as levels and not averaged into a percentage.",
    "Das sind erhobene Tatsachen, keine Einschätzungen. Sie werden als Stufen berichtet und nicht zu einem Prozentwert gemittelt."
  ),
  independent: t("provider-independent", "anbieterunabhängig"),
  notIndependent: t("depends on the provider", "hängt am Anbieter"),
  level: t("Level", "Stufe"),
  missing: t("no answer", "keine Angabe"),
  missingNote: t(
    "Counted as missing, deliberately not scored as zero.",
    "Als fehlend gewertet, bewusst nicht als Null gerechnet."
  ),
  notAnswered: t("not answered", "nicht beantwortet"),
  weakHint: t(
    "The instrument is under scientific development. The values shown summarise your self-assessments and do not constitute a validated benchmark.",
    "Das Instrument befindet sich in wissenschaftlicher Entwicklung. Die dargestellten Werte fassen Ihre Selbsteinschätzungen zusammen und stellen keinen validierten Benchmark dar."
  ),
  // Visualisierungen
  matrixHead: t("The two dimensions, side by side", "Die zwei Dimensionen im Verhältnis"),
  matrixLead: t(
    "Sovereignty has two axes. The position shows which of the two forms of discretion carries you.",
    "Souveränität hat zwei Achsen. Die Position zeigt, welche der zwei Formen von Handlungsspielraum Sie trägt."
  ),
  quadSovereign: t("Sovereign", "Souverän"),
  quadExit: t("Exit-oriented", "Exit-orientiert"),
  quadSettled: t("Settled in, but bound", "Eingerichtet, aber gebunden"),
  quadExposed: t("Exposed", "Ausgeliefert"),
  outcomeDot: t("Dot = continuity", "Punkt = Kontinuität"),

  chainHead: t("The causal chain", "Die Wirkkette"),
  chainLead: t(
    "Each column is the average of its constructs. The weakest step limits the chain.",
    "Jede Spalte ist der Mittelwert ihrer Konstrukte. Die schwächste Stufe begrenzt die Kette."
  ),
  chainWeakest: t("weakest step", "schwächste Stufe"),

  diagramHead: t("Your values in the model", "Ihre Werte im Modell"),
  diagramLead: t(
    "Every node is filled from your answers. For mechanisms, sovereignty and outcome the figure is the mean of normalised Likert items. For the seven capabilities it is the share of levels reached. The colours are comparable, the methods are not.",
    "Jeder Knoten ist nach Ihren Antworten gefüllt. Bei Mechanismen, Souveränität und Outcome ist die Zahl das Mittel normierter Likert-Items. Bei den sieben Capabilities ist es der Anteil erreichter Stufen. Farblich sind die Werte vergleichbar, methodisch nicht."
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

  // ─── Bloecke und Kontext ─────────────────────────────────────────────────
  multiHint: t("Several answers possible.", "Mehrere Angaben möglich."),
  contextTitle: t("Context and evidence", "Kontext und Nachweise"),
  contextSub: t(
    "Additional contractual, technical and organisational conditions of the dependency under review, and verifiable evidence.",
    "Ergänzende vertragliche, technische und organisationale Bedingungen sowie überprüfbare Nachweise zur betrachteten Abhängigkeit."
  ),
  contextLead: t(
    "The following questions record conditions of the function and provider under review. They are reported separately and are not included in the four capacity values.",
    "Die folgenden Angaben erfassen Bedingungen der betrachteten Funktion-Anbieter-Konstellation. Sie werden separat ausgewiesen und nicht in die vier Capacity-Werte eingerechnet."
  ),
  contextNotScored: t(
    "These answers are not included in the capacity values.",
    "Diese Angaben werden nicht in die Capacity-Werte eingerechnet."
  ),

  // ─── Vollstaendigkeit ────────────────────────────────────────────────────
  incompleteHint: t(
    "Please answer every question, or mark it as \"do not know\".",
    "Bitte beantworten Sie jede Frage oder markieren Sie sie mit „Weiss ich nicht“."
  ),
  answeredSummary: t("You answered {a} of {b} questions.", "Sie haben {a} von {b} Fragen beantwortet."),
  notEnoughAreas: t(
    "For {n} capacities there are not enough answers for an evaluation.",
    "Für {n} Fähigkeiten liegen nicht genügend Angaben für eine Auswertung vor."
  ),
  notEnoughArea: t(
    "For one capacity there are not enough answers for an evaluation.",
    "Für eine Fähigkeit liegen nicht genügend Angaben für eine Auswertung vor."
  ),
  notEnough: t("Not sufficiently answered", "Nicht ausreichend beantwortet"),
  selfRating: t("Average self-assessment: {v} of 7", "Durchschnittliche Selbsteinschätzung: {v} von 7"),
  itemsScored: t("Items evaluated: {a} of {b}", "Ausgewertete Items: {a} von {b}"),

  // ─── Einwilligung und Uebermittlung ──────────────────────────────────────
  minutesNoStore: t("nothing is stored", "nichts wird gespeichert"),

  consentLabel: t(
    "I agree that my answers are transmitted automatically to the research team of the University of St.Gallen after the assessment and evaluated for the research project on digital sovereignty.",
    "Ich bin damit einverstanden, dass meine Antworten nach Abschluss des Assessments automatisch an das Forschungsteam der Universität St.Gallen übermittelt und für das Forschungsprojekt zur digitalen Souveränität ausgewertet werden."
  ),
  consentDetail: t(
    "Transmitted are the answers, the voluntary details about the organisation and the provider given, or its anonymised label. Neither name nor e-mail address is collected. Answers are stored under a random identifier. If transmission fails, they are stored temporarily in the browser and sent again on the next visit. Further information is in the privacy notice.",
    "Übermittelt werden die Antworten, die freiwilligen Angaben zum Unternehmen sowie der angegebene Anbieter beziehungsweise dessen anonymisierte Bezeichnung. Es werden weder Name noch E-Mail-Adresse erhoben. Die Antworten werden unter einer zufälligen Kennung gespeichert. Bei einer fehlgeschlagenen Übermittlung werden sie vorübergehend lokal im Browser gespeichert und beim nächsten Aufruf erneut übertragen. Weitere Informationen finden Sie in der Datenschutzerklärung."
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
    "Continuity is surveyed on its own and not calculated from the two dimensions. A visible gap between them is worth a second look.",
    "Kontinuität wird eigenständig erhoben und nicht aus den beiden Dimensionen berechnet. Eine sichtbare Lücke dazwischen lohnt den zweiten Blick."
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
  ctaHead: t("Discussing the results together", "Ergebnisse gemeinsam einordnen"),
  ctaLeverNone: t("Deepen your sovereignty profile", "Ihr Souveränitätsprofil vertiefen"),
  ctaLead: t(
    "In a more detailed analysis the self-assessments can be reviewed jointly and supplemented by technical, contractual and organisational evidence. The aim is to determine relevant dependencies and possible fields of action systematically.",
    "In einer vertiefenden Analyse können die Selbsteinschätzungen gemeinsam geprüft und durch technische, vertragliche und organisationale Nachweise ergänzt werden. Ziel ist es, relevante Abhängigkeiten und mögliche Handlungsfelder systematisch zu bestimmen."
  ),
  ctaLeverNote: t(
    "The weaker of the two sovereignty dimensions. It caps what the stronger one can deliver.",
    "Die schwächere der beiden Souveränitätsdimensionen. Sie deckelt, was die stärkere leisten kann."
  ),
  ctaItems: [
    t("Analysis of critical digital dependencies", "Analyse kritischer digitaler Abhängigkeiten"),
    t("Assessment of the four organisational capacities", "Einordnung der vier organisationalen Fähigkeiten"),
    t("Review of relevant evidence", "Prüfung relevanter Nachweise"),
    t("Identification of possible fields of action", "Identifikation möglicher Handlungsfelder"),
  ],
  ctaButton: t("Request a detailed analysis", "Vertiefende Analyse anfragen"),
  ctaMailAttach: t(
    "The full questions and answers are in the file that was just downloaded. Please attach it to this e-mail:",
    "Die vollständigen Fragen und Antworten stehen in der Datei, die soeben heruntergeladen wurde. Bitte an diese Mail anhängen:"
  ),
  ctaDownloadHint: t(
    "The click also downloads your answers as a file to attach. E-mail links cannot carry attachments themselves.",
    "Der Klick lädt Ihre Antworten zusätzlich als Datei zum Anhängen herunter. E-Mail-Links können selbst nichts anhängen."
  ),
  downloadReport: t("Answers as text", "Antworten als Text"),
  ctaMailData: t("--- Survey data (JSON, MISSING=99 means 'do not know') ---",
                 "--- Umfragedaten (JSON, MISSING=99 heißt 'weiß nicht') ---"),
  ctaMailTruncated: t(
    "Note: the full raw data did not fit into an e-mail. Please attach the file from 'Export JSON'.",
    "Hinweis: die vollständigen Rohdaten passen nicht in eine E-Mail. Bitte die Datei aus 'JSON exportieren' anhängen."
  ),
  ctaMailSubject: t("Detailed analysis of digital sovereignty", "Vertiefende Analyse zur digitalen Souveränität"),

  restart: t("Start over", "Erneut durchführen"),
  downloadJson: t("Export JSON", "JSON exportieren"),
  toModel: t("The model in detail", "Das Modell im Detail"),
};
