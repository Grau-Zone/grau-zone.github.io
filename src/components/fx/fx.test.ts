import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { formatCountable, parseCountable } from "./CountUp";
import { BREATHE_S, DUR, PING_SOFT_MAX_SCALE, pingScales, sweepDelay, withAlpha } from "./motion";
import {
  FX_PAUSED_KEY,
  getPausedAll,
  resetPausedAllForTests,
  setPausedAll,
  subscribePausedAll,
} from "./pause";

describe("parseCountable", () => {
  const countable = [
    "70%",
    "93%",
    "3",
    "15%",
    "8,5 Mio. €",
    "13,8 Mrd. $",
    "100.000 GPUs",
    "+9,3%",
    "40+ Mrd. €",
    "190+",
    "18 Mon.",
    "54 %",
    "1,9 Mrd. €",
  ];

  it.each(countable)("formatiert '%s' exakt zurueck", (value) => {
    const c = parseCountable(value);
    expect(c).not.toBeNull();
    expect(formatCountable(c!, c!.n)).toBe(value);
  });

  it("liest Teile korrekt", () => {
    expect(parseCountable("8,5 Mio. €")).toEqual({ prefix: "", n: 8.5, decimals: 1, grouped: false, suffix: " Mio. €" });
    expect(parseCountable("100.000 GPUs")).toEqual({ prefix: "", n: 100000, decimals: 0, grouped: true, suffix: " GPUs" });
    expect(parseCountable("+9,3%")).toEqual({ prefix: "+", n: 9.3, decimals: 1, grouped: false, suffix: "%" });
  });

  it.each(["20–30×", "Jan. 2025", "Sep. 2025", "", "abc"])("liefert null fuer '%s'", (value) => {
    expect(parseCountable(value)).toBeNull();
  });

  it("Zwischenwerte behalten Format und Dezimalen", () => {
    const c = parseCountable("1,9 Mrd. €")!;
    expect(formatCountable(c, 0)).toBe("0,0 Mrd. €");
    const g = parseCountable("100.000 GPUs")!;
    expect(formatCountable(g, 12345)).toBe("12.345 GPUs");
  });
});

describe("sweepDelay", () => {
  it("rechnet Winkel ab 12 Uhr im Uhrzeigersinn in Sekunden um", () => {
    expect(sweepDelay(0, 8)).toBe(0);
    expect(sweepDelay(120, 8)).toBeCloseTo(2.667, 3);
    expect(sweepDelay(240, 8)).toBeCloseTo(5.333, 3);
  });

  it("ist immer positiv und periodisch", () => {
    expect(sweepDelay(-90, 6)).toBeCloseTo(4.5, 6);
    expect(sweepDelay(360, 6)).toBe(0);
    expect(sweepDelay(450, 6)).toBeCloseTo(1.5, 6);
  });
});

describe("withAlpha", () => {
  it("versteht Hex, Tripel und sonstige Farben", () => {
    expect(withAlpha("#4B6EFF", 0.5)).toBe("rgba(75,110,255,0.5)");
    expect(withAlpha("#fff", 1)).toBe("rgba(255,255,255,1)");
    expect(withAlpha("139,164,255", 0.2)).toBe("rgba(139,164,255,0.2)");
    expect(withAlpha("var(--x)", 0.25)).toBe("color-mix(in srgb, var(--x) 25%, transparent)");
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

describe("Pause-Zustand (fx-paused)", () => {
  beforeEach(() => {
    installStorage();
  });
  afterEach(() => {
    installStorage();
    delete document.documentElement.dataset.fxPaused;
    resetPausedAllForTests();
  });

  it("startet ohne gespeicherten Wert unpausiert und spiegelt ans html", () => {
    resetPausedAllForTests();
    expect(getPausedAll()).toBe(false);
    expect(document.documentElement.dataset.fxPaused).toBe("false");
  });

  it("liest den gespeicherten Wert '1'", () => {
    window.localStorage.setItem(FX_PAUSED_KEY, "1");
    resetPausedAllForTests();
    expect(getPausedAll()).toBe(true);
    expect(document.documentElement.dataset.fxPaused).toBe("true");
  });

  it("setPausedAll speichert, spiegelt und benachrichtigt", () => {
    resetPausedAllForTests();
    const calls: boolean[] = [];
    const off = subscribePausedAll(() => calls.push(getPausedAll()));
    setPausedAll(true);
    expect(window.localStorage.getItem(FX_PAUSED_KEY)).toBe("1");
    expect(document.documentElement.dataset.fxPaused).toBe("true");
    setPausedAll(true); // unveraendert: keine weitere Meldung
    setPausedAll(false);
    expect(window.localStorage.getItem(FX_PAUSED_KEY)).toBe("0");
    expect(document.documentElement.dataset.fxPaused).toBe("false");
    off();
    setPausedAll(true);
    expect(calls).toEqual([true, false]);
  });

  it.each(["throwing-methods", "throwing-access"] as const)("uebersteht einen werfenden localStorage (%s)", (mode) => {
    installStorage(mode);
    resetPausedAllForTests();
    expect(getPausedAll()).toBe(false);
    expect(() => setPausedAll(true)).not.toThrow();
    expect(getPausedAll()).toBe(true);
    expect(document.documentElement.dataset.fxPaused).toBe("true");
    expect(() => setPausedAll(false)).not.toThrow();
    expect(getPausedAll()).toBe(false);
  });

  it("andere Tabs schalten ueber das storage-Ereignis mit", () => {
    resetPausedAllForTests();
    expect(getPausedAll()).toBe(false);
    window.dispatchEvent(new StorageEvent("storage", { key: FX_PAUSED_KEY, newValue: "1" }));
    expect(getPausedAll()).toBe(true);
  });
});

describe("sanfte Stufe: Grenzwerte", () => {
  it("Pings wachsen reduziert hoechstens auf 1.15", () => {
    expect(pingScales(1, 3.2, false)).toEqual([1, 3.2]);
    expect(pingScales(1, 3.2, true)).toEqual([1, PING_SOFT_MAX_SCALE]);
    expect(pingScales(0.4, 4, true)).toEqual([0.4, 1.15]);
    expect(pingScales(1.6, 3, true)).toEqual([1, 1.15]);
    expect(pingScales(1, 1, true)).toEqual([1, 1]);
  });

  it("Opacity-Schleifen atmen mit Periode >= 2 s, Crossfade ca. 300 ms", () => {
    expect(BREATHE_S).toBeGreaterThanOrEqual(2);
    expect(DUR.fade).toBeCloseTo(0.3, 5);
  });
});
