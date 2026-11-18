import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import ThreatContext from "@/components/ThreatContext";
import SovereigntyLayers from "@/components/SovereigntyLayers";
import OrgSovereignty from "@/components/OrgSovereignty";
import { CAPACITIES } from "@/components/CapacityRadar";

beforeAll(() => {
  // jsdom kennt weder IntersectionObserver noch ResizeObserver
  class Obs {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Obs);
  vi.stubGlobal("ResizeObserver", Obs);
  // ohne canvas-Paket: ein 2D-Kontext aus Leerlauf-Funktionen (AmbientField malt im Test nichts)
  const noop = () => {};
  const ctx = new Proxy({}, { get: () => noop, set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
});

afterEach(() => cleanup());

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

describe("ThreatContext (#scenarios)", () => {
  it("behaelt id, Texte und Zahlen wortgleich", () => {
    const { container } = render(<ThreatContext />);
    expect(container.querySelector("section#scenarios")).not.toBeNull();
    const text = norm(container.textContent);
    for (const s of [
      "Die Ausgangslage",
      "Digitale Abhängigkeiten in Europa",
      "Europäische Organisationen sind bei Cloud-Infrastruktur, KI-Modellen und digitalen Technologien in hohem Mass von externen Anbietern abhängig. Gleichzeitig verändern regulatorische Anforderungen die Bedingungen, unter denen diese Technologien eingesetzt werden.",
      "Cloud-Infrastruktur",
      "Abhängigkeit von Infrastruktur-Anbietern",
      "des EU-Cloud-Markts",
      "Amazon, Microsoft und Google kontrollieren ~70% des europäischen Cloud-Markts",
      "Wechselkosten: bis zu 8,5 Mio. € pro Organisation",
      "Microsoft blockierte ICC-Mitarbeiter nach US-Sanktionen",
      "Ein AWS-Ausfall (Okt. 2025) legte 3.500 Unternehmen in 60+ Ländern lahm",
      "KI-Modelle",
      "Abhängigkeit von Modellen und Modellanbietern",
      "globale KI-Nutzung",
      "DeepSeek R1: 0,10 $ / Mio. Token gegenüber OpenAI 4,40 $. Kostenvorteil 20–30×",
      "Alibaba Qwen unter Apache-2.0-Lizenz: kostenlose Nutzung und Anpassung",
      "Trainingsherkunft intransparent. Bias und Zensur sind schwer nachweisbar",
      "Open-Weight-Adoption stieg von 23% auf 67% (2025–2027)",
      "Regulatorisches Umfeld",
      "Anforderungen an den Einsatz digitaler Technologien",
      "dt. Firmen digital abhängig",
      "Data Act, AI Act, NIS2 und DORA definieren Anforderungen an den Technologieeinsatz",
      "GAIA-X: 600 Katalog-Services. Der CEO bestätigt Anbieterengpässe",
      "Hyperscaler-Investitionen 2025: 240 Mrd. $ (US) gegenüber ~15 Mrd. € (EU)",
      "»Wir haben kein Erkenntnisproblem, sondern ein Umsetzungsproblem.« (SAP)",
      "Digitale Souveränität zeigt sich darin, welche Handlungsoptionen Organisationen im Umgang mit kritischen digitalen Abhängigkeiten tatsächlich besitzen.",
    ]) {
      expect(text, s).toContain(s);
    }
    // die drei Kennzahlen stehen als lesbarer Text im DOM (Endwert, nie 0%)
    const sr = Array.from(container.querySelectorAll(".la-sc__big .sr-only")).map((n) => n.textContent);
    expect(sr).toEqual(["70%", "15%", "93%"]);
    // Ueberschriften der Szenarien
    expect(Array.from(container.querySelectorAll("h3")).map((h) => h.getAttribute("aria-label"))).toEqual([
      "Cloud-Infrastruktur",
      "KI-Modelle",
      "Regulatorisches Umfeld",
    ]);
  });

  it("grosse Zahlen neben den Saetzen stehen wortgleich im Satz", () => {
    const { container } = render(<ThreatContext />);
    const rows = Array.from(container.querySelectorAll("li.la-pt"));
    expect(rows.length).toBe(12);
    for (const li of rows) {
      const fig = li.querySelector(".la-pt__fig");
      if (!fig) continue;
      const sentence = norm(li.querySelector(".la-pt__t")?.textContent);
      const n = norm(fig.querySelector(".sr-only")?.textContent || fig.firstElementChild?.textContent);
      const unit = norm(fig.querySelector("small")?.textContent);
      expect(sentence).toContain(unit ? `${n} ${unit}` : n);
    }
  });
});

describe("SovereigntyLayers (#layers)", () => {
  it("Akkordeon: nur eine Reihe offen, Erneut-Klick schliesst, ARIA bleibt", () => {
    const { container } = render(<SovereigntyLayers />);
    expect(container.querySelector("section#layers")).not.toBeNull();
    expect(norm(container.querySelector("h2")?.textContent)).toBe("Drei Bereiche digitaler Abhängigkeit");
    expect(container.textContent).toContain("Sovereignty Radar");

    const ids = ["infra", "model", "data"];
    const btn = (id: string) => container.querySelector<HTMLButtonElement>(`#layer-header-${id}`)!;
    const panel = (id: string) => container.querySelector<HTMLElement>(`#layer-panel-${id}`)!;

    for (const id of ids) {
      expect(btn(id).getAttribute("aria-expanded")).toBe("false");
      expect(btn(id).getAttribute("aria-controls")).toBe(`layer-panel-${id}`);
      expect(btn(id).getAttribute("aria-labelledby")).toBe(`layer-title-${id}`);
      expect(btn(id).getAttribute("aria-describedby")).toBe(`layer-subtitle-${id}`);
      expect(panel(id).getAttribute("role")).toBe("region");
      expect(panel(id).getAttribute("aria-labelledby")).toBe(`layer-header-${id}`);
      expect(panel(id).hasAttribute("inert")).toBe(true);
    }
    // Start: nichts offen
    fireEvent.click(btn("model"));
    expect(btn("model").getAttribute("aria-expanded")).toBe("true");
    expect(panel("model").hasAttribute("inert")).toBe(false);
    fireEvent.click(btn("data"));
    expect(btn("model").getAttribute("aria-expanded")).toBe("false");
    expect(btn("data").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn("data"));
    expect(btn("data").getAttribute("aria-expanded")).toBe("false");
  });

  it("Texte der Bereiche", () => {
    const { container } = render(<SovereigntyLayers />);
    const text = norm(container.textContent);
    for (const s of [
      "Cloud und Infrastruktur",
      "KI-Modelle und Services",
      "Daten und Schnittstellen",
      "Wie hoch sind die Wechselkosten?",
      "Wie austauschbar sind Modelle und APIs?",
      "Wie portabel sind die Daten?",
      "Empfohlene Maßnahmen",
      "Kennzahlen",
      "Europäische Cloud-Anbieter evaluieren: STACKIT, OVHcloud, SAP BTP",
      "Technische Kontrolle: Verschlüsselung, Zero-Trust-Architektur",
    ]) {
      expect(text, s).toContain(s);
    }
  });
});

describe("OrgSovereignty (#organisationen)", () => {
  it("Tabs, Panel und Punktnavigation", async () => {
    const { container } = render(<OrgSovereignty />);
    expect(container.querySelector("section#organisationen")).not.toBeNull();
    expect(norm(container.querySelector("h2")?.textContent)).toBe(
      "Vier Fähigkeiten bestimmen den organisationalen Handlungsspielraum",
    );
    expect(container.textContent).toContain("Digitale Souveränität von Organisationen");
    // Der einleitende Absatz und der Lauftext der vier Namen sind auf Wunsch entfallen (18.11.2026).
    expect(container.textContent).not.toContain("Wir erfassen diesen Handlungsspielraum anhand von vier");

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs.map((t) => t.id)).toEqual([0, 1, 2, 3].map((i) => `capacity-pill-tab-${i}`));
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
    const panel = () => container.querySelector("#capacity-panel")!;
    expect(panel().getAttribute("role")).toBe("tabpanel");
    expect(panel().getAttribute("aria-labelledby")).toBe("capacity-pill-tab-0");
    expect(panel().textContent).toContain("Fähigkeit 01 · Switching");

    // Pfeiltaste: naechste Faehigkeit
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    // Punktnavigation
    const dots = Array.from(container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"));
    expect(dots.map((d) => d.getAttribute("aria-label"))).toEqual(CAPACITIES.map((c) => c.tag));
    fireEvent.click(dots[3]);
    expect(tabs[3].getAttribute("aria-selected")).toBe("true");
    expect(dots[3].getAttribute("aria-pressed")).toBe("true");
    // das Panel wechselt nach dem kurzen Ausblenden des alten
    await waitFor(() => expect(panel().getAttribute("aria-labelledby")).toBe("capacity-pill-tab-3"));
  });
});
