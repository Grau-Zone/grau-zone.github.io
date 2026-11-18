import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Assessment from "../Assessment";
import { LS } from "../../data/storageKeys";

beforeAll(() => {
  // jsdom kennt weder IntersectionObserver noch ResizeObserver, scrollTo und scrollIntoView
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
  const noop = () => {};
  const ctx = new Proxy({}, { get: () => noop, set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  // Neuere Node-Versionen bringen ein eigenes (hier unbenutzbares) localStorage mit: durch einen
  // einfachen Speicher im Arbeitsspeicher ersetzen.
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const mount = () =>
  render(
    <MemoryRouter>
      <Assessment />
    </MemoryRouter>,
  );
const ls = (k: string) => {
  const raw = localStorage.getItem(k);
  return raw === null ? null : JSON.parse(raw);
};

describe("Sprachwahl", () => {
  it("zeigt die zweisprachige Ueberschrift, beide gleichwertigen Knoepfe mit lang und geht ins Intro", () => {
    const { container } = mount();
    expect(norm(container.querySelector("h1")?.textContent)).toBe("Choose your language · Sprache wählen");
    const en = screen.getByRole("button", { name: "Continue in English" });
    const de = screen.getByRole("button", { name: "Auf Deutsch fortfahren" });
    expect(en).toHaveAttribute("lang", "en");
    expect(de).toHaveAttribute("lang", "de");
    fireEvent.click(en);
    expect(ls(LS.lang)).toBe("en");
    expect(ls(LS.phase)).toBe("intro");
    // englischer Lauf: Inhalt traegt lang="en", Link zum Impressum bleibt deutsch
    expect(container.querySelector("main")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("link", { name: "Impressum und Datenschutz" })).toHaveAttribute("lang", "de");
  });
});

describe("Intro und Intake", () => {
  it("haelt die Einwilligung als Schranke und meldet fehlende Angaben per role=alert", () => {
    localStorage.setItem(LS.lang, JSON.stringify("de"));
    localStorage.setItem(LS.phase, JSON.stringify("intro"));
    const { container } = mount();
    expect(norm(container.querySelector("h1")?.textContent)).toBe(
      "Wie gross ist Ihr Handlungsspielraum bei einer kritischen digitalen Abhängigkeit?",
    );
    expect(container.textContent).toContain("52");
    // fuenf Teile des Assessments
    expect(container.querySelectorAll(".as-path li")).toHaveLength(5);
    // ohne Zustimmung kein Start
    fireEvent.click(screen.getByRole("button", { name: /Assessment starten/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte stimmen Sie vor dem Start zu.");
    expect(ls(LS.phase)).toBe("intro");
    // mit Zustimmung weiter, Antwort-Kennung wird angelegt
    fireEvent.click(screen.getByRole("checkbox"));
    expect(ls(LS.consent)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Assessment starten/ }));
    expect(ls(LS.phase)).toBe("intake");
    expect(typeof ls(LS.rid)).toBe("string");
    expect(ls(LS.rid)).not.toBe("");
  });

  it("verlangt Funktion und Anbieter, Chips lassen sich abwaehlen", () => {
    localStorage.setItem(LS.lang, JSON.stringify("de"));
    localStorage.setItem(LS.phase, JSON.stringify("intake"));
    const { container } = mount();
    expect(container.querySelector("h1")).toHaveTextContent("Betrachtete digitale Abhängigkeit");
    // Chip: aria-pressed, zweiter Klick loescht
    const chip = screen.getByRole("button", { name: "Schweiz" });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(ls(LS.intake).hq).toBe("ch");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(ls(LS.intake).hq).toBe("");
    // Zusatzfrage nur bei "Ja"
    expect(screen.queryByText("Ist dieser IT-Dienstleister intern oder extern?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(screen.getByText("Ist dieser IT-Dienstleister intern oder extern?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Extern" }));
    expect(ls(LS.intake).operatorType).toBe("external");
    fireEvent.click(screen.getByRole("button", { name: "Ja" })); // abwaehlen
    expect(ls(LS.intake).operatedBy).toBe("");
    expect(ls(LS.intake).operatorType).toBe("");
    // Pflichtangaben
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bitte wählen Sie eine Funktion und geben Sie einen Anbieter oder eine anonymisierte Anbieterbezeichnung an.",
    );
    expect(ls(LS.phase)).toBe("intake");
    fireEvent.click(screen.getByRole("radio", { name: /ERP oder Kernsystem der Warenwirtschaft/ }));
    fireEvent.change(screen.getByLabelText("Anbieter oder anonymisierte Bezeichnung"), { target: { value: "SAP" } });
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(ls(LS.phase)).toBe("blocks");
    expect(ls(LS.intake).fnKey).toBe("erp");
    expect(ls(LS.intake).provider).toBe("SAP");
  });
});

describe("Fragebloecke", () => {
  const start = (block: number) => {
    localStorage.setItem(LS.lang, JSON.stringify("de"));
    localStorage.setItem(LS.phase, JSON.stringify("blocks"));
    localStorage.setItem(LS.block, String(block));
    localStorage.setItem(
      LS.intake,
      JSON.stringify({ fnKey: "erp", fnOther: "", provider: "SAP", size: "", industry: "", hq: "", stateRole: "", operatedBy: "", operatorType: "" }),
    );
    return mount();
  };

  it("zeigt Block, Fortschritt und Zaehler, antwortet mit 1 bis 7 und Weiss ich nicht (99)", () => {
    const { container } = start(0);
    expect(container.querySelector("h1")).toHaveTextContent("Wechselfähigkeit");
    expect(screen.getByText("Block 1 von 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("status")).toHaveTextContent("0/4 beantwortet");
    expect(container.textContent).toContain("ERP oder Kernsystem der Warenwirtschaft bei SAP");
    // keine Item-IDs oder Konstruktcodes im DOM (Priming)
    expect(container.innerHTML).not.toMatch(/CAP-SW|CAP-IN|ATR-|DKC-|FTC-|CTO-/);
    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(4);
    fireEvent.click(within(groups[0]).getByRole("radio", { name: "5" }));
    fireEvent.click(within(groups[1]).getByRole("radio", { name: "Weiss ich nicht" }));
    const ans = ls(LS.ans);
    expect(Object.values(ans).sort()).toEqual([5, 99]);
    expect(screen.getByRole("status")).toHaveTextContent("2/4 beantwortet");
  });

  it("rueckt nur bei vollstaendigem Block vor und meldet es sonst per role=alert", () => {
    start(0);
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte beantworten Sie jede Frage oder markieren Sie sie mit „Weiss ich nicht“.");
    expect(ls(LS.block)).toBe(0);
    for (const g of screen.getAllByRole("radiogroup")) fireEvent.click(within(g).getByRole("radio", { name: "Weiss ich nicht" }));
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(ls(LS.block)).toBe(1);
    expect(document.querySelector("h1")).toHaveTextContent("Internalisierungsfähigkeit");
    // Zurueck aus Block 2 in Block 1
    fireEvent.click(screen.getByRole("button", { name: /Zurück/ }));
    expect(ls(LS.block)).toBe(0);
  });

  it("Kontextblock: sieben Gruppen, Mehrfachauswahl mit exklusiver Option und sortierten Werten", () => {
    const { container } = start(4);
    expect(container.querySelector("h1")).toHaveTextContent("Kontext und Nachweise");
    expect(container.querySelectorAll("section.as-cgroup")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /Ergebnis anzeigen/ })).toBeInTheDocument();
    const multi = screen.getByRole("group", { name: /Welche vom Anbieter unabhängigen Nachweise/ });
    const box = (n: RegExp) => within(multi).getByRole("checkbox", { name: n });
    fireEvent.click(box(/Eigene technische Prüfungen/));
    fireEvent.click(box(/Eigene Protokolle oder Telemetriedaten/));
    const key = () => Object.values(ls(LS.ans)).find((v) => Array.isArray(v));
    expect(key()).toEqual([2, 4]);
    fireEvent.click(box(/Keine unabhängigen Nachweise/));
    expect(key()).toEqual([1]);
    fireEvent.click(box(/Keine unabhängigen Nachweise/));
    expect(key()).toEqual([1]);
    fireEvent.click(box(/Eigene Protokolle oder Telemetriedaten/));
    expect(key()).toEqual([2]);
  });
});

describe("Ergebnis", () => {
  const finish = () => {
    localStorage.setItem(LS.lang, JSON.stringify("en"));
    localStorage.setItem(LS.phase, JSON.stringify("result"));
    localStorage.setItem(LS.rid, JSON.stringify("r-testtest1"));
    localStorage.setItem(
      LS.intake,
      JSON.stringify({ fnKey: "erp", fnOther: "", provider: "SAP", size: "lt250", industry: "public", hq: "ch", stateRole: "", operatedBy: "", operatorType: "" }),
    );
    return mount();
  };

  it("h1 mit Fokusziel, Titel, Funktion bei Anbieter, Code, JSON-Export und Neustart", () => {
    const { container } = finish();
    const h1 = container.querySelector("h1")!;
    expect(h1).toHaveAttribute("id", "result-title");
    expect(h1).toHaveAttribute("tabindex", "-1");
    expect(norm(h1.textContent)).toBe("Preliminary capacity profile");
    expect(container.textContent).toContain("ERP or core merchandise management system at SAP");
    expect(screen.getByText("Your result code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export JSON/ })).toBeInTheDocument();
    // der Mail-Link steht an zwei Stellen (oben und in der Abschluss-Karte), beide gleich
    const ctas = screen.getAllByRole("link", { name: /Request a detailed analysis/ });
    expect(ctas).toHaveLength(2);
    expect(ctas[0].getAttribute("href")).toBe(ctas[1].getAttribute("href"));
    expect(ctas[0].getAttribute("href")).toMatch(
      /^mailto:adrian\.bohrer@unisg\.ch,andreas\.hein@unisg\.ch\?subject=Detailed%20analysis%20of%20digital%20sovereignty&body=/,
    );
    // erster Tab-Stopp der Seite ist der Pause-Knopf
    expect(container.querySelector("main")?.firstElementChild).toHaveClass("fx-pause-toggle");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    // Neustart setzt zurueck, Queue und Sent bleiben (hier: Schluessel der Phase wird neu geschrieben)
    fireEvent.click(screen.getByRole("button", { name: /Start over/ }));
    expect(ls(LS.phase)).toBe("lang");
    expect(ls(LS.lang)).toBeNull();
  });
});
