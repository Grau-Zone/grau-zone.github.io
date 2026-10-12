import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import GlassBackground from "@/components/GlassBackground";
import RadarMark from "@/components/RadarMark";
import { usePrintFinish } from "@/components/fx";
import Index from "./pages/Index.tsx";

// Die Startseite bleibt im Hauptbundle, alle anderen Routen kommen als eigene
// Chunks. So laedt die Startseite den Fragebogen samt Vergleichsdaten nicht mit.
const Assessment = lazy(() => import("./pages/Assessment.tsx"));
const Impressum = lazy(() => import("./pages/Impressum.tsx"));
const Awf = lazy(() => import("./pages/Awf.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// QueryClientProvider, TooltipProvider, Toaster und Sonner sind entfallen:
// Nichts ausserhalb von src/components/ui nutzt useQuery, Tooltip oder toast().
// Die Provider kosteten rund 120 KB im Hauptbundle der Startseite.

function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// So lange wartet ScrollToHash auf das Ziel. Lazy Routen (z. B.
// /impressum#kontaktliste) erscheinen erst, wenn ihr Chunk geladen ist; das
// kann im Mobilnetz deutlich laenger als eine Sekunde dauern.
const HASH_WAIT_MS = 10_000;

// Scrollt nach einem Routenwechsel zur Sektion im Hash (z. B. /#organisationen),
// sonst nach oben. React Router macht das nicht von selbst.
function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const scrollToEl = (el: HTMLElement) =>
      el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

    const el = document.getElementById(id);
    if (el) {
      scrollToEl(el);
      return;
    }

    // Ziel fehlt noch (lazy Route laedt): warten, bis es im DOM auftaucht.
    // Scrollt die Nutzerin in der Zwischenzeit selbst, wird nicht mehr gesprungen.
    let done = false;
    let timer = 0;
    const observer = new MutationObserver(() => {
      const target = document.getElementById(id);
      if (target) {
        stop();
        scrollToEl(target);
      }
    });
    function stop() {
      if (done) return;
      done = true;
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    }
    observer.observe(document.body, { childList: true, subtree: true });
    timer = window.setTimeout(stop, HASH_WAIT_MS);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return stop;
  }, [pathname, hash]);
  return null;
}

// ─── Chunk-Fehler ──────────────────────────────────────────────────────────
// Lazy Routen sind eigene Chunks. Nach einem Deploy existieren die alten
// Hashes nicht mehr (404.html liefert dann HTML), im Funkloch bricht der Abruf
// ab. React.lazy wirft dann beim Rendern; ohne Boundary bliebe eine weisse Seite.

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|not a valid JavaScript MIME type/i;

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_ERROR_RE.test(text);
}

// Einmaliges Neuladen holt die aktuelle index.html mit den neuen Chunk-Namen.
// Der Zeitstempel in sessionStorage verhindert eine Reload-Schleife, falls der
// Fehler auch nach dem Neuladen bleibt. Offline wird nicht neu geladen.
const RELOAD_KEY = "fx-chunk-reload-at";
const RELOAD_GUARD_MS = 10_000;

function canReloadForChunkError(): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    return Date.now() - last > RELOAD_GUARD_MS;
  } catch {
    return false;
  }
}

function reloadForChunkError(): boolean {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Rueckfall, wenn Neuladen nicht hilft. Nur vorhandener Text (wie NotFound);
// der Link laedt die Startseite vollstaendig neu, damit frische Chunks kommen.
function ErrorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <RadarMark size={44} />
      <a
        href={import.meta.env.BASE_URL}
        className="inline-flex items-center gap-2 mt-8"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "15px",
          fontWeight: 500,
          padding: "13px 24px",
          borderRadius: "10px",
          border: "1px solid rgba(75,110,255,0.45)",
          background: "rgba(75,110,255,0.18)",
          color: "#a8bcff",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Zur Startseite
      </a>
    </div>
  );
}

type BoundaryProps = { resetKey: string; children: ReactNode };
type BoundaryState = { failed: boolean; reloading: boolean };

class RouteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, reloading: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { failed: true, reloading: isChunkLoadError(error) && canReloadForChunkError() };
  }

  componentDidCatch() {
    // Ohne gesetzten Schutz kein Reload (Schleifengefahr), dann der Rueckfall.
    if (this.state.reloading && !reloadForChunkError()) this.setState({ reloading: false });
  }

  componentDidUpdate(prev: BoundaryProps) {
    // Neue Route (z. B. Zurueck-Taste): erneut versuchen.
    if (this.state.failed && !this.state.reloading && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false, reloading: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.state.reloading) return <div className="min-h-screen" />;
    return <ErrorFallback />;
  }
}

function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary resetKey={pathname}>{children}</RouteErrorBoundary>;
}

// Vor dem Drucken springen alle laufenden Animationen auf ihren Endzustand.
function PrintFinish() {
  usePrintFinish();
  return null;
}

const App = () => (
  <MotionConfig reducedMotion="user">
    <GlassBackground />
    <PrintFinish />
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToHash />
      <RouteBoundary>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/awf" element={<Awf />} />
            {/* Das Dashboard gibt es nicht mehr (06.10.2026); alte Links fuehren zum Self-Assessment. */}
            <Route path="/dashboard" element={<Navigate to="/assessment" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteBoundary>
    </BrowserRouter>
  </MotionConfig>
);

export default App;
