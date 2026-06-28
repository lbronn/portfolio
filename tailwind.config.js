/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Sora = display/headings, Inter = body (default sans)
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        primary: {
          // indigo — brand / primary actions
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8", // dark-mode accent
          500: "#6366F1", // dark-mode buttons
          600: "#4F46E5", // light-mode default
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        secondary: {
          // amber — secondary actions / highlights
          400: "#FBBF24", // dark-mode
          500: "#F59E0B", // light-mode default
          600: "#D97706",
          700: "#92400E", // amber text on light bg
        },
        ink: {
          // slate — all structure
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#060B18",
        },
      },
      boxShadow: {
        // floating Liquid Glass shadows
        glass:
          "0 1px 1px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.10), 0 18px 48px rgba(15,23,42,.08)",
        "glass-lifted":
          "0 2px 4px rgba(15,23,42,.06), 0 16px 40px rgba(15,23,42,.16), 0 32px 72px rgba(15,23,42,.12)",
        "glow-brand": "0 12px 40px rgba(99,102,241,.35)",
        "glow-amber": "0 12px 40px rgba(245,158,11,.32)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
        "float-slow": "floatSlow 6s cubic-bezier(0.65,0,0.35,1) infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floatSlow: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        blink: { "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
