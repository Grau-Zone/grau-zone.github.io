import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { useRef, useState } from "react";
import {
  CountUp,
  DecodeText,
  DotNav,
  GlowCrossfade,
  LineReveal,
  LockOn,
  Magnetic,
  ParticleNetwork,
  Ping,
  RadarSweep,
  Reveal,
  RevealGroup,
  RevealItem,
  ScanDivider,
  ScrollProgress,
  ScrollWords,
  SectionAmbience,
  SectionHeader,
  SegmentedPills,
  SlotText,
  SpotlightCard,
  AnimatedValue,
  PauseToggle,
  Blip,
  SvgPing,
  FX_PAUSED_KEY,
  resetPausedAllForTests,
  setPausedAll,
  usePausedAll,
  usePauseOffscreen,
} from "./index";

beforeAll(() => {
  // jsdom kennt weder IntersectionObserver noch ResizeObserver
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IO);
  vi.stubGlobal("ResizeObserver", IO);
  // ohne canvas-Paket: kein 2D-Kontext (ParticleNetwork steigt dann sauber aus)
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("fx-Bausteine rendern ohne Browser", () => {
  it("Text bleibt wortgleich (textContent)", () => {
    const { container } = render(
      <SectionHeader
        eyebrow="Die Ausgangslage"
        lines={["Digitale Abhängigkeiten", "in Europa"]}
        lead="Lead-Text."
      />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Digitale Abhängigkeiten in Europa");
    expect(container.textContent).toContain("Die Ausgangslage");
    expect(container.textContent).toContain("Lead-Text.");
  });

  it("LineReveal ersetzt <br/> durch ein Leerzeichen", () => {
    const { container } = render(<LineReveal as="h1" trigger="mount" lines={["Digitale", "Souveränität", "messbar machen."]} />);
    expect(container.querySelector("h1")?.textContent).toBe("Digitale Souveränität messbar machen.");
  });

  it("CountUp und SlotText tragen den Endwert im DOM", () => {
    const { container } = render(
      <div>
        <CountUp value="70%" start={false} prime={false} />
        <SlotText value="20–30×" />
        <AnimatedValue value="Jan. 2025" />
      </div>,
    );
    const sr = Array.from(container.querySelectorAll(".sr-only")).map((n) => n.textContent);
    expect(sr).toEqual(["70%", "20–30×", "Jan. 2025"]);
  });

  it("ScrollWords behaelt textContent", () => {
    const text = "Digitale Souveränität zeigt sich darin, welche Handlungsoptionen Organisationen besitzen.";
    const { container } = render(<ScrollWords text={text} highlight={{ Handlungsoptionen: "#8BA4FF" }} />);
    expect(container.querySelector("p")?.textContent).toBe(text);
  });

  it("SegmentedPills: Tablist mit Pfeiltasten", () => {
    const items = [
      { id: 0, label: "Pfad 1", color: "#FF3D57", colorBg: "rgba(255,61,87,0.08)", colorBorder: "rgba(255,61,87,0.25)" },
      { id: 1, label: "Pfad 2", color: "#FF9F2E", colorBg: "rgba(255,159,46,0.08)", colorBorder: "rgba(255,159,46,0.25)" },
      { id: 2, label: "Pfad 3", color: "#00C4A0", colorBg: "rgba(0,196,160,0.08)", colorBorder: "rgba(0,196,160,0.25)" },
    ];
    const Harness = () => {
      const [v, setV] = useState(1);
      return (
        <>
          <SegmentedPills items={items} value={v} onChange={setV} layoutId="t" panelId="p" ariaLabel="Pfade" />
          <DotNav items={items} value={v} onChange={setV} />
        </>
      );
    };
    const { getAllByRole } = render(<Harness />);
    const tabs = getAllByRole("tab");
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].tabIndex).toBe(0);
    fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
    expect(getAllByRole("tab")[2].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(getAllByRole("tab")[2], { key: "Home" });
    expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
    const dots = getAllByRole("button");
    expect(dots.map((d) => d.getAttribute("aria-label"))).toEqual(["Pfad 1", "Pfad 2", "Pfad 3"]);
    expect(dots[0].getAttribute("aria-pressed")).toBe("true");
  });

  it("Deko-Bausteine montieren fehlerfrei", () => {
    const { container, unmount } = render(
      <div>
        <Reveal>
          <span>a</span>
        </Reveal>
        <RevealGroup>
          <RevealItem>b</RevealItem>
        </RevealGroup>
        <DecodeText text="Eyebrow" trigger="mount" />
        <LockOn play>
          <span>3</span>
        </LockOn>
        <SpotlightCard color="#FF3D57" tilt={5} lift={4}>
          c
        </SpotlightCard>
        <Magnetic>
          <a href="#x">
            <span data-magnet-inner>d</span>
          </a>
        </Magnetic>
        <div style={{ position: "relative" }}>
          <RadarSweep color="#4B6EFF" />
          <Ping play={1} color="#8BA4FF" count={2} />
        </div>
        <ScanDivider position="top" />
        <ParticleNetwork />
        <GlowCrossfade layers={["red", "blue"]} active={1} />
        <ScrollProgress />
        <SectionAmbience sections={[{ id: "scenarios", color: "#FF3D57" }]} />
      </div>,
    );
    expect(container.textContent).toContain("Eyebrow");
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(5);
    unmount();
  });
});

/** jsdom unter neueren Node-Versionen liefert kein window.localStorage. */
function installStorage(mode: "memory" | "throwing-methods" | "throwing-access" = "memory") {
  const data = new Map<string, string>();
  const fail = () => {
    throw new Error("blocked");
  };
  const store = {
    getItem: (k: string) => (mode === "memory" ? (data.has(k) ? data.get(k)! : null) : fail()),
    setItem: (k: string, v: string) => (mode === "memory" ? void data.set(k, String(v)) : fail()),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    get length() {
      return data.size;
    },
  };
  if (mode === "throwing-access") {
    Object.defineProperty(window, "localStorage", { configurable: true, get: fail });
  } else {
    Object.defineProperty(window, "localStorage", { configurable: true, value: store });
  }
  return store;
}

function resetPause() {
  installStorage();
  act(() => setPausedAll(false));
  window.localStorage.removeItem(FX_PAUSED_KEY);
  resetPausedAllForTests();
}

describe("PauseToggle", () => {
  beforeEach(() => {
    installStorage();
    resetPausedAllForTests();
  });
  afterEach(() => {
    cleanup();
    resetPause();
    document.documentElement.lang = "de";
  });

  it("ist ein echter Knopf ohne aria-pressed, mit deutschem Text", () => {
    document.documentElement.lang = "de";
    const { getByRole } = render(<PauseToggle />);
    const btn = getByRole("button");
    expect(btn.getAttribute("type")).toBe("button");
    expect(btn.hasAttribute("aria-pressed")).toBe(false);
    expect(btn.textContent).toBe("Animationen anhalten");
    expect(btn.className).toContain("fx-pause-toggle");
  });

  it("schaltet um, speichert und spiegelt ans html", () => {
    const { getByRole } = render(<PauseToggle />);
    const btn = getByRole("button");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("Animationen fortsetzen");
    expect(document.documentElement.dataset.fxPaused).toBe("true");
    expect(window.localStorage.getItem(FX_PAUSED_KEY)).toBe("1");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("Animationen anhalten");
    expect(document.documentElement.dataset.fxPaused).toBe("false");
    expect(window.localStorage.getItem(FX_PAUSED_KEY)).toBe("0");
  });

  it("englisch ueber html lang oder die lang-Prop", () => {
    document.documentElement.lang = "en-GB";
    const { getByRole, unmount } = render(<PauseToggle />);
    expect(getByRole("button").textContent).toBe("Pause animations");
    fireEvent.click(getByRole("button"));
    expect(getByRole("button").textContent).toBe("Resume animations");
    unmount();
    document.documentElement.lang = "de";
    const r2 = render(<PauseToggle lang="en" />);
    expect(r2.getByRole("button").textContent).toBe("Resume animations");
  });

  it("mehrere Instanzen bleiben synchron", () => {
    const { getAllByRole } = render(
      <>
        <PauseToggle />
        <PauseToggle />
      </>,
    );
    fireEvent.click(getAllByRole("button")[0]);
    expect(getAllByRole("button").map((b) => b.textContent)).toEqual(["Animationen fortsetzen", "Animationen fortsetzen"]);
  });

  it.each(["throwing-methods", "throwing-access"] as const)("funktioniert, wenn localStorage wirft (%s)", (mode) => {
    installStorage(mode);
    resetPausedAllForTests();
    const { getByRole } = render(<PauseToggle />);
    expect(getByRole("button").textContent).toBe("Animationen anhalten");
    fireEvent.click(getByRole("button"));
    expect(getByRole("button").textContent).toBe("Animationen fortsetzen");
  });
});

describe("usePauseOffscreen gehorcht dem Pause-Knopf", () => {
  let IOBefore: typeof IntersectionObserver | undefined;
  beforeEach(() => {
    IOBefore = globalThis.IntersectionObserver;
  });
  afterEach(() => {
    cleanup();
    resetPause();
    vi.stubGlobal("IntersectionObserver", IOBefore);
  });

  it("setzt data-paused und meldet onChange", () => {
    // ohne IntersectionObserver gilt das Element als sichtbar
    vi.stubGlobal("IntersectionObserver", undefined);
    const seen: boolean[] = [];
    const Probe = () => {
      const ref = useRef<HTMLDivElement | null>(null);
      usePauseOffscreen(ref, { onChange: (a) => seen.push(a) });
      const paused = usePausedAll();
      return <div ref={ref} data-testid="probe" data-state={paused ? "p" : "r"} />;
    };
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("probe");
    expect(el.dataset.paused).toBe("false");
    act(() => setPausedAll(true));
    expect(el.dataset.paused).toBe("true");
    expect(el.dataset.state).toBe("p");
    act(() => setPausedAll(false));
    expect(el.dataset.paused).toBe("false");
    expect(seen).toEqual([true, false, true]);
  });
});

describe("sanfte Stufe bei prefers-reduced-motion: reduce", () => {
  const original = window.matchMedia;
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it("Radar-Sweep und Blips drehen/blitzen weiter (fx-contained), Pings bleiben", () => {
    const { container } = render(
      <div style={{ position: "relative" }}>
        <RadarSweep color="#4B6EFF" period={6} />
        <Blip x={10} y={10} color="#fff" />
        <Ping play={1} color="#8BA4FF" count={2} />
        <svg>
          <SvgPing cx={5} cy={5} r={2} color="#fff" play={1} />
        </svg>
        <SlotText value="20–30×" />
        <ScrollWords text="Ein kurzer Satz." />
        <ParticleNetwork />
      </div>,
    );
    // Entscheid Adrian 12.10.2026: kleine, auf die Grafik begrenzte Radar-Bewegung
    // laeuft auch in der sanften Stufe; die CSS-Regel fuer reduce nimmt .fx-contained aus.
    const contained = Array.from(container.querySelectorAll<HTMLElement>(".fx-loop.fx-contained"));
    expect(contained.length).toBe(3); // Sweep + Blip-Punkt + Blip-Ring
    expect(contained[0].style.animation).toMatch(/fx-sweep/);
    expect(contained.some((l) => /fx-blip-dot/.test(l.style.animation))).toBe(true);
    expect(contained.some((l) => /fx-blip-ring/.test(l.style.animation))).toBe(true);
    // alle uebrigen Schleifen bleiben sanft (nur opacity)
    for (const l of Array.from(container.querySelectorAll<HTMLElement>(".fx-loop:not(.fx-contained)"))) {
      expect(l.classList.contains("fx-soft")).toBe(true);
    }
    // zwei HTML-Ringe + ein SVG-Ring werden weiterhin gerendert
    expect(container.querySelectorAll("span.rounded-full[style*='1.5px solid']").length).toBe(2);
    expect(container.querySelectorAll("svg circle").length).toBe(1);
    expect(container.querySelector(".sr-only")?.textContent).toBe("20–30×");
    expect(container.textContent).toContain("Ein kurzer Satz.");
  });
});

describe("Live-Wechsel von prefers-reduced-motion (ohne Neuladen)", () => {
  const original = window.matchMedia;
  let reduce = false;
  const listeners = new Set<() => void>();
  beforeEach(() => {
    reduce = false;
    listeners.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => {
        const isReduce = query.includes("prefers-reduced-motion");
        return {
          get matches() {
            return isReduce ? reduce : false;
          },
          media: query,
          onchange: null,
          addListener: (fn: () => void) => isReduce && listeners.add(fn),
          removeListener: (fn: () => void) => listeners.delete(fn),
          addEventListener: (_: string, fn: () => void) => isReduce && listeners.add(fn),
          removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
          dispatchEvent: () => true,
        };
      },
    });
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it("Ueberschriften-Zeilen behalten keinen Masken-Versatz, wenn reduce live eingeschaltet wird", () => {
    const { container } = render(<SectionHeader eyebrow="Eyebrow" lines={["Zeile eins", "Zeile zwei"]} lead="Lead." />);
    const before = container.querySelector<HTMLElement>("h2 [data-fx-reveal]");
    expect(before?.style.transform).toContain("105%");
    act(() => {
      reduce = true;
      listeners.forEach((fn) => fn());
    });
    const lines = Array.from(container.querySelectorAll<HTMLElement>("h2 [data-fx-reveal]"));
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l.style.transform).not.toContain("105%");
    expect(container.querySelector("h2")?.textContent).toBe("Zeile eins Zeile zwei");
  });
});
