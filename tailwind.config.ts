import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        app: {
          bg: "var(--bg)",
          fg: "var(--fg)",
          card: "var(--card)",
          border: "var(--border)",
          muted: "var(--muted)",
          accent: "var(--accent)",
          "accent-fg": "var(--accent-fg)",
          "accent-soft": "var(--accent-soft)",
          "accent-soft-fg": "var(--accent-soft-fg)",
          danger: "var(--danger)",
          "danger-soft": "var(--danger-soft)",
          success: "var(--success)",
          "success-soft": "var(--success-soft)",
          warn: "var(--warn)",
          "warn-soft": "var(--warn-soft)",
        },
        warm: {
          50: "#fffbf2",
          100: "#fff3d6",
          200: "#fde3a7",
          300: "#fbcb6b",
          400: "#f6ae2d",
          500: "#e8920f",
          600: "#c87108",
          700: "#9f540b",
          800: "#7f4210",
          900: "#69370f",
        },
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.55)" },
          "70%": { boxShadow: "0 0 0 14px rgba(239,68,68,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;