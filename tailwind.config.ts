import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#04170F",
          900: "#062017",
          850: "#08281C",
          800: "#0A3324",
          700: "#0E4430",
          600: "#13573D",
          500: "#1A6B4A",
        },
        leaf: {
          600: "#3E9B2E",
          500: "#57B23B",
          400: "#79CE4C",
          300: "#9BDF6C",
          200: "#C4EDA8",
        },
        mineral: {
          950: "#0E1211",
          900: "#151A18",
          850: "#1B211F",
          800: "#222927",
          700: "#2E3734",
          600: "#3D4743",
          500: "#5A665F",
          400: "#7C887F",
          300: "#A7B0A8",
          200: "#CBD2CB",
          100: "#E4E9E3",
          50: "#F2F5F1",
        },
        tech: {
          waste: "#C89B3C",
          terrain: "#6F8065",
          geomembrane: "#3B7C9E",
          drainage: "#D8A33A",
          leachate: "#8A5A2B",
          biogas: "#D4683C",
          groundwater: "#2E9FBE",
          clay: "#8C6A4B",
          soil: "#5E6B4F",
          danger: "#C0553F",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.95rem", letterSpacing: "0.02em" }],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -18px rgba(0,0,0,0.65)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(220%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        sweep: "sweep 2.2s cubic-bezier(0.4,0,0.2,1) infinite",
        fadeUp: "fadeUp 0.5s ease-out both",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
