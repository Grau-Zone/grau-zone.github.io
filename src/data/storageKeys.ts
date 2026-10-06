// Schluessel, unter denen das Self-Assessment seinen Stand im Browser ablegt.
// Geteilt mit dem Dashboard, das daraus die eigenen Werte zeigt, ohne etwas zu
// uebertragen.
export const LS = {
  lang: "cds13-lang",
  ans: "cds13-answers",
  phase: "cds13-phase",
  block: "cds13-block",
  intake: "cds13-intake",
  rid: "cds13-rid",
  consent: "cds13-consent",
  code: "cds13-code",      // Ergebnis-Code, mit dem sich jemand auf /dashboard angemeldet hat
} as const;

// Lesen darf nie werfen: in fremden iframes oder bei gesperrtem Speicher wirft
// schon der Zugriff auf localStorage.
export function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
