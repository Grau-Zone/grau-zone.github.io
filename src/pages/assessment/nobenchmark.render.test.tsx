import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Assessment from "../Assessment";
import { LS } from "../../data/storageKeys";

// Ohne veroeffentlichte Vergleichswerte: der Rueckfall mit vier Balken und der Matrix.
vi.mock("../../data/benchmark", async (orig) => ({
  ...(await orig<typeof import("../../data/benchmark")>()),
  hasBenchmark: () => false,
}));

beforeAll(() => {
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

const mount = () =>
  render(
    <MemoryRouter>
      <Assessment />
    </MemoryRouter>,
  );

describe("Ergebnis ohne Vergleichswerte", () => {
  it("zeigt Hinweis, vier Faehigkeiten, Matrix, Kontextliste und den Code im eigenen Lauf", () => {
    localStorage.setItem(LS.lang, JSON.stringify("de"));
    localStorage.setItem(LS.phase, JSON.stringify("result"));
    localStorage.setItem(LS.rid, JSON.stringify("r-testtest1"));
    localStorage.setItem(LS.intake, JSON.stringify({ fnKey: "erp", fnOther: "", provider: "SAP", size: "", industry: "", hq: "", stateRole: "", operatedBy: "", operatorType: "" }));
    const ans: Record<string, number> = {};
    for (const c of ["SW", "IN", "MS", "NE"]) for (let i = 1; i <= 4; i++) ans[`CAP-${c}-${i}`] = 4;
    localStorage.setItem(LS.ans, JSON.stringify(ans));
    const { container } = mount();
    expect(container.textContent).toContain("Vergleichswerte erscheinen hier, sobald genügend Teilnahmen vorliegen.");
    expect(container.querySelectorAll(".as-cap")).toHaveLength(4);
    // vier Mittel 4,0 von 7, vier Balken
    expect(container.querySelectorAll("[data-cap-bar]")).toHaveLength(4);
    expect(screen.getAllByText("Durchschnittliche Selbsteinschätzung: 4,0 von 7")).toHaveLength(4);
    expect(container.textContent).toContain("Ausgewertete Items: 4 von 4");
    expect(container.textContent).toContain("Sie haben 16 von 52 Fragen beantwortet.");
    // Matrix-Abschnitt und Kontextkarte
    expect(screen.getByRole("heading", { level: 2, name: "Die zwei Dimensionen im Verhältnis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Kontext und Nachweise" })).toBeInTheDocument();
    expect(container.textContent).toContain("Diese Angaben werden nicht in die Capacity-Werte eingerechnet.");
    expect(container.textContent).toContain("nicht beantwortet");
    // Abschluss-Karte, Code, Status mit Antwort-Kennung
    expect(screen.getByRole("heading", { level: 2, name: "Ergebnisse gemeinsam einordnen" })).toBeInTheDocument();
    expect(screen.getByText("Ihr Ergebnis-Code")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Ihre Antworten wurden übermittelt\.|Wird übermittelt/);
    expect(container.textContent).toContain("Antwort-Kennung: r-testtest1");
  });

  it("Code-Ansicht: ohne JSON-Export, Statuszeile und Kontextkarte, mit Abmelden und Fokusziel", () => {
    localStorage.setItem(LS.lang, JSON.stringify("de"));
    localStorage.setItem(LS.phase, JSON.stringify("intro"));
    // Testvektor aus resultCode.test.ts (Version 2)
    localStorage.setItem(LS.code, JSON.stringify("A801-GWTA-5MY2-SQ5M-006D"));
    const { container } = mount();
    expect(container.querySelector("h1")).toHaveAttribute("id", "result-title");
    expect(screen.queryByRole("button", { name: /JSON exportieren/ })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector(".as-ctx")).toBeNull();
    expect(container.textContent).toContain("A801-GWTA-5MY2-SQ5M-006D");
    // Pause-Knopf direkt nach dem Titel (Tab-Reihenfolge), nur einer
    expect(container.querySelectorAll(".fx-pause-toggle")).toHaveLength(1);
    const h1 = container.querySelector("h1")!;
    const toggle = container.querySelector(".fx-pause-toggle")!;
    expect(h1.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Abmelden fuehrt zurueck auf das Intro mit dem Code-Formular
    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(container.querySelector("#intro-code")).not.toBeNull();
    expect(localStorage.getItem(LS.code)).toBeNull();
  });
});
