# Digital Sovereignty Model (v9)

## Zielkonstrukt

**Digitale Souveränität auf Organisationsebene** ist die Fähigkeit einer Organisation, bei kritischen digitalen Funktionen auch unter externer Abhängigkeit einen kontrollierten Handlungsraum aufrechtzuerhalten. Sie wird operationalisiert als **formative Aggregation von vier Capacities**: Switching, Internalization, Multi-Sourcing und Negotiation.

## Kausallogik (5 Ebenen)

Externe Kontextfaktoren + Organisationale Enabler → Frictions / Bargaining Position → Capacities → Digitale Souveränität.

- **Ebene A, Kontextfaktoren:** externe, nur begrenzt beeinflussbare Rahmenbedingungen
- **Ebene B, Enabler:** intern gestaltbare organisationale Voraussetzungen
- **Ebene C, Mechanismen:** Übersetzung in Handlungsfriktion (Friction) oder Machtposition (Bargaining Position)
- **Ebene D, Capacities:** die eigentlichen organisationalen Fähigkeiten
- **Ebene E, Digitale Souveränität:** aggregierter Handlungsraum

## Gesamtmodell

```mermaid
flowchart LR
    classDef ctx fill:#ffffff,stroke:#333333,stroke-width:1px,color:#000
    classDef ena fill:#f3f4f6,stroke:#333333,stroke-width:1px,color:#000
    classDef fric fill:#ffffff,stroke:#888888,stroke-width:1px,color:#000
    classDef cap fill:#fde9d7,stroke:#b45309,stroke-width:1.5px,color:#000
    classDef oo fill:#e6eef7,stroke:#1f4e79,stroke-width:1.5px,stroke-dasharray:5 3,color:#1f4e79
    classDef ds fill:#111111,stroke:#000000,stroke-width:2px,color:#fff

    subgraph A["Ebene A: Externe Kontextfaktoren"]
      direction TB
      A1["A1 Marktverfügbarkeit von Alternativen"]:::ctx
      A2["A2 Regulatorische Restriktionen"]:::ctx
      A3["A3 Kritikalität der Funktion"]:::ctx
      A4["A4 Anbieter-Macht / Marktkonzentration"]:::ctx
    end

    subgraph B["Ebene B: Organisationale Enabler"]
      direction TB
      B1["B1 Technische Entkopplung"]:::ena
      B2["B2 Datenkontrolle und Portabilität"]:::ena
      B3["B3 Vertragliche Flexibilität"]:::ena
      B4["B4 Interne technische Kompetenz"]:::ena
      B5["B5 Architekturtransparenz"]:::ena
      B6["B6 Integration und Orchestrierung"]:::ena
      B7["B7 Ressourcenverfügbarkeit"]:::ena
      B8["B8 Strategische Bedeutung für Anbieter"]:::ena
    end

    subgraph C["Ebene C: Mechanismen (Frictions und Bargaining Position)"]
      direction TB
      C1["C1 Switching Friction"]:::fric
      C2["C2 Internalization Friction"]:::fric
      C3["C3 Multi-Sourcing Friction"]:::fric
      C4["C4 Bargaining Position"]:::fric
    end

    subgraph D["Ebene D: Capacities"]
      direction TB
      D1["D1 Switching Capacity"]:::cap
      D2["D2 Internalization Capacity"]:::cap
      D3["D3 Multi-Sourcing Capacity"]:::cap
      D4["D4 Negotiation Capacity"]:::cap
    end

    OO["Outside Options<br/>abgeleitetes Zwischenkonstrukt"]:::oo

    subgraph E["Ebene E"]
      DS["Digitale Souveränität<br/>formativ = f(D1, D2, D3, D4)"]:::ds
    end

    %% Kontextfaktoren zu Mechanismen
    A1 -- "(-)" --> C1
    A1 -- "(+)" --> C4
    A2 -- "(+)" --> C1
    A2 -- "(+)" --> C2
    A2 -- "(+)" --> C3
    A3 -- "(+)" --> C1
    A3 -- "(+)" --> C2
    A3 -- "(+)" --> C3
    A3 -- "(-)" --> C4
    A4 -- "(-)" --> C4

    %% Enabler zu Mechanismen
    B1 -- "(-)" --> C1
    B1 -- "(-)" --> C3
    B2 -- "(-)" --> C1
    B2 -- "(-)" --> C2
    B2 -- "(-)" --> C3
    B2 -- "(+)" --> C4
    B3 -- "(-)" --> C1
    B3 -- "(+)" --> C4
    B4 -- "(-)" --> C1
    B4 -- "(-)" --> C2
    B5 -- "(-)" --> C1
    B5 -- "(-)" --> C2
    B6 -- "(-)" --> C3
    B7 -- "(-)" --> C2
    B7 -- "(-)" --> C3
    B8 -- "(+)" --> C4

    %% Mechanismen zu Capacities (Friction runter => Capacity hoch; BP hoch => NC hoch)
    C1 -- "(-)" --> D1
    C2 -- "(-)" --> D2
    C3 -- "(-)" --> D3
    C4 -- "(+)" --> D4

    %% Outside Options: abgeleitet aus operativen Capacities, wirkt auf Bargaining Position
    D1 -. aggregiert .-> OO
    D2 -. aggregiert .-> OO
    D3 -. aggregiert .-> OO
    OO -- "(+)" --> C4

    %% Capacities zu Digitaler Souveränität (formativ)
    D1 ==> DS
    D2 ==> DS
    D3 ==> DS
    D4 ==> DS
```

## Legende

| Symbol | Bedeutung |
| --- | --- |
| `(+)` / `(-)` | Direkter Effekt mit Vorzeichen. `(-)` bedeutet inverse Wirkung (z. B. mehr Friction, weniger Capacity). |
| durchgezogener Pfeil | gerichteter Effekt |
| gestrichelter Pfeil | Aggregation zu Outside Options |
| dicker Pfeil `==>` | formative Aggregation (Capacity zu Digitaler Souveränität) |

## Treiber je Capacity

Welche Kontextfaktoren und Enabler welche Capacity formen (verifiziert gegen die Kausalformen §6.1 bis §6.4):

| Capacity | Kontextfaktoren | Enabler |
| --- | --- | --- |
| **Switching** | A1, A2, A3 | B1, B2, B3, B4, B5 |
| **Internalization** | A2, A3 (+ technologische Komplexität) | B2, B4, B5, B7 |
| **Multi-Sourcing** | A1, A2, A3 | B1, B2, B6, B7 |
| **Negotiation** | A1, A3, A4 | B2, B3, B8 (+ Outside Options) |

Zwei Muster: **A3 Kritikalität** wirkt auf alle vier Capacities (universeller Kontextfaktor), **B2 Datenkontrolle** ist der einzige Enabler, der alle vier formt (höchster Hebel).

## Konstrukttypen (Messung, §7)

| Reflektiv gemessen | Formativ gebildet |
| --- | --- |
| Switching / Internalization / Multi-Sourcing Friction | Digitale Souveränität (aus D1 bis D4) |
| Bargaining Position | Outside Options (aus D1, D2, D3) |
| Switching / Internalization / Multi-Sourcing / Negotiation Capacity | ggf. Datenkontrolle und technische Entkopplung als Index |

## Die vier Capacities (Kurzdefinition)

- **Switching Capacity:** einen Anbieter in akzeptabler Zeit und mit vertretbarem Risiko ersetzen
- **Internalization Capacity:** eine kritische Funktion intern aufbauen oder selbst betreiben
- **Multi-Sourcing Capacity:** mehrere Anbieter parallel und kontrolliert nutzen
- **Negotiation Capacity:** Preise, Vertragsbedingungen, Datenrechte und Governance aktiv beeinflussen
