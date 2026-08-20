// Zuordnung einzelner Instrument-Items zu den Faehigkeits-Knoten des Modells.
//
// WARUM DAS NOETIG IST
// Das Instrument gliedert Spalte 1 nach Kontrollquelle (C vertraglich, T technisch,
// O organisational), das Modell nach Faehigkeit (PSC, IOC, MPM, DKC, ORB, AAR, ATR).
// Das sind zwei verschiedene Achsen; nur C2/ATR und T3/DKC treffen sich namentlich.
// Auf Konstruktebene laesst sich das nicht aufloesen, auf Itemebene schon: ein
// einzelnes Item fragt nach etwas Konkretem.
//
// HERKUNFT
// Drei unabhaengige Zuordnungen (Modelldokument / Itemwortlaut / Kantenstruktur),
// 34 von 39 Items einstimmig, 5 Streitfaelle einzeln gegen den Wortlaut entschieden.
// Die mit (*) markierten Zeilen waren strittig.
//
// GELTUNGSBEREICH
// Nur die sieben Faehigkeits-Knoten. ALT, ROC, FTC, CTO und CONT behalten die
// Konstruktwerte des Instruments, damit Verdikt, Matrix und Hebel weiter auf den
// Konstrukten des Instruments beruhen und nicht auf einer Umsortierung.
export const ITEM_NODE: Record<string, string> = {
  // Provider Switching Capability
  "T2-1": "PSC",   // Software liesse sich bei anderem Anbieter weiterverwenden
  "T2-5": "PSC",   // Exportumfang reicht zur Uebernahme durch einen Nachfolger
  "T2-6": "PSC",   // Abhaengigkeit von proprietaeren Diensten (reverse)
  "O2-6": "PSC",   // Abhaengigkeitsinventar als Migrations-Scoping
  "O2-5": "PSC",   // (*) Kenntnis des Kopplungsradius bei Anbieteraenderungen

  // In-House Operation Capability
  "O1-1": "IOC",   // Funktion im eigenen Haus betreiben koennen
  "O1-3": "IOC",   // Expertenwissen zur Technologie hinter der Funktion
  "O2-1": "IOC",   // (*) Wissen ueber die eigene Gesamtarchitektur

  // Multi-Provider Management Capability
  "O3-1": "MPM",   // Abstimmung dieses Anbieters mit den uebrigen IT-Anbietern

  // Data and Key Control Capability
  "DKC-1": "DKC",  // Wo liegt das Schluesselmaterial

  // Operational Resilience and Backup Capability
  "DKC-2": "ORB",  // Wiederherstellbare Kopie ausserhalb des Anbieters
  "DKC-3": "ORB",  // Wiederherstellung tatsaechlich getestet
  "CONT-3": "ORB", // Regelmaessige Probelaeufe der Wiederherstellung

  // Administrative Access and Rights Capability
  "ROC-2": "AAR",  // Administrative Rechte und Zugriffsvergabe

  // Audit and Transparency Rights Capability
  "O1-5": "ATR",   // Interne Faehigkeit, die Anbieterleistung zu pruefen
  "ATR-1": "ATR",  // Vertragliches Pruefrecht
  "ATR-2": "ATR",  // Pruefung tatsaechlich ausgeuebt
  "ATR-3": "ATR",  // Unabhaengige Verifikationsgrundlage
};

// Knoten, deren Wert aus dem gleichnamigen Konstrukt des Instruments kommt.
export const CONSTRUCT_NODES = ["ALT", "ROC", "FTC", "CTO", "CONT"] as const;

// Items, die bewusst keinen Knoten faerben, mit Begruendung.
export const UNMAPPED: Record<string, string> = {
  "O3-2": "Beschreibt einen Zustand der Systemlandschaft (automatischer Datenaustausch mit "
        + "Kernanwendungen), keine Faehigkeit. Wirkt inhaltlich als Kopplungsgrad und damit "
        + "gegen die Wechselfaehigkeit. Verwendbar waere es nur als reverse gepoltes PSC-Item, "
        + "ist im Instrument aber positiv gepolt.",
};
