// AUTOGENERIERT aus 'Sovereignty Model/v13_Instrument_final.xlsx'
// Nicht von Hand bearbeiten — stattdessen tools/gen_instrument.py erneut ausfuehren.
// Likert-Wortlaute sind wortgleich aus der Excel uebernommen (EN und DE).

export type Lang = "en" | "de";
export const MISSING = 99; // 'weiss nicht' — nie als 0 werten
export const INSTRUMENT_VERSION = "v14";

export interface FactOption { value: number; en: string; de: string }
export interface Item {
  id: string; construct: string; en: string; de: string; selected: boolean;
  type: "likert" | "fact" | "multi";
  scale?: number; reverse?: boolean; scaleUndecided?: boolean; scaleOriginal?: number;
  options?: FactOption[]; independentFrom?: number; inverted?: boolean;
}
export interface Construct { key: string; name: string; step: string; sub: string | null; fact: boolean }

export const CONSTRUCTS: Construct[] = [
  {
    "key": "C1",
    "name": "Contractual Flexibility",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "C2",
    "name": "Audit and Transparency Rights",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": true
  },
  {
    "key": "C3",
    "name": "Provider Accommodation",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "T2",
    "name": "Technical Portability",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "T3",
    "name": "Data and Key Control",
    "step": "1 Response Capabilities",
    "sub": "technical",
    "fact": true
  },
  {
    "key": "O1",
    "name": "Internal Technical Competence",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "O2",
    "name": "Architectural Knowledge",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "O3",
    "name": "Integration and Orchestration",
    "step": "1 Response Capabilities",
    "sub": null,
    "fact": false
  },
  {
    "key": "ALT",
    "name": "Credible Alternatives / Reconfiguration Options",
    "step": "2 Mechanisms",
    "sub": null,
    "fact": false
  },
  {
    "key": "ROC",
    "name": "Retained Operational Control",
    "step": "2 Mechanisms",
    "sub": null,
    "fact": false
  },
  {
    "key": "FTC",
    "name": "Reconfiguration Discretion (Freedom to Change)",
    "step": "3 Digital Sovereignty",
    "sub": null,
    "fact": false
  },
  {
    "key": "CTO",
    "name": "Operational Control under Dependence (Control to Operate)",
    "step": "3 Digital Sovereignty",
    "sub": null,
    "fact": false
  },
  {
    "key": "CONT",
    "name": "Continuity under Provider Disruption",
    "step": "4 Outcome",
    "sub": null,
    "fact": false
  }
];

export const ITEMS: Item[] = [
  {
    "id": "C1-1",
    "construct": "C1",
    "en": "Our agreement allows service or contract terms to be adjusted within a defined procedure when requirements change.",
    "de": "Unsere Vereinbarung ermöglicht es, Leistungs- oder Vertragsbedingungen bei veränderten Anforderungen innerhalb eines festgelegten Verfahrens anzupassen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C1-2",
    "construct": "C1",
    "en": "Our agreement sets out a binding procedure for changes to the scope of service.",
    "de": "Unsere Vereinbarung legt ein verbindliches Verfahren für Änderungen des Leistungsumfangs fest.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C1-3",
    "construct": "C1",
    "en": "Once it is signed, our contract with this provider for this function would be very difficult to modify. (reverse-coded)",
    "de": "Ist unser Vertrag mit diesem Anbieter für diese Funktion einmal unterschrieben, wäre er nur sehr schwer zu ändern.",
    "selected": true,
    "type": "likert",
    "scale": 7,
    "reverse": true
  },
  {
    "id": "C1-4",
    "construct": "C1",
    "en": "Our contract with this provider for this function specifies a process for prioritizing changes and adjusting the volume, type, or level of service as our requirements evolve.",
    "de": "Unser Vertrag mit diesem Anbieter für diese Funktion beschreibt ein Verfahren, um Änderungen zu priorisieren und Umfang, Art oder Niveau der Leistung anzupassen, wenn sich unsere Anforderungen ändern.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C2-1",
    "construct": "C2",
    "en": "We assess this provider's performance for this function through formal evaluations that follow established guidelines and procedures.",
    "de": "Wir bewerten die Leistung dieses Anbieters für diese Funktion in formalen Beurteilungen, die festgelegten Richtlinien und Verfahren folgen.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C2-2",
    "construct": "C2",
    "en": "Our agreement with this provider defines precisely what is to be measured for this function (e.g., service levels, price and service benchmarking, quality).",
    "de": "Unsere Vereinbarung mit diesem Anbieter legt genau fest, was für diese Funktion gemessen werden soll (z. B. Service Level, Preis- und Leistungsvergleiche, Qualität).",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C2-3",
    "construct": "C2",
    "en": "For this function, we can reconstruct a complete audit trail of what happened from our own records, without having to rely on this provider's account.",
    "de": "Für diese Funktion können wir aus unseren eigenen Aufzeichnungen einen lückenlosen Prüfpfad des Geschehenen rekonstruieren, ohne uns auf die Darstellung dieses Anbieters verlassen zu müssen.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C2-4",
    "construct": "C2",
    "en": "The contract for this function entitles us to regular service level reports containing measured service level values. (yes / no)",
    "de": "Unser Vertrag mit diesem Anbieter für diese Funktion gibt uns Anspruch auf regelmäßige Service-Level-Berichte mit gemessenen Service-Level-Werten.",
    "selected": false,
    "type": "likert",
    "scale": 2
  },
  {
    "id": "C3-1",
    "construct": "C3",
    "en": "This provider generally accommodates our requests regarding this function.",
    "de": "Für diese Funktion kommt dieser Anbieter unseren Wünschen in der Regel entgegen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C3-2",
    "construct": "C3",
    "en": "When we request changes to how this function is delivered, negotiating them with this provider is easy.",
    "de": "Wenn wir Änderungen daran wünschen, wie diese Funktion erbracht wird, lassen sie sich mit diesem Anbieter leicht aushandeln.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C3-4",
    "construct": "C3",
    "en": "The procedures and routines this provider uses to deliver this function are tailored to our particular situation.",
    "de": "Die Verfahren und Abläufe, mit denen dieser Anbieter diese Funktion erbringt, sind auf unsere besondere Situation zugeschnitten.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "C3-5",
    "construct": "C3",
    "en": "This provider adapts to our goals and priorities for this function.",
    "de": "Dieser Anbieter richtet sich nach unseren Zielen und Prioritäten für diese Funktion.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "T2-1",
    "construct": "T2",
    "en": "If we moved this function to a different provider, the software that delivers it could be used there with little change.",
    "de": "Wenn wir diese Funktion zu einem anderen Anbieter verlagern würden, ließe sich die Software, die diese Funktion bereitstellt, dort mit geringen Anpassungen weiterverwenden.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "T2-3",
    "construct": "T2",
    "en": "Our systems are tailored to the specific services this provider delivers for this function to a degree that moving away would require substantial rebuilding.",
    "de": "Unsere Systeme sind so stark auf die konkreten Leistungen zugeschnitten, die dieser Anbieter für diese Funktion erbringt, dass eine Verlagerung weg von diesem Anbieter einen erheblichen Umbau erfordern würde.",
    "selected": false,
    "type": "likert",
    "scale": 7,
    "reverse": true
  },
  {
    "id": "T2-5",
    "construct": "T2",
    "en": "What we can export from this function at this provider includes everything another provider would need to take it over.",
    "de": "Was wir aus dieser Funktion bei diesem Anbieter exportieren können, umfasst alles, was ein anderer Anbieter benötigen würde, um diese Funktion zu übernehmen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "T2-6",
    "construct": "T2",
    "en": "Core parts of this function rely on this provider's proprietary services.",
    "de": "Kernbestandteile dieser Funktion beruhen auf proprietären Diensten dieses Anbieters.",
    "selected": true,
    "type": "likert",
    "scale": 7,
    "reverse": true
  },
  {
    "id": "O1-1",
    "construct": "O1",
    "en": "The technical skills and resources required to run this function in-house remain readily available within our organization.",
    "de": "Die technischen Fähigkeiten und Ressourcen, die nötig sind, um diese Funktion im eigenen Haus zu betreiben, sind in unserer Organisation weiterhin ohne Weiteres verfügbar.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O1-2",
    "construct": "O1",
    "en": "Our internal IT staff members are capable of solving any problems regarding the use of this function in our organization.",
    "de": "Unsere internen IT-Mitarbeiter sind in der Lage, alle Probleme bei der Nutzung dieser Funktion in unserer Organisation zu lösen.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O1-3",
    "construct": "O1",
    "en": "We have individual(s) with \"expert\" knowledge of the technology behind this function.",
    "de": "Wir haben eine oder mehrere Personen mit „Experten“-Wissen zur Technologie hinter dieser Funktion.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O1-5",
    "construct": "O1",
    "en": "We have individual(s) who could carry out the technical assessment and evaluation of what this provider delivers for this function.",
    "de": "Wir haben eine oder mehrere Personen, die die technische Prüfung und Bewertung dessen vornehmen könnten, was dieser Anbieter für diese Funktion erbringt.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O2-1",
    "construct": "O2",
    "en": "We have knowledge about the design of the overall product and service architecture to which this vendor's delivery of this function contributes.",
    "de": "Wir haben Kenntnis davon, wie die gesamte Produkt- und Dienstleistungsarchitektur gestaltet ist, zu der die Leistung dieses Anbieters für diese Funktion beiträgt.",
    "selected": true,
    "type": "likert",
    "scaleOriginal": 5,
    "scale": 7
  },
  {
    "id": "O2-2",
    "construct": "O2",
    "en": "We have knowledge about the ways in which the service this vendor delivers for this function is integrated and linked together with our other systems into a coherent whole.",
    "de": "Wir haben Kenntnis davon, auf welche Weise die Leistung, die dieser Anbieter für diese Funktion erbringt, mit unseren übrigen Systemen verbunden und zusammengeführt ist.",
    "selected": false,
    "type": "likert",
    "scaleOriginal": 5,
    "scale": 7
  },
  {
    "id": "O2-5",
    "construct": "O2",
    "en": "We know in detail how a change on this provider's side would work its way through our own systems for this function.",
    "de": "Wir wissen im Detail, wie sich eine Änderung auf Seiten dieses Anbieters durch unsere eigenen Systeme für diese Funktion hindurch auswirken würde.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O2-6",
    "construct": "O2",
    "en": "We know which of our own IS applications and data assets depend on this function delivered by this vendor.",
    "de": "Wir wissen, welche unserer eigenen IT-Anwendungen und Datenbestände von dieser Funktion abhängen, die dieser Anbieter erbringt.",
    "selected": true,
    "type": "likert",
    "scaleOriginal": 5,
    "scale": 7
  },
  {
    "id": "O3-1",
    "construct": "O3",
    "en": "We actively coordinate what this provider does for this function with what our other IT suppliers do.",
    "de": "Wir stimmen aktiv aufeinander ab, was dieser Anbieter für diese Funktion tut und was unsere übrigen IT-Anbieter tun.",
    "selected": true,
    "type": "likert",
    "scale": 7,
    "scaleUndecided": true
  },
  {
    "id": "O3-2",
    "construct": "O3",
    "en": "The interfaces and data formats of this function allow additional providers or systems to be connected.",
    "de": "Die Schnittstellen und Datenformate dieser Funktion erlauben die Anbindung zusätzlicher Anbieter oder Systeme.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "O3-3",
    "construct": "O3",
    "en": "We have people in charge of coordinating this vendor's resources for this function with the resources of our own IT department.",
    "de": "Wir haben Personen, die dafür zuständig sind, die Ressourcen dieses Anbieters für diese Funktion mit den Ressourcen unserer eigenen IT-Abteilung abzustimmen.",
    "selected": false,
    "type": "likert",
    "scale": 7,
    "scaleUndecided": true
  },
  {
    "id": "O3-5",
    "construct": "O3",
    "en": "We have people who steer, in day-to-day operation, how this provider's service for this function works together with our other internal services.",
    "de": "Wir haben Personen, die im Tagesgeschäft steuern, wie die Leistung dieses Anbieters für diese Funktion mit unseren übrigen internen Diensten zusammenspielt.",
    "selected": true,
    "type": "likert",
    "scale": 7,
    "scaleUndecided": true
  },
  {
    "id": "ALT-1",
    "construct": "ALT",
    "en": "We have a good alternative to this provider for this function.",
    "de": "Für diese Funktion haben wir eine gute Alternative zu diesem Anbieter.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ALT-3",
    "construct": "ALT",
    "en": "The time needed to switch this function to the best available alternative provider would be short.",
    "de": "Die Zeit für einen Wechsel dieser Funktion zum besten verfügbaren Alternativanbieter wäre kurz.",
    "selected": true,
    "type": "likert",
    "scaleOriginal": 5,
    "scale": 7
  },
  {
    "id": "ALT-4",
    "construct": "ALT",
    "en": "Moving this function to a new provider would require only a limited redesign and development effort on our part.",
    "de": "Der Wechsel dieser Funktion zu einem neuen Anbieter würde auf unserer Seite nur begrenzten Aufwand für Umgestaltung und Entwicklung erfordern.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ALT-5",
    "construct": "ALT",
    "en": "There are other providers who could deliver this function to us at comparable quality and scope.",
    "de": "Es gibt andere Anbieter, die uns diese Funktion in vergleichbarer Qualität und in vergleichbarem Umfang erbringen könnten.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ROC-1",
    "construct": "ROC",
    "en": "Our organisation can take the essential operational decisions for this function itself.",
    "de": "Unsere Organisation kann die wesentlichen operativen Entscheidungen für diese Funktion selbst treffen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ROC-2",
    "construct": "ROC",
    "en": "Our organisation holds the administrative rights to change security settings and access rights for this function itself.",
    "de": "Unsere Organisation verfügt über die administrativen Rechte, um Sicherheitseinstellungen und Zugriffsrechte für diese Funktion selbst zu ändern.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ROC-4",
    "construct": "ROC",
    "en": "Sizing and scaling this function during ongoing operation is handled by our own staff, not by the provider's.",
    "de": "Die fortlaufende Dimensionierung und Skalierung dieser Funktion übernehmen unsere eigenen Leute, nicht die Leute dieses Anbieters.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ROC-5",
    "construct": "ROC",
    "en": "Our organisation can set priorities and scope for the further development of this function in a binding way.",
    "de": "Unsere Organisation kann Prioritäten und Umfang der Weiterentwicklung dieser Funktion verbindlich festlegen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "FTC-1",
    "construct": "FTC",
    "en": "Our agreement allows us to adjust the scope or configuration of the service we obtain, within clearly defined limits.",
    "de": "Unsere Vereinbarung erlaubt uns, Umfang oder Konfiguration der bezogenen Leistung innerhalb klar definierter Grenzen selbst anzupassen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "FTC-2",
    "construct": "FTC",
    "en": "Nothing in our arrangement forbids us from using a competing provider for this function alongside this one.",
    "de": "Nichts in unserer Vereinbarung verbietet uns, für diese Funktion neben diesem Anbieter zusätzlich einen konkurrierenden Anbieter zu nutzen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "FTC-3",
    "construct": "FTC",
    "en": "Nothing in our arrangement with this provider prevents us from choosing a different vendor or a different technology for this function.",
    "de": "Nichts in unserer Vereinbarung mit diesem Anbieter hindert uns daran, für diese Funktion einen anderen Anbieter oder eine andere Technologie zu wählen.",
    "selected": false,
    "type": "likert",
    "scaleOriginal": 10,
    "scale": 7
  },
  {
    "id": "FTC-5",
    "construct": "FTC",
    "en": "If this provider wants to change what this function includes, we are free to refuse and keep the arrangement as it is.",
    "de": "Wenn dieser Anbieter ändern will, was diese Funktion umfasst, steht es uns frei, dies abzulehnen und die Vereinbarung unverändert zu lassen.",
    "selected": true,
    "type": "likert",
    "scaleOriginal": 8,
    "scale": 7
  },
  {
    "id": "CTO-1",
    "construct": "CTO",
    "en": "When this provider falls short of what we specified for this function, we can make it correct course.",
    "de": "Wenn dieser Anbieter hinter dem zurückbleibt, was wir für diese Funktion vorgegeben haben, können wir ihn dazu bringen, gegenzusteuern.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CTO-2",
    "construct": "CTO",
    "en": "We can require this provider to fix what our own testing finds in the components it delivers for this function.",
    "de": "Wir können von diesem Anbieter verlangen, dass er die Fehler behebt, die unsere eigenen Tests in den Komponenten finden, die er für diese Funktion liefert.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CTO-4",
    "construct": "CTO",
    "en": "We can get this provider to agree to major changes we require for this function.",
    "de": "Wir können diesen Anbieter dazu bringen, größeren Änderungen zuzustimmen, die wir für diese Funktion verlangen.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CTO-5",
    "construct": "CTO",
    "en": "This provider works according to our organisation's procedures for this function because we require it to.",
    "de": "Dieser Anbieter arbeitet bei dieser Funktion nach den Verfahren unserer Organisation, weil wir es von ihm verlangen.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CONT-1",
    "construct": "CONT",
    "en": "We are able to provide a quick response when this function is disrupted at this provider.",
    "de": "Wir sind in der Lage, schnell zu reagieren, wenn diese Funktion bei diesem Anbieter gestört ist.",
    "selected": false,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CONT-3",
    "construct": "CONT",
    "en": "We periodically run mock trials to test whether we could restore this function if this provider failed.",
    "de": "Wir führen regelmäßig Probeläufe durch, um zu prüfen, ob wir diese Funktion bei einem Ausfall dieses Anbieters wiederherstellen könnten.",
    "selected": false,
    "type": "likert",
    "scale": 7,
    "scaleUndecided": true
  },
  {
    "id": "CONT-4",
    "construct": "CONT",
    "en": "If the service currently obtained from the provider failed completely, we could maintain the business-critical minimum level of this function without interruption.",
    "de": "Bei einem vollständigen Ausfall der derzeit vom Anbieter bezogenen Leistung könnten wir die geschäftskritische Mindestleistung dieser Funktion ohne Unterbrechung aufrechterhalten.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "CONT-6",
    "construct": "CONT",
    "en": "During the intended bridging period we could maintain the business-critical minimum level of this function independently of the provider.",
    "de": "Während der vorgesehenen Überbrückungszeit könnten wir die geschäftskritische Mindestleistung dieser Funktion unabhängig vom Anbieter aufrechterhalten.",
    "selected": true,
    "type": "likert",
    "scale": 7
  },
  {
    "id": "ATR-1",
    "construct": "C2",
    "en": "Contractual audit right: is an audit or inspection right written into the binding documents?",
    "de": "Vertragliches Prüfrecht: steht in den bindenden Dokumenten ein Pruef- oder Einsichtsrecht?",
    "selected": true,
    "type": "fact",
    "options": [
      {
        "value": 0,
        "en": "No audit right is written down",
        "de": "Kein Prüfrecht verschriftlicht"
      },
      {
        "value": 1,
        "en": "Mentioned, but not spelled out",
        "de": "Erwähnt, aber nicht ausgestaltet"
      },
      {
        "value": 2,
        "en": "Documented audit clause",
        "de": "Vertraglich dokumentiert"
      }
    ]
  },
  {
    "id": "ATR-2",
    "construct": "C2",
    "en": "Exercise: when did we last actually carry out such a check for this function at this provider?",
    "de": "Ausübung: wann haben wir zuletzt tatsächlich eine solche Prüfung durchgeführt?",
    "selected": true,
    "type": "fact",
    "options": [
      {
        "value": 0,
        "en": "Never",
        "de": "Nie"
      },
      {
        "value": 1,
        "en": "More than 24 months ago",
        "de": "Vor mehr als 24 Monaten"
      },
      {
        "value": 2,
        "en": "Within the last 24 months",
        "de": "Innerhalb der letzten 24 Monate"
      }
    ]
  },
  {
    "id": "ATR-3",
    "construct": "C2",
    "en": "Which evidence independent of the provider is available to your organisation for this function?",
    "de": "Welche vom Anbieter unabhängigen Nachweise stehen Ihrer Organisation für diese Funktion zur Verfügung?",
    "selected": true,
    "type": "multi",
    "options": [
      {
        "value": 1,
        "en": "No independent evidence",
        "de": "Keine unabhängigen Nachweise"
      },
      {
        "value": 2,
        "en": "Our own logs or telemetry",
        "de": "Eigene Protokolle oder Telemetriedaten"
      },
      {
        "value": 3,
        "en": "Independent audit reports or certifications",
        "de": "Unabhängige Prüfberichte oder Zertifizierungen"
      },
      {
        "value": 4,
        "en": "Our own technical tests",
        "de": "Eigene technische Prüfungen"
      },
      {
        "value": 5,
        "en": "Contractual right to further audits",
        "de": "Vertragliches Recht auf zusätzliche Prüfung"
      }
    ]
  },
  {
    "id": "DKC-1",
    "construct": "T3",
    "en": "Who controls the cryptographic key material used for this function?",
    "de": "Wer kontrolliert das für diese Funktion verwendete kryptografische Schlüsselmaterial?",
    "selected": true,
    "type": "fact",
    "options": [
      {
        "value": 1,
        "en": "Provider-managed",
        "de": "Anbieterverwaltet"
      },
      {
        "value": 2,
        "en": "Customer-managed inside the provider",
        "de": "Kundenverwaltet im Anbieter-Modul"
      },
      {
        "value": 3,
        "en": "Bring Your Own Key (BYOK)",
        "de": "Bring Your Own Key (BYOK)"
      },
      {
        "value": 4,
        "en": "External key store (HYOK)",
        "de": "Externer Schlüsselspeicher (HYOK)"
      },
      {
        "value": 5,
        "en": "Client-side encryption",
        "de": "Clientseitige Verschlüsselung"
      }
    ],
    "independentFrom": 4
  },
  {
    "id": "DKC-2",
    "construct": "T3",
    "en": "Independent backup: if this provider were unavailable, where is a restorable copy?",
    "de": "Unabhängige Sicherung: wo liegt eine wiederherstellbare Kopie, wenn dieser Anbieter ausfällt?",
    "selected": true,
    "type": "fact",
    "options": [
      {
        "value": 1,
        "en": "None",
        "de": "Keine"
      },
      {
        "value": 2,
        "en": "With the provider",
        "de": "Beim Anbieter"
      },
      {
        "value": 3,
        "en": "Outside the provider",
        "de": "Außerhalb des Anbieters"
      }
    ],
    "independentFrom": 3
  },
  {
    "id": "DKC-3",
    "construct": "T3",
    "en": "When was the restore of this function last tested?",
    "de": "Wann wurde die Wiederherstellung dieser Funktion zuletzt getestet?",
    "selected": true,
    "type": "fact",
    "options": [
      {
        "value": 1,
        "en": "Never tested",
        "de": "Nie getestet"
      },
      {
        "value": 2,
        "en": "Successfully tested more than 12 months ago",
        "de": "Vor mehr als zwölf Monaten erfolgreich getestet"
      },
      {
        "value": 3,
        "en": "Tested within the last 12 months, not successful",
        "de": "Innerhalb der letzten zwölf Monate getestet, aber nicht erfolgreich"
      },
      {
        "value": 4,
        "en": "Successfully tested within the last 12 months",
        "de": "Innerhalb der letzten zwölf Monate erfolgreich getestet"
      }
    ]
  },
  {
    "id": "DKC-G",
    "construct": "T3",
    "en": "Could this provider return this function's data in plaintext without any cooperation from your organisation?",
    "de": "Könnte dieser Anbieter die Daten dieser Funktion im Klartext herausgeben, ohne jede Mitwirkung unserer Organisation?",
    "selected": false,
    "type": "fact",
    "options": [
      {
        "value": 1,
        "en": "Yes",
        "de": "Ja"
      },
      {
        "value": 0,
        "en": "No",
        "de": "Nein"
      }
    ],
    "inverted": true
  },
  {
    "id": "C1-2b",
    "construct": "C1",
    "en": "Our agreement governs the terms on which additional or changed requirements are implemented.",
    "de": "Unsere Vereinbarung regelt, nach welchen Bedingungen zusätzliche oder veränderte Anforderungen umgesetzt werden.",
    "selected": true,
    "type": "likert",
    "scale": 7
  }
];
