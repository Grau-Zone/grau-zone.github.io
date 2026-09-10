// Kontaktliste des 55. Anwenderforums des IWI-HSG.
//
// Getrennt vom Self-Assessment: dort wird ausdruecklich keine E-Mail-Adresse
// erhoben. Hier ist die Adresse der einzige Zweck, und die Einwilligung dafuer
// wird auf der Seite /awf eingeholt.
//
// ────────────────────────────────────────────────────────────────────────────
//  TABELLE IN SUPABASE ANLEGEN (einmalig, SQL-Editor)
// ────────────────────────────────────────────────────────────────────────────
//
//  create table public.awf_contacts (
//    id              uuid        primary key default gen_random_uuid(),
//    email           text        not null,
//    event           text        not null default 'awf55',
//    consent_version text        not null default 'awf55-v1',
//    created_at      timestamptz not null default now(),
//    constraint awf_contacts_email_format check (
//      char_length(email) between 6 and 254
//      and email = lower(btrim(email))
//      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
//    ),
//    constraint awf_contacts_event_format   check (event ~ '^[a-z0-9-]{1,32}$'),
//    constraint awf_contacts_version_format check (consent_version ~ '^[a-z0-9-]{1,32}$')
//  );
//
//  alter table public.awf_contacts enable row level security;
//
//  -- Supabase vergibt beim Anlegen ALL an anon. Ohne REVOKE liefert SELECT eine
//  -- leere Liste mit HTTP 200 statt 401, und anon koennte id und created_at
//  -- selbst setzen. Das Spaltengrant erlaubt nur die drei fachlichen Felder.
//  revoke all on table public.awf_contacts from anon, authenticated;
//  grant insert (email, event, consent_version) on table public.awf_contacts to anon;
//
//  create policy awf_contacts_insert_anon
//    on public.awf_contacts for insert to anon with check (true);
//
//  -- Export mit Dublettenbereinigung. Das "desc" ist wesentlich: distinct on
//  -- behaelt die erste Zeile der Sortierung. Ohne desc waere das die aelteste
//  -- Einwilligung, also bei einer geaenderten Adresse die ueberholte.
//  -- event und consent_version sind der Nachweis, wozu eingewilligt wurde, und
//  -- gehoeren deshalb in den Export.
//  -- select distinct on (email) email, event, consent_version, created_at
//  -- from public.awf_contacts order by email, created_at desc;
//
// BEWUSST OHNE UNIQUE AUF email: Der publishable key ist oeffentlich. Mit einer
// Eindeutigkeitsbedingung koennte jeder per POST pruefen, ob eine beliebige
// Adresse in der Liste steht (201 gegen 409). Das waere ein Mitgliedschafts-
// Orakel fuer personenbezogene Daten. Doppelte Eintraege verhindert der Client,
// Reste bereinigt der Export.
import { HEADERS, REST_BASE } from "./submit";

export const AWF_ENDPOINT = REST_BASE + "/awf_contacts";

/** Veranstaltung, fuer die die Einwilligung gilt. */
export const AWF_EVENT = "awf55";

/** Fassung des Einwilligungstexts. Aendert sich der Text, hochzaehlen: der
 *  gespeicherte Wert ist der Nachweis, wozu genau eingewilligt wurde. */
export const AWF_CONSENT_VERSION = "awf55-v1";

const LS_KEY = "awf55-contact";

export type AwfChoice =
  | { choice: "yes"; email: string; at: string; v: string }
  | { choice: "no"; at: string; v: string };

export type AwfSubmitState = "ok" | "rejected" | "failed";

/** Trimmen und kleinschreiben. Die Datenbank erzwingt dieselbe Normalform, damit
 *  "Max@Firma.ch" und "max@firma.ch" nicht als zwei Personen in der Liste landen. */
export const normalizeEmail = (v: string) => v.trim().toLowerCase();

/** Absichtlich grosszuegig: eine strengere Pruefung wuerde gueltige Adressen
 *  abweisen, und ob die Adresse wirklich existiert, zeigt ohnehin erst die
 *  erste Mail. */
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Entscheidung aus dem Browser lesen. Defekter Inhalt gilt als "nichts
 *  gespeichert", damit ein kaputter Eintrag die Seite nicht blockiert. */
export function readChoice(): AwfChoice | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Andere Fassung des Einwilligungstexts: erneut fragen. Sonst blieben alle
    // Wiederkehrenden auf der alten Entscheidung, und die gespeicherte Version
    // wuerde nur noch dokumentieren, was frueher einmal galt.
    if (d?.v !== AWF_CONSENT_VERSION) return null;
    if (d.choice === "no") return d as AwfChoice;
    // Die leere Zeichenkette besteht eine reine typeof-Pruefung und fuehrt zu
    // einer Bestaetigung ohne Adresse darin.
    if (d.choice === "yes" && typeof d.email === "string" && isValidEmail(d.email)) {
      return d as AwfChoice;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeChoice(c: AwfChoice): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch {
    /* privates Fenster oder Speicher voll: die Frage erscheint dann erneut */
  }
}

/** Eigene Fetch-Funktion statt der aus submit.ts: dort ist post() an die
 *  Antworten-Tabelle, an toBody und an die Warteschlange gebunden und liefert
 *  nur true oder false. Hier wird der Unterschied zwischen "abgelehnt" (4xx,
 *  erneutes Senden hilft nicht) und "fehlgeschlagen" (Netz oder 5xx, erneutes
 *  Senden hilft) gebraucht. */
export async function submitAwfContact(email: string): Promise<AwfSubmitState> {
  try {
    const r = await fetch(AWF_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...HEADERS },
      body: JSON.stringify({
        email,
        event: AWF_EVENT,
        consent_version: AWF_CONSENT_VERSION,
      }),
    });
    if (r.ok) return "ok";
    // Nur diese drei Codes bedeuten "an der Eingabe liegt es". 401, 403, 404 und
    // 5xx liegen an uns; dort waere der Rat, die Schreibweise zu pruefen, falsch.
    return r.status === 400 || r.status === 409 || r.status === 422 ? "rejected" : "failed";
  } catch {
    return "failed"; // Netzfehler, CORS, blockiert
  }
}
