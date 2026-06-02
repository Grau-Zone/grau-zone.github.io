import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Radar, TrendingUp, Building, Layers, Home,
  ArrowRight, ArrowLeft, RotateCcw, Info, AlertTriangle, Shield,
  Download, FileJson,
  type LucideIcon,
} from "lucide-react";
import { jsPDF } from "jspdf";
import CapacityRadar, { CAPACITIES, LEVELS } from "../components/CapacityRadar";
import ConsultingCTA from "../components/ConsultingCTA";
import {
  surveyBlocks,
  totalQuestionCount,
  likertScale,
  notAssessableValue,
  contextFactorLabels,
  enablerLabels,
  type LikertQuestion,
  type ChoiceQuestion,
  type SurveyBlock,
} from "../data/assessmentQuestions";

type Answers = Record<string, number | string>;

const icons: Record<string, LucideIcon> = {
  Radar, Layers, TrendingUp, Building,
};

// Capacity dimension keys in the same order as CapacityRadar AXES / CAPACITIES
const CAP_DIMS = ["SW", "IN", "MS", "NE"] as const;

// ─── Score Calculation ─────────────────────────────────────────────────────────

function getAllLikertItems(): LikertQuestion[] {
  const items: LikertQuestion[] = [];
  for (const block of surveyBlocks) {
    for (const group of block.groups) {
      for (const q of group.questions) {
        if (q.type === "likert") items.push(q);
      }
    }
  }
  return items;
}

function rawMeanByDimension(answers: Answers, dim: string): number | null {
  const items = getAllLikertItems().filter((q) => q.dimension === dim);
  const vals = items
    .map((q) => {
      const v = answers[q.id];
      if (typeof v !== "number" || v === notAssessableValue) return null;
      return q.reversed ? 6 - v : v; // reverse negatively worded items
    })
    .filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function calculateScores(answers: Answers) {
  // Capacity scores (0..1); null when the capacity has no answered items
  const capacityScores: Record<string, number | null> = {};
  for (const dim of CAP_DIMS) {
    const raw = rawMeanByDimension(answers, dim);
    capacityScores[dim] = raw == null ? null : (raw - 1) / 4;
  }

  // Radar needs a number per axis — unanswered capacities collapse to 0 (centre)
  const radarValues: number[] = CAP_DIMS.map((d) => capacityScores[d] ?? 0);
  // indices of capacities that were actually answered
  const answeredIdxs = CAP_DIMS.map((d, i) => (capacityScores[d] != null ? i : -1)).filter((i) => i >= 0);
  const anyCapacityAnswered = answeredIdxs.length > 0;

  // Ø and max-logic are computed over answered capacities only (null if none)
  const answeredVals = answeredIdxs.map((i) => radarValues[i]);
  const overall: number | null = answeredVals.length
    ? answeredVals.reduce((a, b) => a + b, 0) / answeredVals.length
    : null;
  const maxCapacityScore: number | null = answeredVals.length ? Math.max(...answeredVals) : null;
  // all answered capacities tied for the maximum (epsilon for float safety)
  const strongestIdxs = maxCapacityScore == null
    ? []
    : answeredIdxs.filter((i) => Math.abs(radarValues[i] - maxCapacityScore) < 1e-9);
  const strongestIdx = strongestIdxs.length ? strongestIdxs[0] : 0;

  // Outcome scores — null when unanswered (no fabricated value)
  const outcomeScores: Record<string, number | null> = {};
  for (const dim of ["TCO", "HU", "FLX", "INN"]) {
    const raw = rawMeanByDimension(answers, dim);
    outcomeScores[dim] = raw == null ? null : (raw - 1) / 4;
  }

  // Criticality gate (raw 1..5) — item A3 carries dimension "K"
  const critRaw = rawMeanByDimension(answers, "K");
  const lowCriticality = critRaw != null && critRaw < 2.5;

  // Context factors (Ebene A) and enablers (Ebene B) — raw 1..5 per item, kept for the profile
  const rawOf = (id: string): number | null => {
    const v = answers[id];
    return typeof v === "number" && v !== notAssessableValue ? v : null;
  };
  const contextFactors: Record<string, number | null> = {};
  for (const id of Object.keys(contextFactorLabels)) contextFactors[id] = rawOf(id);
  const enablers: Record<string, number | null> = {};
  for (const id of Object.keys(enablerLabels)) enablers[id] = rawOf(id);

  // Control variables
  const controlAnswers: Record<string, string> = {};
  for (const block of surveyBlocks) {
    for (const group of block.groups) {
      for (const q of group.questions) {
        if (q.type === "choice" && typeof answers[q.id] === "string") {
          controlAnswers[q.id] = answers[q.id] as string;
        }
      }
    }
  }

  // Perceived vs. enabled: hohe Capacity-Selbsteinschätzung trotz schwacher Enabler-Basis
  // ist ein Überschätzungs-Signal und wird als eigener Hinweis ausgewiesen.
  const capRaws = CAP_DIMS.map((d) => rawMeanByDimension(answers, d)).filter(
    (v): v is number => v !== null
  );
  const capacityMeanRaw = capRaws.length ? capRaws.reduce((a, b) => a + b, 0) / capRaws.length : null;
  const enablerRaws = Object.values(enablers).filter((v): v is number => v !== null);
  const enablerMeanRaw = enablerRaws.length ? enablerRaws.reduce((a, b) => a + b, 0) / enablerRaws.length : null;
  const perceivedVsEnabledGap =
    capacityMeanRaw != null && enablerMeanRaw != null ? capacityMeanRaw - enablerMeanRaw : null;
  const overconfident =
    capacityMeanRaw != null && enablerMeanRaw != null &&
    capacityMeanRaw >= 3.5 && enablerMeanRaw <= 2.5 && capacityMeanRaw - enablerMeanRaw >= 1.5;

  return {
    radarValues, overall, capacityScores, outcomeScores,
    maxCapacityScore, strongestIdx, strongestIdxs, anyCapacityAnswered, critRaw, lowCriticality,
    contextFactors, enablers, controlAnswers,
    capacityMeanRaw, enablerMeanRaw, perceivedVsEnabledGap, overconfident,
  };
}

function getSovereigntyLevel(overall: number) {
  const idx = LEVELS.findIndex((lvl) => overall < lvl.max);
  const index = idx === -1 ? LEVELS.length - 1 : idx;
  return { index, level: LEVELS[index] };
}

function countAnswered(block: SurveyBlock, answers: Answers): number {
  let count = 0;
  for (const group of block.groups) {
    for (const q of group.questions) {
      if (answers[q.id] != null) count++;
    }
  }
  return count;
}

function countTotal(block: SurveyBlock): number {
  return block.groups.reduce((s, g) => s + g.questions.length, 0);
}

// ─── Likert Button Row ─────────────────────────────────────────────────────────

function LikertButtons({
  question,
  value,
  color,
  onAnswer,
}: {
  question: LikertQuestion;
  value: number | undefined;
  color: string;
  onAnswer: (id: string, value: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {likertScale.map((s) => {
        const isActive = value === s.value;
        return (
          <button
            key={s.value}
            onClick={() => onAnswer(question.id, s.value)}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "11px",
              padding: "7px 12px",
              borderRadius: "7px",
              border: `1px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
              background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
              color: isActive ? color : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.15s",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {s.label}
          </button>
        );
      })}
      <button
        onClick={() => onAnswer(question.id, notAssessableValue)}
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "11px",
          padding: "7px 12px",
          borderRadius: "7px",
          border: `1px solid ${value === notAssessableValue ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"}`,
          background: value === notAssessableValue ? "rgba(255,255,255,0.06)" : "transparent",
          color: value === notAssessableValue ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.5)",
          cursor: "pointer",
          transition: "all 0.15s",
          fontStyle: "italic",
        }}
      >
        Nicht beurteilbar
      </button>
    </div>
  );
}

// ─── Choice Buttons ────────────────────────────────────────────────────────────

function ChoiceButtons({
  question,
  value,
  color,
  onAnswer,
}: {
  question: ChoiceQuestion;
  value: string | undefined;
  color: string;
  onAnswer: (id: string, value: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {question.options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onAnswer(question.id, opt.value)}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: `1px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
              background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
              color: isActive ? color : "rgba(255,255,255,0.55)",
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "left" as const,
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Intro Screen ──────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <div
        style={{
          fontSize: "11px",
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: "rgba(139,164,255,0.6)",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        Organisation Self-Assessment
      </div>
      <h1
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 300,
          fontSize: "clamp(28px, 5vw, 48px)",
          letterSpacing: "-0.025em",
          color: "white",
          marginBottom: "16px",
          lineHeight: 1.15,
        }}
      >
        Wie souverän ist Ihre Organisation?
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.5)",
          maxWidth: "620px",
          fontSize: "15px",
          lineHeight: 1.7,
          marginBottom: "40px",
        }}
      >
        Dieser kurze Fragebogen erfasst die digitale Souveränität Ihrer Organisation entlang von
        vier Capacities — Switching, Internalization, Multi-Sourcing und Negotiation. Sie erhalten
        eine Einordnung in eine von drei Souveränitäts-Stufen mit Auswertung je Capacity.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "40px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {CAPACITIES.map((c) => (
          <div
            key={c.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: c.colorBg,
              border: `1px solid ${c.colorBorder}`,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {c.tag}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
      <button
        onClick={onStart}
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 500,
          fontSize: "15px",
          padding: "14px 32px",
          borderRadius: "10px",
          border: "1px solid rgba(75,110,255,0.4)",
          background: "rgba(75,110,255,0.15)",
          color: "#8ba4ff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(75,110,255,0.25)";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(75,110,255,0.15)";
          e.currentTarget.style.color = "#8ba4ff";
        }}
      >
        Assessment starten <ArrowRight size={16} />
      </button>
      <Link
        to="/"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 500,
          fontSize: "15px",
          padding: "14px 28px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.7)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Home size={16} /> Zur Startseite
      </Link>
      </div>

      <p
        style={{
          marginTop: "24px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {totalQuestionCount} Fragen · ca. 5 Minuten · Keine Daten werden gespeichert
      </p>
    </motion.div>
  );
}

// ─── Block Screen ──────────────────────────────────────────────────────────────

function BlockScreen({
  block,
  blockIndex,
  answers,
  onAnswer,
  onNext,
  onBack,
}: {
  block: SurveyBlock;
  blockIndex: number;
  answers: Answers;
  onAnswer: (id: string, value: number | string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const Icon = icons[block.icon];
  const answered = countAnswered(block, answers);
  const total = countTotal(block);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blockIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-4"
    >
      <div ref={topRef} />

      {/* Global progress */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
        {surveyBlocks.map((b, i) => (
          <div
            key={b.id}
            style={{
              height: "3px",
              flex: 1,
              borderRadius: "2px",
              background:
                i < blockIndex
                  ? "#4B6EFF"
                  : i === blockIndex
                  ? block.color
                  : "rgba(255,255,255,0.08)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        {Icon && <Icon size={20} style={{ color: block.color }} />}
        <span
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontWeight: 600,
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: block.color,
            textTransform: "uppercase",
          }}
        >
          Block {blockIndex + 1} von {surveyBlocks.length}
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "11px",
            color: "rgba(255,255,255,0.5)",
            marginLeft: "auto",
          }}
        >
          {answered}/{total} beantwortet
        </span>
      </div>
      <h2
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 300,
          fontSize: "clamp(22px, 4vw, 34px)",
          color: "white",
          marginBottom: "4px",
          letterSpacing: "-0.025em",
        }}
      >
        {block.title}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px" }}>
        {block.subtitle}
      </p>

      {/* Framing statement */}
      {block.framing && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "10px",
            background: `${block.color}08`,
            border: `1px solid ${block.color}20`,
            marginBottom: "28px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <Info size={16} style={{ color: block.color, marginTop: "2px", flexShrink: 0 }} />
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "13px",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {block.framing}
          </p>
        </div>
      )}

      {/* Question groups */}
      {block.groups.map((group) => (
        <div key={group.title} style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 500,
              fontSize: "14px",
              color: "rgba(255,255,255,0.6)",
              marginBottom: "4px",
            }}
          >
            {group.title}
          </h3>
          {group.description && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginBottom: "12px" }}>
              {group.description}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {group.questions.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: "16px 20px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${
                    answers[q.id] != null ? `${block.color}30` : "rgba(255,255,255,0.05)"
                  }`,
                  transition: "border-color 0.2s",
                }}
              >
                <p
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "14px",
                    lineHeight: 1.55,
                    marginBottom: "12px",
                  }}
                >
                  {q.question}
                </p>

                {q.type === "likert" ? (
                  <LikertButtons
                    question={q}
                    value={answers[q.id] as number | undefined}
                    color={block.color}
                    onAnswer={(id, v) => onAnswer(id, v)}
                  />
                ) : (
                  <ChoiceButtons
                    question={q}
                    value={answers[q.id] as string | undefined}
                    color={block.color}
                    onAnswer={(id, v) => onAnswer(id, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "16px",
          paddingBottom: "48px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "14px",
            padding: "12px 20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ArrowLeft size={14} /> Zurück
        </button>
        <button
          onClick={onNext}
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            padding: "12px 24px",
            borderRadius: "8px",
            border: `1px solid ${block.color}55`,
            background: `${block.color}15`,
            color: block.color,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s",
          }}
        >
          {blockIndex === surveyBlocks.length - 1 ? "Ergebnis anzeigen" : "Weiter"}{" "}
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────

function ResultScreen({ answers, onRestart, onDownloadJSON, onDownloadPDF }: { answers: Answers; onRestart: () => void; onDownloadJSON: () => void; onDownloadPDF: () => void }) {
  const scores = calculateScores(answers);
  const level = scores.maxCapacityScore != null ? getSovereigntyLevel(scores.maxCapacityScore).level : null;
  const accent = level ? level.color : "#8ba4ff";
  const strongestCaps = scores.strongestIdxs.map((i) => CAPACITIES[i]);
  const multiStrongest = strongestCaps.length > 1;
  const strongestCap = strongestCaps[0]; // accent colour for the strongest callout (may be undefined)

  // Stärkste beantwortete Capacity(en) für das personalisierte Consulting-CTA (Max-Logik, inkl.
  // Gleichstände) — konsistent mit der Souveränitäts-Stufe, die ebenfalls die stärkste Capacity nimmt.
  const strongestLabels = strongestCaps.map((c) => c.title);
  const capacityPercents = Object.fromEntries(
    CAP_DIMS.map((d, i) => [
      CAPACITIES[i].tag,
      scores.capacityScores[d] == null ? null : Math.round((scores.capacityScores[d] as number) * 100),
    ])
  );

  // Control variable labels for display
  const controlLabels: Record<string, { label: string; options: Record<string, string> }> = {
    "KV.1": { label: "Mitarbeiterzahl", options: { "<250": "< 250", "250-999": "250–999", "1000-4999": "1.000–4.999", "5000-24999": "5.000–24.999", ">=25000": "≥ 25.000" } },
    "KV.3": { label: "Branche", options: { industry: "Industrie", finance: "Finanzdienstl.", retail: "Handel", tech: "IT & Medien", energy: "Energie", health: "Gesundheit", public: "Öffentlich", logistics: "Logistik", services: "Dienstleistungen" } },
    "KV.6": { label: "Cloud-Reifegrad", options: { pilot: "Pilotprojekte", selective: "Selektiv", "cloud-first-partial": "Cloud-First (teils)", "cloud-first-full": "Cloud-First (voll)", "cloud-native": "Cloud-Native", unknown: "Nicht bekannt" } },
    "KV.7": { label: "Hyperscaler-Provider", options: { "1": "Einer", "2": "Zwei", "3": "Drei", ">3": "Mehr als drei", unknown: "Nicht bekannt" } },
    "KV.8": { label: "Region", options: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", EU: "Übriges EU", UK: "UK", NA: "Nordamerika", other: "Sonstige" } },
  };

  const sectionHeader = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "16px", color: "white", marginBottom: subtitle ? "4px" : "0" }}>
        {title}
      </h3>
      {subtitle && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{subtitle}</p>}
    </div>
  );

  const scoreBar = (label: string, value: number | null, color: string, sublabel?: string, delay = 0.3) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
          {label}
          {sublabel && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginLeft: "8px" }}>{sublabel}</span>}
        </span>
        <span style={{ fontFamily: value == null ? "Inter, sans-serif" : "Space Grotesk, sans-serif", fontSize: value == null ? "12px" : "14px", fontWeight: 600, fontStyle: value == null ? "italic" : "normal", color: value == null ? "rgba(255,255,255,0.4)" : color }}>
          {value == null ? "nicht beantwortet" : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
        {value != null && <motion.div initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }} style={{ height: "100%", borderRadius: "2px", background: color }} />}
      </div>
    </div>
  );

  // Compact bar for context factors / enablers (raw 1..5, or null when unanswered)
  const miniBar = (label: string, raw: number | null, color: string) => {
    const norm = raw == null ? 0 : (raw - 1) / 4;
    return (
      <div key={label}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{label}</span>
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, color: raw == null ? "rgba(255,255,255,0.5)" : color }}>
            {raw == null ? "—" : `${raw}/5`}
          </span>
        </div>
        <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${norm * 100}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100%", borderRadius: "2px", background: color }} />
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-[1600px] mx-auto px-6 lg:px-10 pb-16">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.2em", color: "rgba(139,164,255,0.6)", textTransform: "uppercase", marginBottom: "12px" }}>
          Ihr Ergebnis
        </div>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 300, fontSize: "clamp(24px, 4vw, 40px)", color: "white", letterSpacing: "-0.025em" }}>
          Souveränitätsprofil Ihrer Organisation
        </h2>
      </div>

      {/* ── Criticality Warning ── */}
      {scores.lowCriticality && (
        <div style={{ padding: "16px 20px", borderRadius: "10px", background: "rgba(255,159,46,0.08)", border: "1px solid rgba(255,159,46,0.25)", marginBottom: "32px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AlertTriangle size={18} style={{ color: "#FF9F2E", marginTop: "1px", flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 600, color: "#FF9F2E", marginBottom: "4px" }}>Hinweis zur Kritikalität</p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
              Ihr Kritikalitätswert liegt unter dem Schwellwert (&lt; 2.5). Dies deutet darauf hin, dass die betrachteten digitalen Funktionen möglicherweise nicht wertschöpfungskritisch sind. Die Capacity-Scores sind daher mit Vorsicht zu interpretieren.
            </p>
          </div>
        </div>
      )}

      {/* ── Overconfidence Warning (perceived vs. enabled) ── */}
      {scores.overconfident && (
        <div style={{ padding: "16px 20px", borderRadius: "10px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", marginBottom: "32px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AlertTriangle size={18} style={{ color: "#A855F7", marginTop: "1px", flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 600, color: "#A855F7", marginBottom: "4px" }}>Selbsteinschätzung vs. Voraussetzungen</p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
              Ihre Capacity-Selbsteinschätzung liegt deutlich über Ihrer Enabler-Basis (technische Entkopplung, Datenkontrolle, Kompetenz, Ressourcen). Das kann auf eine Überschätzung der tatsächlichen Handlungsfähigkeit hindeuten. Prüfen Sie, ob die Capacities ohne diese Voraussetzungen real tragfähig wären.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: Radar + Level + Capacity Scores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16" style={{ alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "32px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(22px) saturate(160%)", WebkitBackdropFilter: "blur(22px) saturate(160%)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: `0 0 60px ${accent}15` }}>
          <CapacityRadar values={scores.radarValues} color={accent} size={660} />
        </div>

        <div>
          {/* Level match — or hint when no capacity is answered */}
          {level ? (
            <div style={{ padding: "20px 24px", borderRadius: "12px", background: level.colorBg, border: `1px solid ${level.colorBorder}`, marginBottom: "24px" }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", color: level.color, textTransform: "uppercase" }}>
                {level.tag} — {level.title}
              </span>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.6, marginTop: "8px" }}>{level.description}</p>
            </div>
          ) : (
            <div style={{ padding: "20px 24px", borderRadius: "12px", background: "rgba(255,159,46,0.08)", border: "1px solid rgba(255,159,46,0.25)", marginBottom: "24px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: "#FF9F2E", marginTop: "1px", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 600, color: "#FF9F2E", marginBottom: "4px" }}>Noch keine Einordnung möglich</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
                  Es wurde noch keine Capacity bewertet. Bitte beantworten Sie mindestens eine Frage je Capacity, um eine Souveränitäts-Einordnung zu erhalten.
                </p>
              </div>
            </div>
          )}

          {/* Capacity scores — unanswered stays explicit, no fabricated value */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            {CAPACITIES.map((c, i) => (
              <div key={c.key}>{scoreBar(c.title, scores.capacityScores[CAP_DIMS[i]], c.color, c.tag)}</div>
            ))}
          </div>

          {/* Max-Logic + Average */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {level && scores.maxCapacityScore != null && (
              <div style={{ padding: "14px 20px", borderRadius: "10px", background: level.colorBg, border: `1px solid ${level.colorBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={14} style={{ color: level.color }} />
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                    Max-Logik — stärkste Capacity bestimmt
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "24px", fontWeight: 600, color: level.color }}>{Math.round(scores.maxCapacityScore * 100)}%</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginLeft: "8px" }}>({strongestCaps.map((c) => c.tag).join(" · ")})</span>
                </div>
              </div>
            )}
            <div style={{ padding: "14px 20px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Ø der beantworteten Capacities</span>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "18px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{scores.overall != null ? `${Math.round(scores.overall * 100)}%` : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Strongest capacity callout (max-logic) — ties; hidden when nothing answered ── */}
      {strongestCap && (
      <div style={{ padding: "20px 24px", borderRadius: "12px", background: `${strongestCap.color}0a`, border: `1px solid ${strongestCap.color}22`, marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <TrendingUp size={16} style={{ color: strongestCap.color }} />
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 600, color: strongestCap.color }}>
            {multiStrongest
              ? `Ihre stärksten Capacities (gleichauf): ${strongestCaps.map((c) => `${c.title} (${c.tag})`).join(" · ")}`
              : `Ihre stärkste Capacity: ${strongestCap.title} (${strongestCap.tag})`}
          </span>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "14px" }}>
          {multiStrongest
            ? "Diese Capacities sind gleichauf am stärksten ausgeprägt und bestimmen gemeinsam Ihren souveränen Handlungsraum. So bauen Sie den Vorsprung weiter aus:"
            : "Diese Capacity ist aktuell am stärksten ausgeprägt und bestimmt damit Ihren souveränen Handlungsraum. So bauen Sie diesen Vorsprung weiter aus:"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {strongestCaps.map((cap) => (
            <div key={cap.key}>
              {multiStrongest && (
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", fontWeight: 600, color: cap.color, marginBottom: "8px" }}>
                  {cap.title} ({cap.tag})
                </div>
              )}
              <ul style={{ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" }}>
                {cap.actions.map((action, j) => (
                  <li key={j} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
                    <span style={{ flexShrink: 0, marginTop: "7px", width: "5px", height: "5px", borderRadius: "50%", background: cap.color }} />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ── Section 2b: Context factors & enablers ── */}
      <div style={{ marginBottom: "48px" }}>
        {sectionHeader("Kontext & Voraussetzungen", "Externe Kontextfaktoren (Ebene A) und organisationale Enabler (Ebene B), die Ihre Capacities formen")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div style={{ padding: "20px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8ba4ff", marginBottom: "16px" }}>
              Externe Kontextfaktoren
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(contextFactorLabels).map(([id, label]) =>
                miniBar(label, scores.contextFactors[id], "#8ba4ff")
              )}
            </div>
          </div>
          <div style={{ padding: "20px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A855F7", marginBottom: "16px" }}>
              Organisationale Enabler
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(enablerLabels).map(([id, label]) =>
                miniBar(label, scores.enablers[id], "#A855F7")
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Dual-Pathway Outcomes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Channel 1: Economic */}
        <div style={{ padding: "24px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", color: "#4B6EFF", textTransform: "uppercase" }}>Kanal 1</span>
          </div>
          <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "15px", color: "white", marginBottom: "4px" }}>Ökonomische Outcomes</h4>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "20px" }}>Marktposition gegenüber dem Anbieter — Verhandlungsmacht & Hold-up</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {scoreBar("TCO-Position", scores.outcomeScores["TCO"], "#4B6EFF", "Kostenposition vs. Markt", 0.4)}
            {scoreBar("Hold-up-Exposition", scores.outcomeScores["HU"], "#00C4A0", "Schutz vor erzwungenen Kosten", 0.5)}
          </div>
        </div>

        {/* Channel 2: Strategic */}
        <div style={{ padding: "24px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", color: "#00C4A0", textTransform: "uppercase" }}>Kanal 2</span>
          </div>
          <h4 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 500, fontSize: "15px", color: "white", marginBottom: "4px" }}>Strategische Outcomes</h4>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "20px" }}>Handlungsfähigkeit im Markt — Flexibilität & Innovation</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {scoreBar("Strategische Flexibilität", scores.outcomeScores["FLX"], "#FF9F2E", "Reaktionsfähigkeit auf Marktveränderungen", 0.6)}
            {scoreBar("Digitale Innovationsfähigkeit", scores.outcomeScores["INN"], "#00C4A0", "Technologie-Integrationstempo", 0.7)}
          </div>
        </div>
      </div>

      {/* ── Section 4: Firmenprofil ── */}
      {Object.keys(scores.controlAnswers).length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          {sectionHeader("Firmenprofil", "Ihre Kontrollvariablen — Kontext für die Einordnung")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(controlLabels).map(([id, meta]) => {
              const val = scores.controlAnswers[id];
              if (!val) return null;
              const displayVal = meta.options[val] || val;
              return (
                <div key={id} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{meta.label}:</span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{displayVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Consulting-CTA ── */}
      <ConsultingCTA
        strongestLabels={strongestLabels}
        payload={{ capacities: capacityPercents, overall: scores.overall != null ? Math.round(scores.overall * 100) : null }}
      />

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onDownloadPDF} style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(0,196,160,0.3)", background: "rgba(0,196,160,0.08)", color: "#00C4A0", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Download size={14} /> PDF herunterladen
        </button>
        <button onClick={onDownloadJSON} style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(139,164,255,0.3)", background: "rgba(139,164,255,0.08)", color: "rgba(139,164,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <FileJson size={14} /> JSON exportieren
        </button>
        <button onClick={onRestart} style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <RotateCcw size={14} /> Erneut durchführen
        </button>
        <Link to="/#organisationen" style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(75,110,255,0.3)", background: "rgba(75,110,255,0.1)", color: "#8ba4ff", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
          Die Capacities im Detail <ArrowRight size={14} />
        </Link>
        <Link to="/" style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
          <Home size={14} /> Zur Startseite
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Download Helpers ──────────────────────────────────────────────────────────

function downloadJSON(answers: Answers) {
  const scores = calculateScores(answers);
  const level = scores.maxCapacityScore != null ? getSovereigntyLevel(scores.maxCapacityScore).level : null;
  const data = {
    timestamp: new Date().toISOString(),
    version: "org-capacities-v2",
    level: level ? { stage: level.tag, title: level.title } : null,
    scores: {
      determining: scores.maxCapacityScore != null ? Math.round(scores.maxCapacityScore * 100) : null,
      strongestCapacities: scores.strongestIdxs.map((i) => CAPACITIES[i].tag),
      average: scores.overall != null ? Math.round(scores.overall * 100) : null,
      capacities: Object.fromEntries(
        CAP_DIMS.map((d, i) => [CAPACITIES[i].tag, scores.capacityScores[d] == null ? null : Math.round((scores.capacityScores[d] as number) * 100)])
      ),
      outcomes: Object.fromEntries(Object.entries(scores.outcomeScores).map(([k, v]) => [k, v == null ? null : Math.round(v * 100)])),
    },
    criticality: scores.critRaw,
    contextFactors: scores.contextFactors,
    enablers: scores.enablers,
    controlVariables: scores.controlAnswers,
    rawAnswers: answers,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `souveraenitaet-assessment-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(answers: Answers) {
  const scores = calculateScores(answers);
  const level = scores.maxCapacityScore != null ? getSovereigntyLevel(scores.maxCapacityScore).level : null;
  const doc = new jsPDF();
  let y = 20;

  const addLine = (text: string, size = 10, bold = false) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(text, 20, y);
    y += size * 0.5 + 2;
  };

  const addGap = (px = 6) => { y += px; };

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Organisation Self-Assessment — Ergebnis", 20, y); y += 12;
  addLine(`Datum: ${new Date().toLocaleDateString("de-DE")}`, 9);
  addGap(8);

  // Level
  if (level && scores.maxCapacityScore != null) {
    addLine(`Souveränitäts-Stufe: ${level.tag} — ${level.title}`, 12, true);
    addLine(`Max-Logik (stärkste Capacity bestimmt): ${Math.round(scores.maxCapacityScore * 100)}% (${scores.strongestIdxs.map((i) => CAPACITIES[i].tag).join(", ")})`, 11);
    addLine(`Ø der beantworteten Capacities: ${scores.overall != null ? Math.round(scores.overall * 100) : "—"}%`, 11);
  } else {
    addLine("Souveränitäts-Stufe: noch keine Capacity bewertet", 12, true);
  }
  addGap(8);

  // Capacity scores
  addLine("Capacities", 12, true);
  addGap(2);
  CAP_DIMS.forEach((d, i) => {
    const v = scores.capacityScores[d];
    addLine(`  ${CAPACITIES[i].tag} (${CAPACITIES[i].title}): ${v == null ? "nicht beantwortet" : `${Math.round(v * 100)}%`}`, 10);
  });
  addGap(8);

  // Context factors & enablers (raw 1..5)
  addLine("Externe Kontextfaktoren (1-5)", 12, true);
  addGap(2);
  for (const [id, label] of Object.entries(contextFactorLabels)) {
    const v = scores.contextFactors[id];
    addLine(`  ${label}: ${v == null ? "—" : `${v}/5`}`, 10);
  }
  addGap(6);
  addLine("Organisationale Enabler (1-5)", 12, true);
  addGap(2);
  for (const [id, label] of Object.entries(enablerLabels)) {
    const v = scores.enablers[id];
    addLine(`  ${label}: ${v == null ? "—" : `${v}/5`}`, 10);
  }
  addGap(8);

  // Outcomes
  const opct = (k: string) => {
    const v = scores.outcomeScores[k];
    return v == null ? "nicht beantwortet" : `${Math.round(v * 100)}%`;
  };
  addLine("Outcomes", 12, true);
  addGap(2);
  addLine(`  TCO-Position: ${opct("TCO")}`, 10);
  addLine(`  Hold-up-Exposition (Schutz): ${opct("HU")}`, 10);
  addLine(`  Strategische Flexibilität: ${opct("FLX")}`, 10);
  addLine(`  Digitale Innovationsfähigkeit: ${opct("INN")}`, 10);
  addGap(8);

  // Control variables
  if (Object.keys(scores.controlAnswers).length > 0) {
    addLine("Firmenprofil", 12, true);
    addGap(2);
    for (const [id, val] of Object.entries(scores.controlAnswers)) {
      addLine(`  ${id}: ${val}`, 9);
    }
  }

  doc.save(`souveraenitaet-assessment-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── LocalStorage Keys ─────────────────────────────────────────────────────────

const LS_ANSWERS = "cds-assessment-answers";
const LS_PHASE = "cds-assessment-phase";
const LS_BLOCK = "cds-assessment-block";

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// ─── Main Assessment Page ──────────────────────────────────────────────────────

const Assessment = () => {
  const [phase, setPhase] = useState<"intro" | "blocks" | "result">(() => loadFromLS(LS_PHASE, "intro"));
  const [blockIndex, setBlockIndex] = useState(() => loadFromLS(LS_BLOCK, 0));
  const [answers, setAnswers] = useState<Answers>(() => loadFromLS(LS_ANSWERS, {}));

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(LS_ANSWERS, JSON.stringify(answers)); }, [answers]);
  useEffect(() => { localStorage.setItem(LS_PHASE, JSON.stringify(phase)); }, [phase]);
  useEffect(() => { localStorage.setItem(LS_BLOCK, JSON.stringify(blockIndex)); }, [blockIndex]);

  const handleAnswer = (id: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (blockIndex < surveyBlocks.length - 1) {
      setBlockIndex(blockIndex + 1);
    } else {
      setPhase("result");
    }
  };

  const handleBack = () => {
    if (blockIndex > 0) {
      setBlockIndex(blockIndex - 1);
    } else {
      setPhase("intro");
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setBlockIndex(0);
    setPhase("intro");
    localStorage.removeItem(LS_ANSWERS);
    localStorage.removeItem(LS_PHASE);
    localStorage.removeItem(LS_BLOCK);
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingTop: "96px" }}>
      <AnimatePresence mode="wait">
        {phase === "intro" && <IntroScreen key="intro" onStart={() => setPhase("blocks")} />}
        {phase === "blocks" && (
          <BlockScreen
            key={`block-${blockIndex}`}
            block={surveyBlocks[blockIndex]}
            blockIndex={blockIndex}
            answers={answers}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {phase === "result" && (
          <ResultScreen
            key="result"
            answers={answers}
            onRestart={handleRestart}
            onDownloadJSON={() => downloadJSON(answers)}
            onDownloadPDF={() => downloadPDF(answers)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Assessment;
