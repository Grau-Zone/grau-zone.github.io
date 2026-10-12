import { useSyncExternalStore } from "react";

/**
 * Globaler Pause-Zustand fuer alle Endlosanimationen (WCAG 2.2.2), gesetzt
 * ueber den PauseToggle. Unabhaengig von prefers-reduced-motion.
 *
 * - gespeichert in localStorage 'fx-paused' ("1"/"0"); jeder Zugriff in
 *   try/catch (privates Fenster, blockierter Speicher)
 * - gespiegelt als html[data-fx-paused="true"|"false"]; index.css haelt damit
 *   alle CSS-Schleifen (.fx-loop, .fx-halo, .fx-float, .fx-drop, Aurora) an
 * - usePauseOffscreen beruecksichtigt den Zustand automatisch
 */

export const FX_PAUSED_KEY = "fx-paused";

let paused: boolean | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function readStored(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    return window.localStorage.getItem(FX_PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

function mirror(value: boolean) {
  try {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.fxPaused = value ? "true" : "false";
  } catch {
    /* ignorieren */
  }
}

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ein fehlerhafter Listener stoppt die anderen nicht */
    }
  });
}

function bindStorage() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  // Andere Tabs: Umschalten dort gilt auch hier.
  window.addEventListener("storage", (e) => {
    if (e.key !== FX_PAUSED_KEY) return;
    const next = e.newValue === "1";
    if (next === paused) return;
    paused = next;
    mirror(next);
    emit();
  });
}

/** Aktueller Pause-Zustand (ohne React). */
export function getPausedAll(): boolean {
  if (paused === null) {
    paused = readStored();
    mirror(paused);
    bindStorage();
  }
  return paused;
}

/** Setzt den Pause-Zustand, speichert ihn und benachrichtigt alle Hooks. */
export function setPausedAll(value: boolean): void {
  const next = !!value;
  getPausedAll();
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(FX_PAUSED_KEY, next ? "1" : "0");
    }
  } catch {
    /* Speicher blockiert: gilt dann nur fuer diese Sitzung */
  }
  if (next === paused) {
    mirror(next);
    return;
  }
  paused = next;
  mirror(next);
  emit();
}

/** Abonniert Aenderungen des Pause-Zustands; liefert die Abmeldung. */
export function subscribePausedAll(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reaktiver Pause-Zustand (true = alle Endlosanimationen stehen). */
export function usePausedAll(): boolean {
  return useSyncExternalStore(subscribePausedAll, getPausedAll, () => false);
}

/** Nur fuer Tests: vergisst den zwischengespeicherten Zustand. */
export function resetPausedAllForTests(): void {
  paused = null;
}

// Beim Laden des Moduls spiegeln, damit die CSS-Regel ab dem ersten Paint greift.
if (typeof document !== "undefined") getPausedAll();
