// Übermittlung abgeschlossener Fragebögen an einen externen Endpunkt.
//
// ────────────────────────────────────────────────────────────────────────────
//  HIER EINTRAGEN — ohne Endpunkt wird nichts übermittelt, die Seite läuft
//  aber unverändert weiter (Download und Mail funktionieren wie bisher).
// ────────────────────────────────────────────────────────────────────────────
//
//  Variante A · FormSubmit (kein Konto nötig, schickt jede Antwort als Mail)
//    ENDPOINT = "https://formsubmit.co/ajax/adrian.bohrer@unisg.ch"
//    Die allererste Übermittlung löst eine Bestätigungsmail aus. Erst nach
//    dem Klick darin kommen weitere Antworten an — vorher gehen sie verloren.
//    Also nach dem Eintragen einmal selbst durchklicken und bestätigen.
//
//  Variante B · Formspree (Konto nötig, Dashboard und CSV-Export)
//    ENDPOINT = "https://formspree.io/f/<deine-form-id>"
//
//  Variante C · eigener Webhook (n8n, Make, Power Automate, Zapier)
//    ENDPOINT = "<deine Webhook-URL>"
//
//  Variante D · Supabase, EU-Region, nur INSERT erlaubt
//    ENDPOINT = "https://<projekt>.supabase.co/rest/v1/responses"
//    HEADERS  = { apikey: "<anon key>", Authorization: "Bearer <anon key>",
//                 Prefer: "return=minimal" }
//    Der anon key ist öffentlich lesbar — die Row-Level-Security-Regel der
//    Tabelle MUSS ausschließlich INSERT erlauben, sonst kann jeder alle
//    Antworten auslesen.
//
export const ENDPOINT = "";
export const HEADERS: Record<string, string> = {};

const QUEUE = "cds13-queue";

export type SubmitState = "off" | "pending" | "ok" | "failed";

// Fehlgeschlagene Übermittlungen bleiben lokal liegen und werden beim nächsten
// Seitenaufruf erneut versucht. Ohne das gehen Antworten bei einem kurzen
// Netzaussetzer oder einem pausierten Backend still verloren.
function readQueue(): any[] {
  try { return JSON.parse(localStorage.getItem(QUEUE) || "[]"); } catch { return []; }
}
function writeQueue(q: any[]) {
  try { localStorage.setItem(QUEUE, JSON.stringify(q.slice(-20))); } catch { /* Speicher voll */ }
}

async function post(payload: any): Promise<boolean> {
  if (!ENDPOINT) return false;
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...HEADERS },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch {
    return false;   // Netzfehler, CORS, blockiert
  }
}

export function isEnabled(): boolean {
  return ENDPOINT.length > 0;
}

// Beim Laden der Seite liegengebliebene Datensätze nachreichen.
export async function flushQueue(): Promise<void> {
  if (!isEnabled()) return;
  const q = readQueue();
  if (!q.length) return;
  const rest: any[] = [];
  for (const p of q) {
    const ok = await post(p);
    if (!ok) rest.push(p);
  }
  writeQueue(rest);
}

export async function submitResult(payload: any): Promise<SubmitState> {
  if (!isEnabled()) return "off";
  const ok = await post(payload);
  if (!ok) {
    writeQueue([...readQueue(), payload]);
    return "failed";
  }
  return "ok";
}

// Zufällige Kennung je Durchlauf. Erlaubt es, Teilabbrüche und wiederaufgenommene
// Durchläufe auseinanderzuhalten, ohne eine Person zu identifizieren.
export function newResponseId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* ältere Browser */ }
  return "r-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
