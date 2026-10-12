import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { setPausedAll, usePausedAll } from "./pause";

export const PAUSE_TOGGLE_LABELS = {
  de: { pause: "Animationen anhalten", resume: "Animationen fortsetzen" },
  en: { pause: "Pause animations", resume: "Resume animations" },
} as const;

function docIsEn(): boolean {
  try {
    if (typeof document === "undefined") return false;
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  } catch {
    return false;
  }
}

/** Folgt document.documentElement.lang (auch wenn es sich spaeter aendert). */
function useDocIsEn(): boolean {
  const [en, setEn] = useState(docIsEn);
  useEffect(() => {
    setEn(docIsEn());
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
    const mo = new MutationObserver(() => setEn(docIsEn()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => mo.disconnect();
  }, []);
  return en;
}

export interface PauseToggleProps {
  /**
   * Sprache der Beschriftung. Ohne Angabe: Englisch, wenn
   * document.documentElement.lang mit "en" beginnt, sonst Deutsch.
   * (Die Ergebnisseite uebergibt ihre Umfragesprache, da html lang dort "de" bleibt.)
   */
  lang?: string;
  className?: string;
}

/**
 * Pause-Knopf fuer alle Endlosanimationen (WCAG 2.2.2). Unsichtbar
 * (sr-only-Technik), bis er Tastaturfokus hat; dann eine kleine Pille oben
 * links (.fx-pause-toggle in index.css). Als ERSTES fokussierbares Element
 * der Seite einsetzen. Erscheint auch bei reduzierter Bewegung.
 */
export function PauseToggle({ lang, className }: PauseToggleProps) {
  const paused = usePausedAll();
  const docEn = useDocIsEn();
  const en = lang ? lang.toLowerCase().startsWith("en") : docEn;
  const t = en ? PAUSE_TOGGLE_LABELS.en : PAUSE_TOGGLE_LABELS.de;
  return (
    <button
      type="button"
      // Kein aria-pressed: Die Beschriftung wechselt schon mit dem Zustand
      // (WAI-ARIA Button Pattern: entweder wechselnder Text oder aria-pressed).
      onClick={() => setPausedAll(!paused)}
      className={cn("fx-pause-toggle", className)}
    >
      {paused ? t.resume : t.pause}
    </button>
  );
}
