// 404. Lag vorher als ungestyltes shadcn-Standardmarkup auf Englisch vor, mit
// hellem Hintergrund mitten in einer durchgehend dunklen Seite.
//
// Der Ruecksprung war ein rohes <a href="/">. Der Router laeuft mit
// basename={import.meta.env.BASE_URL}; ein solcher Link umgeht ihn und landet
// bei einem Deployment unter einem Unterpfad im Leeren.
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Aufruf einer nicht vorhandenen Route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(228 45% 4%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <RadarMark size={44} />

        <div
          className="mt-7 text-xs font-semibold tracking-[0.2em] uppercase"
          style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Fehler 404
        </div>

        <h1
          className="mt-3 text-3xl lg:text-4xl font-semibold text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
        >
          Diese Seite gibt es nicht.
        </h1>

        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Inter', sans-serif", maxWidth: "44ch" }}
        >
          Vielleicht ist der Link veraltet oder hat sich ein Tippfehler eingeschlichen.
        </p>

        <Link
          to="/"
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
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
};

export default NotFound;
