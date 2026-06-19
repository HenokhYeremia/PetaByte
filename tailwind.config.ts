import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        health: {
          excellent: "#22c55e",
          good: "#86efac",
          fair: "#eab308",
          poor: "#f97316",
          critical: "#ef4444",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
