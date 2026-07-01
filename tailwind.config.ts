import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fcf1e5",
        card: "#fffcf5",
        card2: "#f5e8d5",
        ink: "#61453a",
        brown: "#9f715d",
        line: "#c5a080",
        muted: "#9a8574",
        blue: "#38c9ff",
        "dark-blue": "#007bda",
        "ice-blue": "#00a2ff",
        "light-blue": "#c3efff",
        green: "#37b576",
        "light-green": "#c8e6d8",
        yellow: "#ffebad",
        gold: "#ef9300",
        coral: "#ff7d70",
        pink: "#fc90d2",

        open: "#37b576",
        away: "#9a8574",
        busy: "#ff7d70",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
        bells: ["'Hells Bells'", "var(--font-outfit)", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 0 rgba(97,69,58,0.15)",
        chunky: "0 4px 0 rgba(97,69,58,0.2)",
        sheet: "0 -8px 40px rgba(97,69,58,0.25)",
      },
      borderRadius: {
        DEFAULT: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
