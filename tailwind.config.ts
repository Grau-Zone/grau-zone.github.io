import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  // hover:-Klassen nur auf Geraeten mit echtem Hover (kein Haengenbleiben nach Tap)
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // fx-Klassen (index.css, @layer components) immer ausliefern, auch wenn sie nur
  // dynamisch zusammengesetzt werden.
  safelist: [{ pattern: /^fx-/ }],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Switzer", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        display: ["Switzer", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        body: ["Switzer", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        grotesk: ["Switzer", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        mono: ["'Share Tech Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        hero: {
          bg: "hsl(var(--hero-bg))",
        },
        green: { DEFAULT: "#00802f", ink: "#006a27", soft: "rgba(0,128,47,0.08)" },
        ink: "#0c1310",
        deep: { DEFAULT: "#06301d", on: "#e9f3ed", mute: "#a9c7b5" },
        mint: "#6fd69a",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        "fx-out": "var(--ease-out)",
        "fx-in-out": "var(--ease-in-out)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
