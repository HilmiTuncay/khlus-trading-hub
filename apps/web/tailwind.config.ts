import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Discord-inspired dark theme
        brand: {
          DEFAULT: "#F59E0B", // Trading gold
          light: "#FCD34D",
          dark: "#D97706",
        },
        surface: {
          primary: "#111214",
          secondary: "#1a1b1e",
          tertiary: "#232428",
          elevated: "#2b2d31",
          overlay: "#313338",
        },
        text: {
          primary: "#f2f3f5",
          secondary: "#b5bac1",
          muted: "#6d6f78",
        },
        accent: {
          green: "#23a559",
          red: "#f23f43",
          blue: "#5865f2",
          yellow: "#f0b232",
        },
      },
    },
  },
  plugins: [],
};

export default config;
